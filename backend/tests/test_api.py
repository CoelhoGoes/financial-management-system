"""Contrato HTTP: autenticação, escopo por usuário e validação."""
import os
from datetime import UTC, datetime, timedelta

import pytest

from tests.test_ofx import account_statement, card_statement, transaction

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


def _excluir(client, headers, password="senha12345"):
    # o TestClient não aceita json= no .delete(); DELETE com corpo vai pelo .request()
    return client.request("DELETE", "/auth/me", headers=headers, json={"password": password})


class TestExclusaoDeConta:
    def test_com_a_senha_certa_a_conta_some_para_a_api(self, client, auth):
        h = auth()
        assert _excluir(client, h).status_code == 204
        assert client.get("/auth/me", headers=h).status_code == 401
        assert client.get("/entries", headers=h).status_code == 401

    def test_senha_errada_responde_403_e_nao_exclui(self, client, auth):
        h = auth()
        r = _excluir(client, h, password="errada")
        # 403, não 401: o 401 faria o frontend derrubar a sessão
        assert r.status_code == 403
        assert client.get("/auth/me", headers=h).status_code == 200

    def test_sem_senha_e_recusado(self, client, auth):
        h = auth()
        assert client.request("DELETE", "/auth/me", headers=h).status_code == 422

    def test_login_em_conta_excluida_parece_senha_errada(self, client, auth):
        _excluir(client, auth())
        r = client.post("/auth/token", data={"username": "a@b.co", "password": "senha12345"})
        assert r.status_code == 401
        assert r.json()["detail"] == "E-mail ou senha não conferem."

    def test_exclusao_e_logica_usuario_e_lancamentos_ficam_no_banco(self, client, auth):
        from sqlalchemy import func, select

        from app.infra.database import engine
        from app.infra.models import Entry, User

        h = auth()
        client.post("/entries", headers=h, json=LANCAMENTO)
        _excluir(client, h)
        with engine.connect() as conn:
            assert conn.scalar(select(User.deleted_at)) is not None
            assert conn.scalar(select(func.count()).select_from(Entry)) == 1

    def test_o_email_fica_livre_para_um_cadastro_novo_e_vazio(self, client, auth):
        h = auth()
        client.post("/entries", headers=h, json=LANCAMENTO)
        _excluir(client, h)

        novo = auth()
        assert client.get("/auth/me", headers=novo).status_code == 200
        assert client.get("/entries", headers=novo).json() == []

    def test_dois_cadastros_ativos_com_o_mesmo_email_continuam_proibidos(self, client, auth):
        _excluir(client, auth())
        auth()
        r = client.post("/auth/register", json={"email": "a@b.co", "password": "senha12345"})
        assert r.status_code == 409

    def test_senha_errada_conta_no_mesmo_limitador_do_login(self, client, auth):
        h = auth()
        for _ in range(5):
            _excluir(client, h, password="errada")
        assert _excluir(client, h).status_code == 429
        r = client.post("/auth/token", data={"username": "a@b.co", "password": "senha12345"})
        assert r.status_code == 429


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
        ana = auth(email="ana@b.co", closing_day=10)
        bia = auth(email="bia@b.co", closing_day=10)
        client.post("/entries", headers=ana, json=LANCAMENTO)

        assert client.get("/summary/2026-09", headers=bia).json()["total_spent"] == "0"


class TestValidacao:
    def test_entrada_no_credito_e_recusada(self, client, auth):
        h = auth()
        r = client.post("/entries", headers=h, json={**LANCAMENTO, "type": "entrada", "method": "credito"})
        assert r.status_code == 422

    @pytest.mark.parametrize("campo,valor", [
        ("amount", "0"), ("amount", "-10.00"), ("amount", "10000000000.00"),
        ("description", ""), ("installments", 0), ("installments", 49),
    ])
    def test_campos_fora_da_faixa_sao_recusados(self, client, auth, campo, valor):
        h = auth()
        assert client.post("/entries", headers=h, json={**LANCAMENTO, campo: valor}).status_code == 422

    @pytest.mark.parametrize("dia", [0, 29, 31])
    def test_dia_de_fechamento_fora_de_1_a_28(self, client, auth, dia):
        h = auth()
        r = client.put("/auth/me", headers=h, json={"closing_day": dia})
        assert r.status_code == 422


