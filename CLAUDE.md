# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project

Personal finance app ("Gestão Financeira") — FastAPI + PostgreSQL backend, React + Vite
frontend. All invoice (fatura)/balance/trend math lives server-side in `backend/app/service.py`
so the web frontend and a future native app compute identical results. `frontend/api.js` is the
JS client (stores the JWT, injects the `Authorization` header, handles 401).

Business rules in prose: see `docs/dominio.md`. Read it before changing anything in
`service.py`.

See **Language conventions** below: code identifiers and API responses are English; only
UI-facing text and DB schema (table/column names) stay in Portuguese.

## Product context

Personal finance manager for a single user (or small household). Priority order for features,
established at the start of the project:

1. **Launch entries and see available balance** — the core loop: add a gasto/entrada, see the
   updated saldo immediately.
2. **Credit-card invoice control** — know exactly what the next fatura will cost, including
   future installments already committed.
3. **Category breakdown** — per-category spending totals for the current month.
4. **Spending trend** — 6-month bar chart of total spending so patterns are visible.

Target platforms: web (PWA, works on iOS Safari and desktop browsers) and, eventually, a native
iOS/Android app. The backend API is the single source of truth for both — never duplicate
business logic on the client.

### Expense categories (gastos)

Mercado, Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação, Assinaturas, Outros

### Income categories (entradas)

Freela, Reembolso, Presente, Venda, Outros

## Language conventions

- **Code** (variable/function/class/file names, comments, JSON field names in the API,
  internal config keys and env var names): **English**. E.g. `User`, `Entry`,
  `calculate_summary`, `monthly_income`, `closing_day`, `JWT_SECRET`.
- **User-facing content** (UI strings, button/label text, error messages shown to the user,
  i18n content): **Portuguese**. This is what the end user sees and does not change.
- **Database schema** (table/column names, e.g. `usuarios`, `lancamentos`, `renda_mensal`) and
  **domain enum values** (`gasto`/`entrada`, `avista`/`credito`) stay in Portuguese — the ORM
  models map English attribute names onto these existing Portuguese columns explicitly (e.g.
  `monthly_income: Mapped[float] = mapped_column("renda_mensal", ...)` in `models.py`), so the
  actual DB schema is unaffected by the code-identifier language.
- **Documentation and commit messages**: Portuguese.
- Follow this for all new code going forward.

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
    ├── security.py
    ├── service.py
    └── routers/
        ├── auth.py
        └── finance.py
frontend/
├── api.js                    HTTP client (plain JS, lives OUTSIDE src/ — see Frontend notes)
├── components.json           shadcn config
├── vite.config.ts            React + Tailwind v4 plugins, '@' alias → ./src
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts              mirror of backend schemas.py
    ├── index.css             Tailwind v4 import + shadcn theme tokens
    └── lib/
        ├── auth-context.tsx  AuthProvider / useAuth
        └── utils.ts          cn()
docs/dominio.md               business rules in prose
docker-compose.yml            repo root
.env.example                  repo root (backend vars only)
```

## Commands

Backend:

```bash
cp .env.example .env
openssl rand -hex 32     # paste into JWT_SECRET in .env

docker compose up --build   # requires the `docker compose` CLI plugin (Compose v2);
                            # on Ubuntu/Debian: `sudo apt-get install docker-compose-v2`
                            # API on :8000, docs at /docs, Postgres on :5432
docker compose down         # stop (add -v to also drop the dados_postgres volume)
```

Frontend (run from `frontend/`):

```bash
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build  — this is also the typecheck
npm run lint       # oxlint
npm run preview    # serve the production build
```

**There is no test suite yet.** When asked to "run the tests", say so rather than inventing a
command. The closest thing to a check today is `npm run build` (catches type errors) and
`docker compose config` (validates the compose file).

To run the API without Docker: install `backend/requirements.txt` into a venv, export
`DATABASE_URL` pointing at a reachable Postgres and `JWT_SECRET`, then run
`uvicorn app.main:app --reload` from `backend/`.

## Architecture — backend

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
  var, `HS256`, 7-day expiry). `current_user` is the FastAPI dependency that resolves the
  current user from the bearer token; every protected endpoint depends on it.
- **`service.py`** — the business rules, written as pure functions with no DB import
  (`Entry`/`User` are only imported under `TYPE_CHECKING`), so they're unit-testable without a
  running Postgres. `invoice_for_purchase`, `split_installments`, `build_invoices` /
  `calculate_invoice`, `calculate_summary`. See `docs/dominio.md` for what each rule means.
- **`routers/auth.py` / `routers/finance.py`** — mounted at `/auth` and root respectively.
  `finance.py` loads *all* of a user's `Entry` rows into memory (`_all`) and then
  filters/aggregates in Python via `service.py`, rather than doing month filtering in SQL for
  `/summary` and `/trend` — only `/entries` filters by month at the query level. Fine at
  single-user scale; the first thing to revisit if it gets slow.
- **`main.py`** — app entrypoint; calls `Base.metadata.create_all` on startup (no Alembic yet —
  schema changes to existing tables require a manual migration or dropping/recreating), wires
  CORS from `ALLOWED_ORIGINS`, includes both routers, exposes `/health`.

## Architecture — frontend

- **`api.js`** — the HTTP client. On any `401` it clears the stored JWT and throws so the caller
  can redirect to login. Reads `VITE_API_URL`, defaulting to `http://localhost:8000`. Token
  lives in `localStorage` under `gf:token`.
