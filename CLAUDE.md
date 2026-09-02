# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FastAPI + PostgreSQL backend for a personal finance app ("Gestão Financeira"). All invoice
(fatura)/balance/trend math lives server-side in `servico.py` so the web frontend and a future
native app compute identical results. `frontend/api.js` is the ready-made JS client (stores the
JWT, injects the `Authorization` header, handles 401).

Domain language in code, identifiers, and API responses is Portuguese (e.g. `lancamentos` =
entries/transactions, `fatura` = credit-card invoice, `resumo` = summary, `renda_mensal` =
monthly income, `dia_fechamento` = card closing day). Keep new code consistent with this.

## Product context

The app is a personal finance manager for a single user (or small household). Priority order
for features, established at the start of the project:

1. **Launch entries and see available balance** — the core loop: add a gasto/entrada, see the
   updated saldo immediately.
2. **Credit-card invoice control** — know exactly what the next fatura will cost, including
   future installments already committed.
3. **Category breakdown** — per-category spending totals for the current month.
4. **Spending trend** — 6-month bar chart of gasto_total so patterns are visible.

Target platforms: web (PWA, works on iOS Safari and desktop browsers) and, eventually, a native
iOS/Android app. The backend API is the single source of truth for both — never duplicate
business logic on the client.

### Expense categories (gastos)

Mercado, Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação, Assinaturas, Outros

### Income categories (entradas)

Freela, Reembolso, Presente, Venda, Outros

## Repository layout

```
backend/
├── Dockerfile
├── requirements.txt
└── app/
    ├── main.py
    ├── database.py
    ├── models.py
    ├── schemas.py
    ├── seguranca.py
    ├── servico.py
    └── routers/
        ├── autenticacao.py
        └── financas.py
frontend/
└── api.js
docker-compose.yml   (repo root)
.env.example          (repo root)
```

## Commands

```bash
cp .env.example .env
openssl rand -hex 32     # paste into SEGREDO_JWT in .env

docker compose up --build   # or `docker-compose up --build` on hosts with only the
                             # legacy standalone binary (no `docker compose` CLI plugin)
                             # API on :8000, docs at /docs, Postgres on :5432
docker compose down         # stop (add -v to also drop the dados_postgres volume)
```

There is no local (non-Docker) run path documented and no test suite in the repo yet. To run
the API without Docker, install `backend/requirements.txt` into a venv, export `DATABASE_URL`
pointing at a reachable Postgres, and run `uvicorn app.main:app --reload` from `backend/`.

## Architecture

- **`database.py`** — SQLAlchemy engine/session (`DATABASE_URL` env var, defaults to local
  Postgres). `obter_sessao()` is the FastAPI dependency that yields a session per request.
- **`models.py`** — two tables: `Usuario` (email, bcrypt hash, `renda_mensal`, `dia_fechamento`)
  and `Lancamento` (an entry: `tipo` gasto/entrada, `valor`, `forma` avista/credito, `parcelas`).
  Money columns are always `Numeric(12,2)`, never float.
- **`schemas.py`** — Pydantic request/response contracts, using `Decimal` for all money fields
  (mirrors the DB `Numeric` columns — never switch these to `float`).
- **`seguranca.py`** — bcrypt password hashing and JWT issuance/verification (`SEGREDO_JWT`,
  `HS256`, 7-day expiry). `usuario_atual` is the FastAPI dependency that resolves the current
  user from the bearer token; every protected router endpoint depends on it.
- **`servico.py`** — the business rules, written as pure functions with no DB import
  (`Lancamento`/`Usuario` are only imported under `TYPE_CHECKING`), so they're unit-testable
  without a running Postgres:
  - `fatura_da_compra` — a credit purchase before `dia_fechamento` lands on next month's
    invoice; on/after that day it skips to the month after.
  - `dividir_parcelas` — splits an installment total into N `Decimal` pieces; the last
    installment absorbs the rounding remainder (e.g. 100.00 / 3 → 33.33 + 33.33 + 33.34).
  - `montar_faturas` / `calcular_fatura` — groups credit-card installments by the invoice month
    they land in.
  - `calcular_resumo` — combines income, cash entries, cash spending, and the computed invoice
    total into the monthly `Resumo` (balance, per-category breakdown, etc).
- **`routers/autenticacao.py` / `routers/financas.py`** — the two API routers. `financas.py`
  loads *all* of a user's `Lancamento` rows into memory
  (`_todos`) and then filters/aggregates in Python via `servico.py`, rather than doing month
  filtering in SQL for `/resumo` and `/tendencia` — only `/lancamentos` filters by month at the
  query level.
- **`main.py`** — app entrypoint; calls `Base.metadata.create_all` on startup (no Alembic yet —
  schema changes to existing tables require a manual migration or dropping/recreating), wires
  CORS from `ORIGENS_PERMITIDAS`, and includes both routers.
- **`api.js`** — frontend HTTP client; on any `401` it clears the stored JWT and throws so the
  caller can redirect to login.

## Key invariants to preserve

- Money is always `Decimal`/`Numeric(12,2)`, never `float`, from DB column through Pydantic
  schema to arithmetic in `servico.py`.
- Business/invoice/balance logic belongs in `servico.py` as pure functions (no DB access), not
  inline in routers — this is what keeps it independently testable and shareable with a future
  native client.
- `entrada` (income) entries cannot use `forma == "credito"` (enforced in `financas.py`'s
  `criar` endpoint).
- Every `Lancamento` mutation/read endpoint scopes by `usuario.id` from the JWT — never trust a
  client-supplied user id.

## Planned next steps

- [ ] Connect the React frontend to `frontend/api.js` (replace `window.storage` calls)
- [ ] Add login/register screens to the frontend
- [ ] Deploy: backend to Railway / Render / Fly.io; frontend to Vercel
- [ ] Add Alembic once the schema needs to change with real data in the DB
- [ ] Add a test suite (pytest) — `servico.py` pure functions are ready to test without Postgres