class TestDinheiroComoString:
    def test_valores_trafegam_como_string_e_nao_como_float(self, client, auth):
        h = auth(closing_day=10)
        client.post("/entries", headers=h, json=LANCAMENTO)
        s = client.get("/summary/2026-09", headers=h).json()
        assert all(isinstance(s[k], str) for k in
                   ("monthly_income", "total_spent", "available_balance"))
        assert s["total_spent"] == "150.50"


def _gasto(**kw):
    return {**LANCAMENTO, **kw}


class TestTrend:
    """A rota que alimenta o gráfico. A matemática está em test_service.py;
    aqui é o contrato: ordem, recorte e limites."""

    def test_vem_do_mais_antigo_para_o_mais_novo(self, client, auth):
        h = auth()
        meses = [s["month"] for s in client.get("/trend?months=4&until=2026-09", headers=h).json()]
        assert meses == ["2026-06", "2026-07", "2026-08", "2026-09"]

    def test_atravessa_a_virada_de_ano(self, client, auth):
        h = auth()
        meses = [s["month"] for s in client.get("/trend?months=3&until=2027-01", headers=h).json()]
        assert meses == ["2026-11", "2026-12", "2027-01"]

    def test_mes_sem_lancamento_aparece_zerado_em_vez_de_sumir(self, client, auth):
        """O gráfico depende disso: um mês vazio precisa de barra zero, não de buraco."""
        h = auth(closing_day=10)
        client.post("/entries", headers=h, json=_gasto(date="2026-09-05", amount="100.00"))
        serie = client.get("/trend?months=3&until=2026-09", headers=h).json()
        assert [s["month"] for s in serie] == ["2026-07", "2026-08", "2026-09"]
        assert [s["total_spent"] for s in serie] == ["0", "0", "100.00"]

    def test_sem_until_termina_no_mes_corrente(self, client, auth):
        from datetime import UTC, datetime

        h = auth()
        serie = client.get("/trend?months=1", headers=h).json()
        assert serie[0]["month"] == f"{datetime.now(UTC):%Y-%m}"

    @pytest.mark.parametrize("qs", [
        "months=0", "months=25", "until=2026-13", "until=setembro", "until=1899-12", "until=2200-01",
    ])
    def test_parametros_fora_do_contrato_sao_recusados(self, client, auth, qs):
        assert client.get(f"/trend?{qs}", headers=auth()).status_code == 422

    def test_cada_item_e_um_summary_completo(self, client, auth):
        h = auth()
        campos = set(client.get("/trend?months=1&until=2026-09", headers=h).json()[0])
        assert campos == {
            "month", "monthly_income", "extra_income", "cash_expenses",
            "invoice", "total_spent", "month_balance", "available_balance",
        }

    def test_nao_mistura_lancamento_de_outro_usuario(self, client, auth):
        ana = auth(email="ana@b.co", closing_day=10)
        bia = auth(email="bia@b.co", closing_day=10)
        client.post("/entries", headers=ana, json=_gasto(date="2026-09-05", amount="300.00"))
        serie = client.get("/trend?months=1&until=2026-09", headers=bia).json()
        assert serie[0]["total_spent"] == "0"


