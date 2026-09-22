---
paths:
  - "backend/**"
---

# Backend

- **`database.py`** — SQLAlchemy engine/session (`DATABASE_URL` env var, defaults to local
  Postgres). `get_session()` is the FastAPI dependency that yields a session per request.
- **`models.py`** — two tables: `User` (email, bcrypt hash, `monthly_income`, `closing_day`)
  and `Entry` (`type` gasto/entrada, `amount`, `method` avista/credito, `installments`).
  Attribute names are English but map explicitly onto the existing Portuguese DB columns (e.g.
  `usuarios`, `renda_mensal`, `lancamentos`, `valor` — see **Language conventions**). Money
  columns are always `Numeric(12,2)`, never float.
- **`schemas.py`** — Pydantic request/response contracts, using `Decimal` for all money fields
  (mirrors the DB `Numeric` columns — never switch these to `float`).
- **`security.py`** — bcrypt password hashing and JWT issuance/verification (`JWT_SECRET` env
  var, `HS256`, 7-day expiry). The module **refuses to import** when `JWT_SECRET` is missing
  or shorter than `MIN_SECRET_BYTES` (32, the RFC 7518 floor for HS256),
  so the app cannot start signing tokens with a predictable value. `current_user` is the
  FastAPI dependency that resolves the current user from the bearer token; every protected
  endpoint depends on it. It also holds the login attempt limiter
  (`ensure_login_allowed` / `record_failed_login` / `clear_failed_logins`): 5 failures per
  origin+account inside a 15-minute window, counted in memory — one process only, resets on
  restart.
- **`service.py`** — the business rules, written as pure functions with no DB import
  (`Entry`/`User` are only imported under `TYPE_CHECKING`), so they're unit-testable without a
  running Postgres. `invoice_for_purchase`, `split_installments`, `build_invoices` /
  `calculate_invoice`, `calculate_summary`, `calculate_category_breakdown`. See
  `docs/dominio.md` for what each rule means. `calculate_category_breakdown` is the only place
  that groups spending by category — `calculate_summary` used to do it too and no longer does.
  `tests/test_service.py` exercises all of them with dataclass stubs and no database at all;
  add the test in the same commit as the rule.
- **`tests/`** — `pytest` from `backend/` (config in `pyproject.toml`). `test_service.py` needs
  nothing; `test_api.py` boots the app against sqlite, or against Postgres when
  `TEST_DATABASE_URL` is set. Install with `pip install -r requirements-dev.txt` — dev
  dependencies live there and never reach the image.
- **`routers/auth.py` / `routers/finance.py`** — mounted at `/auth` and root respectively.
  `finance.py` loads *all* of a user's `Entry` rows into memory (`_all`) and then
  filters/aggregates in Python via `service.py`, rather than doing month filtering in SQL for
  `/summary` and `/trend` — only `/entries` filters by month at the query level. Fine at
  single-user scale; the first thing to revisit if it gets slow.
- **`main.py`** — app entrypoint; calls `Base.metadata.create_all` on startup (no Alembic yet —
  schema changes to existing tables require a manual migration or dropping/recreating), wires
  CORS from `ALLOWED_ORIGINS`, includes both routers, exposes `/health`.

## Reminders that apply here

- Money stays `Decimal` / `Numeric(12,2)` end to end. Never `float`.
- New business rules go in `service.py` as pure functions, never inline in a router.
- Every `Entry` read/write scopes by `user.id` from the JWT.
- Changing a Pydantic schema means changing `frontend/src/types.ts` in the same commit.
- Read `docs/dominio.md` before touching `service.py`.
