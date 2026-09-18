"""Fixtures compartilhadas.

`service.py` não importa nada do banco — `Entry` e `User` só existem lá sob
TYPE_CHECKING. Por isso os testes de regra de negócio usam dublês simples, sem
SQLAlchemy, sem Postgres e sem sqlite.
"""
import os
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

import pytest


@dataclass
class FakeEntry:
    date: date
    amount: Decimal
    type: str = "gasto"
    method: str = "avista"
    category: str = "Outros"
    description: str = "lançamento"
    installments: int = 1
    id: int = 0


@dataclass
class FakeUser:
    monthly_income: Decimal = Decimal(0)
    closing_day: int = 25


@pytest.fixture
def user():
    return FakeUser(monthly_income=Decimal("5000.00"), closing_day=10)


@pytest.fixture
def gasto():
    def make(day: str, amount: str, **kw):
        return FakeEntry(date=date.fromisoformat(day), amount=Decimal(amount), **kw)
    return make


# --- camada de API: precisa de banco ---------------------------------------
# Cada teste recebe um sqlite novo em arquivo temporário. Ver a ressalva sobre
# sqlite vs Postgres no README da suíte.

@pytest.fixture
def client(monkeypatch, tmp_path):
    import importlib
    import sys

    # Padrão é sqlite: rápido e sem container. Apontando TEST_DATABASE_URL para um
    # Postgres, a mesma suíte roda contra o banco de verdade — é o que fecha a
    # diferença registrada em docs/dominio.md.
    url = os.getenv("TEST_DATABASE_URL", f"sqlite+pysqlite:///{tmp_path/'test.db'}")
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("JWT_SECRET", "0" * 64)
    for mod in [m for m in sys.modules if m.startswith("app.")]:
        del sys.modules[mod]

    from fastapi.testclient import TestClient
    main = importlib.import_module("app.main")

    # Schema limpo a cada teste. No sqlite o `tmp_path` já daria isolamento, mas
    # contra um Postgres compartilhado as linhas se acumulariam entre os testes —
    # e o isolamento passaria a depender de qual banco está em uso.
    from app.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def auth(client):
    """Cria uma conta e devolve o header pronto. Aceita e-mail para testar isolamento."""
    def make(email="a@b.co", password="senha12345", **config):
        client.post("/auth/register", json={"email": email, "password": password})
        token = client.post(
            "/auth/token", data={"username": email, "password": password}
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        if config:
            client.put("/auth/me", headers=headers, json=config)
        return headers
    return make


@pytest.fixture(autouse=True)
def bcrypt_rapido(monkeypatch):
    """bcrypt é lento de propósito — é o que protege a senha. Em teste isso vira
    ~1s por login e domina a suíte inteira. Baixar o custo aqui não muda o código
    de produção: só o sal gerado durante os testes."""
    import bcrypt
    original = bcrypt.gensalt
    monkeypatch.setattr(bcrypt, "gensalt", lambda rounds=4: original(rounds=4))