class TestRenda:
    """Histórico da renda: cada renda vale do seu mês até a próxima registrada."""

    def test_registrar_lista_em_ordem_de_mes(self, client, auth):
        h = auth()
        assert client.put("/incomes/2026-09", headers=h, json={"amount": "5000.00"}).json() == {
            "month": "2026-09", "amount": "5000.00",
        }
        client.put("/incomes/2026-03", headers=h, json={"amount": "4000.00"})
        assert [i["month"] for i in client.get("/incomes", headers=h).json()] == [
            "2026-03", "2026-09",
        ]

    def test_o_mesmo_mes_duas_vezes_substitui(self, client, auth):
        """F6: vale a última, não ficam duas."""
        h = auth()
        client.put("/incomes/2026-09", headers=h, json={"amount": "5000.00"})
        client.put("/incomes/2026-09", headers=h, json={"amount": "6000.00"})
        assert client.get("/incomes", headers=h).json() == [{"month": "2026-09", "amount": "6000.00"}]

    def test_renda_muda_o_resumo_a_partir_do_mes(self, client, auth):
        """UC5: os meses anteriores ficam com a renda anterior."""
        h = auth()
        client.put("/incomes/2026-08", headers=h, json={"amount": "1000.00"})
        client.put("/incomes/2026-10", headers=h, json={"amount": "2000.00"})
        serie = client.get("/trend?months=4&until=2026-10", headers=h).json()
        assert [s["monthly_income"] for s in serie] == ["0", "1000.00", "1000.00", "2000.00"]
        assert [s["available_balance"] for s in serie] == ["0", "1000.00", "2000.00", "4000.00"]

    def test_apagar_volta_a_renda_anterior(self, client, auth):
        """UC5b."""
        h = auth()
        client.put("/incomes/2026-08", headers=h, json={"amount": "1000.00"})
        client.put("/incomes/2026-10", headers=h, json={"amount": "2000.00"})
        assert client.delete("/incomes/2026-10", headers=h).status_code == 204
        assert client.get("/summary/2026-10", headers=h).json()["monthly_income"] == "1000.00"

    def test_apagar_mes_sem_renda_e_404(self, client, auth):
        assert client.delete("/incomes/2026-10", headers=auth()).status_code == 404

    # 0000 e 0001: fora de 1900–2199, o acumulado andaria séculos (revisão de segurança)
    @pytest.mark.parametrize("mes", ["2026-13", "2026-9", "setembro", "0000-01", "0001-01", "2200-01"])
    def test_mes_invalido_e_recusado(self, client, auth, mes):
        """F5."""
        h = auth()
        assert client.put(f"/incomes/{mes}", headers=h, json={"amount": "10.00"}).status_code == 422
        assert client.get("/incomes", headers=h).json() == []

    def test_renda_negativa_e_recusada(self, client, auth):
        """F8."""
        r = client.put("/incomes/2026-09", headers=auth(), json={"amount": "-1.00"})
        assert r.status_code == 422

    def test_renda_acima_da_coluna_e_recusada_e_nao_500(self, client, auth):
        r = client.put("/incomes/2026-09", headers=auth(), json={"amount": "10000000000.00"})
        assert r.status_code == 422

    def test_renda_no_limite_da_coluna_e_aceita(self, client, auth):
        r = client.put("/incomes/2026-09", headers=auth(), json={"amount": "9999999999.99"})
        assert r.status_code == 200

    def test_renda_zero_e_aceita(self, client, auth):
        """F7."""
        assert client.put("/incomes/2026-09", headers=auth(), json={"amount": "0"}).status_code == 200

    def test_uma_conta_nao_ve_nem_apaga_a_renda_da_outra(self, client, auth):
        ana = auth(email="ana@b.co")
        bia = auth(email="bia@b.co")
        client.put("/incomes/2026-09", headers=ana, json={"amount": "5000.00"})
        assert client.get("/incomes", headers=bia).json() == []
        assert client.delete("/incomes/2026-09", headers=bia).status_code == 404
        assert client.get("/summary/2026-09", headers=bia).json()["available_balance"] == "0"
        assert len(client.get("/incomes", headers=ana).json()) == 1

    def test_sem_sessao_e_401(self, client):
        assert client.get("/incomes").status_code == 401
        assert client.put("/incomes/2026-09", json={"amount": "1.00"}).status_code == 401

    def test_auth_me_nao_tem_mais_renda(self, client, auth):
        h = auth()
        r = client.put("/auth/me", headers=h, json={"closing_day": 5})
        assert r.status_code == 200
        assert "monthly_income" not in r.json()

    @pytest.mark.parametrize("mes", ["2026-13", "setembro", "1899-12", "9999-12"])
    def test_resumo_com_mes_invalido_e_recusado(self, client, auth, mes):
        assert client.get(f"/summary/{mes}", headers=auth()).status_code == 422