- **`auth-context.tsx`** — `AuthProvider` wraps the app in `main.tsx` and owns `user`,
  `loading`, `error`. On mount, if a token exists it calls `/auth/me` to rehydrate the session.
  `useAuth()` throws outside the provider. All screens read auth state from here, never from
  `api.js` directly.
- **`types.ts`** — hand-maintained mirror of `backend/app/schemas.py`. **When you change a
  Pydantic schema, update this file in the same commit** — nothing enforces the correspondence.
- **`App.tsx`** — currently holds both `LoginScreen` and `SummaryScreen` and switches on
  `user`. There is no router. When a third screen appears, that's the moment to introduce one
  and split the file.

### Money in the frontend

FastAPI serializes `Decimal` as a **string**. Every money field in `types.ts` is typed `string`
on purpose. Always `Number(value)` before arithmetic or formatting, and never send a JS float
back — the backend expects a string or number it can parse into `Decimal` exactly.

### UI conventions

- **Tailwind CSS v4**, configured via the `@tailwindcss/vite` plugin. There is no
  `tailwind.config.js` — theme tokens are CSS variables in `src/index.css`.
- **shadcn/ui on Base UI, not Radix.** `@base-ui/react` is the primitive library. Most
  shadcn snippets found online assume Radix and will not work as-is. Icons come from
  `@remixicon/react`, not lucide.
- Style preset is `base-nova`, base color `neutral`, with `cssVariables: true`.
- **No components have been installed yet** — `src/components/` does not exist. `App.tsx` uses
  raw `<input>`/`<button>` with hand-written Tailwind classes. Install components with the
  shadcn CLI (`npx shadcn@latest add button input card`) rather than writing them by hand, so
  the tokens and variants stay consistent.
- Use the `@/` alias for imports inside `src/` (`@/lib/utils`, `@/components/ui/button`).
  `api.js` is the exception — it sits outside `src/` and is imported by relative path.
- Compose with `cn()` from `@/lib/utils` when merging class names conditionally.
- Colors come from the semantic tokens (`bg-background`, `text-foreground`, `border-border`,
  `text-destructive`), never hardcoded hex or raw palette classes — that's what keeps dark mode
  working.

## Key invariants to preserve

- Money is always `Decimal`/`Numeric(12,2)`, never `float`, from DB column through Pydantic
  schema to arithmetic in `service.py`.
- Business/invoice/balance logic belongs in `service.py` as pure functions (no DB access), not
  inline in routers and never in the frontend — this is what keeps it testable and shareable
  with a future native client.
- `entrada` (income) entries cannot use `method == "credito"` (enforced in `finance.py`'s
  `create` endpoint).
- Every `Entry` mutation/read endpoint scopes by `user.id` from the JWT — never trust a
  client-supplied user id.
- `frontend/src/types.ts` and `backend/app/schemas.py` change together.

## Changelog

Este projeto mantém um `CHANGELOG.md` no formato
[Keep a Changelog](https://keepachangelog.com/).

Ao finalizar qualquer feature, fix ou mudança relevante:

1. Adicione uma entrada em `CHANGELOG.md`, na seção `[Não lançado]`, na categoria certa
   (Adicionado / Corrigido / Alterado / Removido).
2. Escreva a entrada em português, no mesmo estilo do resto do arquivo — uma linha curta,
   descrevendo o efeito para quem usa o sistema, não a implementação.
3. Isso deve acontecer no mesmo commit da mudança (ou no commit final, se for uma sequência de
   commits para uma única feature) — nunca deixe para depois.

Quando eu pedir explicitamente para "lançar uma versão", promova o conteúdo de `[Não lançado]`
para uma seção `[X.Y.Z] - AAAA-MM-DD` nova, seguindo SemVer, e deixe `[Não lançado]` vazio para
a próxima rodada.

## Do not touch

- `frontend/dist/` — build output, gitignored
- `frontend/package-lock.json` — só muda via `npm install`, nunca edite à mão
- `.agents/`, `.claude/`, `skills-lock.json` — instalados pelo shadcn CLI, gitignorados
- `.env` — nunca leia, escreva ou commite; use `.env.example` como referência

## Planned next steps

- [x] Connect the React frontend to `frontend/api.js` (via `AuthProvider`/`useAuth`)
- [x] Add login/register screens
- [ ] Install the first shadcn components and replace the raw inputs/buttons in `App.tsx`
- [ ] Entry screen (create/list/delete) — the core loop from Product context #1
- [ ] Invoice screen (`/invoices/{month}`) and trend chart (`/trend`)
- [ ] Router, once there's a third screen
- [ ] Move `api.js` into `src/` as TypeScript (see docs/dominio.md → Dívidas conhecidas)
- [ ] Add a test suite (pytest) — `service.py` pure functions are ready to test without Postgres
- [ ] Add Alembic once the schema needs to change with real data in the DB
- [ ] Deploy: backend to Railway / Render / Fly.io; frontend to Vercel
