# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Decisões — leia antes de agir

Não escolha sozinho quando houver mais de um caminho razoável. Apresente as opções com o
trade-off de cada uma e espere resposta. Este projeto é de uma pessoa só: uma decisão tomada
por conta própria vira dívida que ninguém revisou.

**Precisa de aprovação explícita antes:**

- adicionar, remover ou trocar dependência **de runtime** — `backend/requirements.txt` e
  `dependencies` do `package.json`. São as que vão para a imagem Docker e para o bundle
- criar arquivo ou pasta novos na estrutura do projeto
- mudar schema do banco, contrato de API ou formato de payload
- apagar código, arquivo ou configuração
- mudar qualquer coisa em `service.py` — são as regras de negócio
- mudar `.gitignore`, `docker-compose.yml` ou variáveis de ambiente
- rodar CLI de scaffolding que traga **dependência de runtime nova** — é o caso do `Chart`
  do shadcn, que instala `recharts`

**Pode decidir sozinho:**

- nome de variável, função, componente
- ordem de imports, formatação, quebra de linha
- como implementar algo cujo contrato já foi acordado
- instalar componente do registro oficial do shadcn que **não** traga dependência de runtime
  nova — avise qual e por quê, mas não espere aprovação. Preferir o shadcn ao feito à mão é
  a regra, não a exceção (ver `.claude/rules/rules-frontend.md`)
- dependência **de desenvolvimento** — `backend/requirements-dev.txt` e `devDependencies` do
  `package.json`. Não são entregues a ninguém: o `Dockerfile` instala só o `requirements.txt` e
  o `vite build` não empacota `devDependencies`. O custo de errar é desinstalar

**Quando faltar contexto, pergunte em vez de supor.** Se eu não respondi alguma coisa, não
preencha a lacuna com o palpite mais provável — diga que falta a informação e o que você
precisa saber. Um palpite apresentado como fato custa mais caro que uma pergunta.

**Não invente motivação.** Ao documentar ou explicar uma escolha anterior que você não
acompanhou, escreva que não foi possível determinar o motivo, em vez de deduzir um plausível.

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

### Categories

The `gasto` and `entrada` category lists live in `docs/dominio.md` — read them from there
rather than inventing category names.

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
├── pyproject.toml            ruff + pytest config — not a package definition
├── requirements.txt          runtime only — this is what the image installs
├── requirements-dev.txt      pytest + httpx2, never shipped
├── tests/                    test_service.py (no DB) and test_api.py (sqlite/Postgres)
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
    ├── main.tsx               mounts App inside BrowserRouter + AuthProvider
    ├── App.tsx                route table only (login/summary/entries/invoice/config)
    ├── types.ts               mirror of backend schemas.py
    ├── index.css              Tailwind v4 import + shadcn theme tokens
    ├── test-setup.ts          vitest setup (jest-dom matchers)
    ├── pages/                 one file per screen (Login/Summary/Entry/Invoice/Config)
    ├── constants/
    │   └── categories.ts      closed category lists, mirrors docs/dominio.md
    ├── components/
    │   ├── Header.tsx         shared nav header, used by every authenticated screen
    │   ├── TrendChart.tsx     trend chart, lazy-loaded so recharts stays out of the main bundle
    │   └── ui/                shadcn components: button.tsx, card.tsx, input.tsx, label.tsx,
    │                          table.tsx
    └── lib/
        ├── auth-context.tsx  AuthProvider / useAuth
        └── format.ts          currentMonth() / formatCurrency() / formatPercent()
                               / shiftMonth()
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

**Running the tests:**

```bash
pip install -r backend/requirements-dev.txt   # once
cd backend && pytest                          # 64 tests, ~5s

cd frontend && npm test                       # 38 tests, ~3s
```

`backend/tests/test_service.py` needs no database: `service.py` is pure, so the tests use
plain dataclass stubs instead of `Entry`/`User`. `test_api.py` does need one and runs on
sqlite by default. Set `TEST_DATABASE_URL` to run the same suite against a real Postgres
(command in `README.md`) — both are verified, but the everyday run is sqlite. The money math
lives in the DB-free layer on purpose.

Other checks: `npm run build` (typecheck), `uvx ruff check backend/` (lint; config in
`backend/pyproject.toml`) and `docker compose config` (validates the compose file, and also
fails when `JWT_SECRET` is missing from the environment).

Auditing tools run through `uvx`/`npx`, so they install nothing and never enter
`requirements.txt` or `package.json`:

```bash
uvx ruff check backend/              # lint
uvx pip-audit -r backend/requirements.txt   # known CVEs in dependencies
```

To run the API without Docker: install `backend/requirements.txt` into a venv, export
`DATABASE_URL` pointing at a reachable Postgres and `JWT_SECRET`, then run
`uvicorn app.main:app --reload` from `backend/`.

## Architecture

Split into path-scoped rules so each loads only when relevant:

- `.claude/rules/rules-backend.md` — loads when a file under `backend/` enters context
- `.claude/rules/rules-frontend.md` — loads when a file under `frontend/` enters context

Read the matching rule before changing code in that half of the repo. The invariants below
apply everywhere and are not repeated there.

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
- `.agents/`, `skills-lock.json` — instalados pelo shadcn CLI, gitignorados
- `.claude/rules/`, `.claude/skills/` — versionados e mantidos à mão; só editar se eu autorizar
  explicitamente na conversa (ex.: um arquivo em `.claude/rules/` ficou desatualizado e eu pedi
  para corrigir)
- `.env` — nunca leia, escreva ou commite; use `.env.example` como referência

## Roadmap

A fila de trabalho vive em `docs/roadmap.md`. Consulte esse arquivo quando eu perguntar o
que falta ou o que vem a seguir — não a reproduza aqui.

**Em andamento:** nada; o gráfico de tendência acabou de ser concluído.

O backend está à frente do frontend: fatura, categorias e tendência já são calculadas e
expostas em `/invoices/{month}`, `/summary/{month}` e `/trend`. O que falta nessas features
é tela. Antes de propor "arrumar" algo que parece desleixo, cheque **Dívidas conhecidas**
no `dominio.md` — várias escolhas são deliberadas.