class TestInvoices:
    """A regra de fechamento é a mais sutil do domínio — ver docs/dominio.md."""

    def test_compra_antes_do_fechamento_cai_na_fatura_do_mes_seguinte(self, client, auth):
        h = auth(closing_day=10)
        client.post(
            "/entries", headers=h,
            json=_gasto(date="2026-09-05", amount="300.00", method="credito", installments=1),
        )
        assert client.get("/invoices/2026-10", headers=h).json()["total"] == "300.00"
        assert client.get("/invoices/2026-11", headers=h).json()["total"] == "0"

    def test_compra_no_dia_do_fechamento_pula_uma_fatura(self, client, auth):
        h = auth(closing_day=10)
        client.post(
            "/entries", headers=h,
            json=_gasto(date="2026-09-10", amount="300.00", method="credito", installments=1),
        )
        assert client.get("/invoices/2026-10", headers=h).json()["total"] == "0"
        assert client.get("/invoices/2026-11", headers=h).json()["total"] == "300.00"

    def test_parcelas_se_espalham_por_meses_consecutivos(self, client, auth):
        h = auth(closing_day=10)
        client.post(
            "/entries", headers=h,
            json=_gasto(date="2026-09-05", amount="300.00", method="credito",
                        installments=3, description="TV", category="Lazer"),
        )
        faturas = [client.get(f"/invoices/2026-{m}", headers=h).json() for m in ("10", "11", "12")]
        assert [f["total"] for f in faturas] == ["100.00", "100.00", "100.00"]
        assert [f["items"][0]["installment"] for f in faturas] == [1, 2, 3]
        assert all(f["items"][0]["total_installments"] == 3 for f in faturas)
        assert all(f["items"][0]["description"] == "TV" for f in faturas)

    def test_gasto_a_vista_nunca_entra_na_fatura(self, client, auth):
        h = auth(closing_day=10)
        client.post("/entries", headers=h, json=_gasto(date="2026-09-05", amount="300.00"))
        assert client.get("/invoices/2026-10", headers=h).json() == {
            "month": "2026-10", "total": "0", "items": [],
        }

    def test_fatura_de_um_nao_mostra_compra_do_outro(self, client, auth):
        ana = auth(email="ana@b.co", closing_day=10)
        bia = auth(email="bia@b.co", closing_day=10)
        client.post(
            "/entries", headers=ana,
            json=_gasto(date="2026-09-05", amount="300.00", method="credito", installments=1),
        )
        assert client.get("/invoices/2026-10", headers=bia).json()["items"] == []


class TestToken:
    """O que acontece quando o bearer não é um token legítimo e recente."""

    def _forjar(self, sub, *, segredo="0" * 64, expira_em_horas=1):
        import jwt

        expira = datetime.now(UTC) + timedelta(hours=expira_em_horas)
        return jwt.encode({"sub": str(sub), "exp": expira}, segredo, algorithm="HS256")

    def test_token_expirado_e_recusado(self, client, auth):
        auth()
        vencido = self._forjar(1, expira_em_horas=-1)
        r = client.get("/entries", headers={"Authorization": f"Bearer {vencido}"})
        assert r.status_code == 401

    def test_token_assinado_com_outra_chave_e_recusado(self, client, auth):
        """Sem isto, trocar o JWT_SECRET não invalidaria sessão nenhuma."""
        auth()
        forjado = self._forjar(1, segredo="f" * 64)  # 64 chars: o PyJWT avisa abaixo de 32 bytes
        r = client.get("/entries", headers={"Authorization": f"Bearer {forjado}"})
        assert r.status_code == 401

    def test_token_valido_de_usuario_inexistente_e_recusado(self, client, auth):
        auth()
        fantasma = self._forjar(99999)
        r = client.get("/entries", headers={"Authorization": f"Bearer {fantasma}"})
        assert r.status_code == 401

    def test_o_token_emitido_vale_sete_dias(self, client, auth):
        import jwt

        h = auth()
        token = h["Authorization"].removeprefix("Bearer ")
        exp = jwt.decode(token, "0" * 64, algorithms=["HS256"])["exp"]
        faltam = datetime.fromtimestamp(exp, UTC) - datetime.now(UTC)
        assert timedelta(days=6, hours=23) < faltam <= timedelta(days=7)


