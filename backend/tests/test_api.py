"""Contrato HTTP: autenticação, escopo por usuário e validação."""
import pytest

LANCAMENTO = {
    "description": "feira", "amount": "150.50", "type": "gasto",
    "category": "Mercado", "method": "avista", "date": "2026-09-05", "installments": 1,
}


class TestAutenticacao:
    def test_endpoint_protegido_sem_token_responde_401(self, client):
        assert client.get("/summary/2026-09").status_code == 401

    def test_token_invalido_responde_401(self, client):
        assert client.get("/entries", headers={"Authorization": "Bearer nao-e-um-token"}).status_code == 401

    def test_cadastro_duplicado_nao_confirma_o_email(self, client):
        client.post("/auth/register", json={"email": "a@b.co", "password": "senha12345"})
        r = client.post("/auth/register", json={"email": "a@b.co", "password": "senha12345"})
        assert r.status_code == 409
        assert "a@b.co" not in r.json()["detail"]

    def test_senha_errada_nao_diz_qual_campo_errou(self, client, auth):
        auth()
        r = client.post("/auth/token", data={"username": "a@b.co", "password": "errada"})
        assert r.status_code == 401
        assert r.json()["detail"] == "E-mail ou senha não conferem."

    def test_bloqueia_apos_cinco_tentativas(self, client, auth):
        auth()
        codigos = [
            client.post("/auth/token", data={"username": "a@b.co", "password": "x"}).status_code
            for _ in range(6)
        ]
        assert codigos == [401] * 5 + [429]

    def test_bloqueio_vale_mesmo_com_a_senha_certa(self, client, auth):
        auth()
        for _ in range(5):
            client.post("/auth/token", data={"username": "a@b.co", "password": "x"})
        r = client.post("/auth/token", data={"username": "a@b.co", "password": "senha12345"})
        assert r.status_code == 429
        assert "Retry-After" in r.headers


class TestEscopoPorUsuario:
    """O invariante mais importante: nenhum endpoint confia em id vindo do cliente."""

    def test_um_usuario_nao_ve_lancamento_do_outro(self, client, auth):
        ana = auth(email="ana@b.co")
        bia = auth(email="bia@b.co")
        client.post("/entries", headers=ana, json=LANCAMENTO)

        assert len(client.get("/entries", headers=ana).json()) == 1
        assert client.get("/entries", headers=bia).json() == []

    def test_um_usuario_nao_apaga_lancamento_do_outro(self, client, auth):
        ana = auth(email="ana@b.co")
        bia = auth(email="bia@b.co")
        entry_id = client.post("/entries", headers=ana, json=LANCAMENTO).json()["id"]

        assert client.delete(f"/entries/{entry_id}", headers=bia).status_code == 404
        assert len(client.get("/entries", headers=ana).json()) == 1

    def test_o_resumo_de_um_nao_soma_o_gasto_do_outro(self, client, auth):
        ana = auth(email="ana@b.co", monthly_income="1000.00", closing_day=10)
        bia = auth(email="bia@b.co", monthly_income="1000.00", closing_day=10)
        client.post("/entries", headers=ana, json=LANCAMENTO)

        assert client.get("/summary/2026-09", headers=bia).json()["total_spent"] == "0"


class TestValidacao:
    def test_entrada_no_credito_e_recusada(self, client, auth):
        h = auth()
        r = client.post("/entries", headers=h, json={**LANCAMENTO, "type": "entrada", "method": "credito"})
        assert r.status_code == 422

    @pytest.mark.parametrize("campo,valor", [
        ("amount", "0"), ("amount", "-10.00"),
        ("description", ""), ("installments", 0), ("installments", 49),
    ])
    def test_campos_fora_da_faixa_sao_recusados(self, client, auth, campo, valor):
        h = auth()
        assert client.post("/entries", headers=h, json={**LANCAMENTO, campo: valor}).status_code == 422

    @pytest.mark.parametrize("dia", [0, 29, 31])
    def test_dia_de_fechamento_fora_de_1_a_28(self, client, auth, dia):
        h = auth()
        r = client.put("/auth/me", headers=h, json={"monthly_income": "100.00", "closing_day": dia})
        assert r.status_code == 422


class TestDinheiroComoString:
    def test_valores_trafegam_como_string_e_nao_como_float(self, client, auth):
        h = auth(monthly_income="5000.00", closing_day=10)
        client.post("/entries", headers=h, json=LANCAMENTO)
        s = client.get("/summary/2026-09", headers=h).json()
        assert all(isinstance(s[k], str) for k in
                   ("monthly_income", "total_spent", "available_balance"))
        assert s["total_spent"] == "150.50"