class TestFailFastDoSegredo:
    """A API recusa subir sem JWT_SECRET, ou com um segredo curto. A regra é testada
    direto em `check_secret`; um subprocesso prova que o import do app a aplica."""

    @pytest.fixture
    def check_secret(self, monkeypatch):
        # o próprio módulo exige um segredo válido para ser importado
        monkeypatch.setenv("JWT_SECRET", "0" * 64)
        from app.infra.security import check_secret
        return check_secret

    def test_sem_jwt_secret_a_aplicacao_nao_sobe(self, tmp_path):
        """Num processo novo: é o que prova que o import do app chama a regra."""
        import subprocess
        import sys
        from pathlib import Path

        env = {
            **os.environ,
            "DATABASE_URL": f"sqlite+pysqlite:///{tmp_path/'x.db'}",
            "PYTHONPATH": str(Path(__file__).resolve().parent.parent),
        }
        env.pop("JWT_SECRET", None)
        # check=False de propósito: o returncode é o que está sendo testado
        r = subprocess.run(
            [sys.executable, "-c", "import app.main"],
            env=env, capture_output=True, text=True, check=False,
        )
        assert r.returncode != 0
        assert "JWT_SECRET não está definida" in r.stderr

    def test_sem_segredo_a_regra_recusa(self, check_secret):
        with pytest.raises(RuntimeError, match="JWT_SECRET não está definida"):
            check_secret(None)

    def test_a_mensagem_diz_como_resolver(self, check_secret):
        """Falhar é metade; a outra metade é a pessoa saber o que fazer."""
        with pytest.raises(RuntimeError, match="openssl rand -hex 32"):
            check_secret(None)

    def test_segredo_valido_passa(self, check_secret):
        assert check_secret("0" * 64) == "0" * 64

    @pytest.mark.parametrize("segredo", ["abc", "a" * 31, ""])
    def test_segredo_curto_tambem_impede_a_subida(self, check_secret, segredo):
        """Exigir a variável não basta: `JWT_SECRET=abc` seria quebrável por força
        bruta, e quem quebrasse forjaria a sessão de qualquer usuário."""
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            check_secret(segredo)

    def test_a_mensagem_do_segredo_curto_diz_o_tamanho_e_o_minimo(self, check_secret):
        with pytest.raises(RuntimeError) as erro:
            check_secret("a" * 10)
        assert "tem 10 bytes" in str(erro.value)
        assert "mínimo é 32" in str(erro.value)
        assert "openssl rand -hex 32" in str(erro.value)

    def test_exatamente_32_bytes_passa(self, check_secret):
        """A fronteira: 32 é aceito, 31 não."""
        check_secret("a" * 32)
        with pytest.raises(RuntimeError):
            check_secret("a" * 31)


def revisada(linha, category="Outros", **kw):
    """A linha da prévia como ela volta da tela de revisão: com categoria escolhida."""
    return {
        "type": linha["type"], "amount": linha["amount"], "description": linha["description"],
        "date": linha["date"], "import_id": linha["import_id"], "category": category, **kw,
    }


class TestImportacao:
    """Prévia lê, confirmação grava. O que separa os dois é o usuário conferir."""

    def enviar(self, client, headers, conteudo):
        return client.post(
            "/imports/preview",
            headers=headers,
            files={"file": ("extrato.ofx", conteudo, "application/x-ofx")},
        )

    def test_previa_le_o_extrato_sem_gravar_nada(self, client, auth):
        headers = auth()
        r = self.enviar(client, headers, account_statement([transaction(memo="PIX FULANO")]))

        assert r.status_code == 200
        assert [i["description"] for i in r.json()] == ["PIX FULANO"]
        assert client.get("/entries", headers=headers).json() == []

    def test_previa_exige_autenticacao(self, client):
        assert self.enviar(client, {}, account_statement([transaction()])).status_code == 401

    def test_previa_marca_o_que_ja_foi_importado(self, client, auth):
        headers = auth()
        extrato = account_statement([transaction(fitid="A"), transaction(fitid="B")])
        linhas = self.enviar(client, headers, extrato).json()
        assert [i["already_imported"] for i in linhas] == [False, False]

        client.post("/imports", headers=headers, json=[revisada(linhas[0])])

        marcadas = self.enviar(client, headers, extrato).json()
        assert [i["already_imported"] for i in marcadas] == [True, False]

    def test_previa_recusa_fatura_de_cartao_explicando(self, client, auth):
        r = self.enviar(client, auth(), card_statement())

        assert r.status_code == 422
        assert "fatura de cartão" in r.json()["detail"]

    def test_previa_recusa_arquivo_que_nao_e_ofx(self, client, auth):
        r = self.enviar(client, auth(), b"%PDF-1.4 isto e um extrato em pdf")

        assert r.status_code == 422

    def test_previa_recusa_arquivo_grande_demais(self, client, auth):
        r = self.enviar(client, auth(), b"x" * (2 * 1024 * 1024 + 1))

        assert r.status_code == 413

    def test_confirmacao_grava_os_lancamentos(self, client, auth):
        headers = auth()
        linhas = self.enviar(
            client, headers, account_statement([transaction(amount="-20.00", memo="FEIRA")])
        ).json()

        r = client.post("/imports", headers=headers, json=[revisada(linhas[0], category="Mercado")])

        assert r.status_code == 201
        assert r.json()["skipped"] == 0
        (criado,) = r.json()["created"]
        assert criado["description"] == "FEIRA"
        assert criado["category"] == "Mercado"
        assert criado["amount"] == "20.00"
        assert len(client.get("/entries", headers=headers).json()) == 1

    def test_confirmar_duas_vezes_nao_duplica(self, client, auth):
        headers = auth()
        (linha,) = self.enviar(client, headers, account_statement([transaction()])).json()
        client.post("/imports", headers=headers, json=[revisada(linha)])

        r = client.post("/imports", headers=headers, json=[revisada(linha)])

        assert r.json() == {"created": [], "skipped": 1}
        assert len(client.get("/entries", headers=headers).json()) == 1

    def test_lote_com_a_mesma_linha_repetida_grava_uma_vez(self, client, auth):
        headers = auth()
        (linha,) = self.enviar(client, headers, account_statement([transaction()])).json()

        r = client.post("/imports", headers=headers, json=[revisada(linha), revisada(linha)])

        assert len(r.json()["created"]) == 1
        assert r.json()["skipped"] == 1

    @pytest.mark.parametrize(
        "campos",
        [
            {"method": "credito", "installments": 6},
            {"method": "credito"},
            {"installments": 3},
            # até o valor que seria o padrão: o campo não existe neste endpoint
            {"method": "avista"},
        ],
    )
    def test_forma_e_parcelas_na_importacao_sao_recusadas(self, client, auth, campos):
        """Linha de extrato já saiu da conta: crédito aqui a contaria de novo na fatura."""
        headers = auth()
        (linha,) = self.enviar(client, headers, account_statement([transaction()])).json()

        r = client.post("/imports", headers=headers, json=[revisada(linha, **campos)])

        assert r.status_code == 422
        assert client.get("/entries", headers=headers).json() == []

    def test_contrato_publicado_nao_anuncia_forma_nem_parcelas(self, client):
        """O /docs é o que um cliente novo (o app nativo) vai ler. Anunciar campos que
        respondem 422 é documentação mentindo."""
        campos = client.get("/openapi.json").json()["components"]["schemas"]["EntryImport"]

        assert "method" not in campos["properties"]
        assert "installments" not in campos["properties"]

    def test_linha_importada_e_gravada_a_vista_em_parcela_unica(self, client, auth):
        headers = auth()
        (linha,) = self.enviar(client, headers, account_statement([transaction()])).json()

        (criado,) = client.post("/imports", headers=headers, json=[revisada(linha)]).json()["created"]

        assert criado["method"] == "avista"
        assert criado["installments"] == 1

    def test_entrada_do_extrato_vira_lancamento_de_entrada(self, client, auth):
        headers = auth()
        (linha,) = self.enviar(
            client,
            headers,
            account_statement([transaction(trntype="CREDIT", amount="1500.00", memo="SALARIO")]),
        ).json()

        assert linha["type"] == "entrada"
        assert linha["amount"] == "1500.00"

    def test_o_mesmo_extrato_em_duas_contas_importa_nas_duas(self, client, auth):
        """A restrição única é por usuário: o extrato de um não bloqueia o do outro."""
        ana = auth(email="ana@b.co")
        bia = auth(email="bia@b.co")
        extrato = account_statement([transaction()])
        (linha,) = self.enviar(client, ana, extrato).json()
        client.post("/imports", headers=ana, json=[revisada(linha)])

        (para_bia,) = self.enviar(client, bia, extrato).json()
        assert para_bia["already_imported"] is False

        r = client.post("/imports", headers=bia, json=[revisada(para_bia)])
        assert len(r.json()["created"]) == 1


class TestEdicao:
    """PATCH muda só o que chegou, e o resultado precisa ser um lançamento válido."""

    def criar(self, client, headers, **over):
        return client.post("/entries", headers=headers, json={**LANCAMENTO, **over}).json()

    def test_muda_so_o_campo_enviado(self, client, auth):
        headers = auth()
        entry = self.criar(client, headers)

        r = client.patch(f"/entries/{entry['id']}", headers=headers, json={"category": "Lazer"})

        assert r.status_code == 200
        assert r.json() == {**entry, "category": "Lazer"}

    def test_corpo_vazio_nao_muda_nada(self, client, auth):
        headers = auth()
        entry = self.criar(client, headers)

        r = client.patch(f"/entries/{entry['id']}", headers=headers, json={})

        assert r.json() == entry

    def test_um_usuario_nao_edita_lancamento_do_outro(self, client, auth):
        ana = auth(email="ana@b.co")
        bia = auth(email="bia@b.co")
        entry = self.criar(client, ana)

        r = client.patch(f"/entries/{entry['id']}", headers=bia, json={"amount": "1.00"})

        assert r.status_code == 404
        assert client.get("/entries", headers=ana).json()[0]["amount"] == "150.50"

    def test_lancamento_inexistente_responde_404(self, client, auth):
        assert client.patch("/entries/999", headers=auth(), json={}).status_code == 404

    def test_trocar_para_entrada_num_lancamento_no_credito_e_recusado(self, client, auth):
        """O PATCH em si é válido; o lançamento que resultaria dele, não."""
        headers = auth()
        entry = self.criar(client, headers, method="credito", installments=3)

        r = client.patch(f"/entries/{entry['id']}", headers=headers, json={"type": "entrada"})

        assert r.status_code == 422
        assert client.get("/entries", headers=headers).json()[0]["type"] == "gasto"

    def test_valor_invalido_e_recusado_com_422(self, client, auth):
        headers = auth()
        entry = self.criar(client, headers)

        r = client.patch(f"/entries/{entry['id']}", headers=headers, json={"amount": "0"})

        assert r.status_code == 422

    def test_null_explicito_e_recusado_com_422_e_nao_500(self, client, auth):
        headers = auth()
        entry = self.criar(client, headers)

        r = client.patch(f"/entries/{entry['id']}", headers=headers, json={"category": None})

        assert r.status_code == 422

    def test_editar_linha_importada_nao_quebra_a_deduplicacao(self, client, auth):
        """O caso de uso principal: importar com "Outros" e corrigir a categoria depois."""
        headers = auth()
        extrato = account_statement([transaction()])
        (linha,) = client.post(
            "/imports/preview", headers=headers, files={"file": ("e.ofx", extrato)}
        ).json()
        (criado,) = client.post("/imports", headers=headers, json=[revisada(linha)]).json()["created"]

        # import_id no corpo é ignorado: a origem da linha não é editável
        client.patch(
            f"/entries/{criado['id']}",
            headers=headers,
            json={"category": "Mercado", "import_id": "outro:valor:qualquer"},
        )

        r = client.post("/imports", headers=headers, json=[revisada(linha)])
        assert r.json() == {"created": [], "skipped": 1}
        assert client.get("/entries", headers=headers).json()[0]["category"] == "Mercado"
