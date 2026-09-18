# Gestão Financeira

Gerenciador de finanças pessoais para um usuário (ou uma casa pequena). O objetivo central é
responder rápido a duas perguntas: **quanto eu tenho disponível agora** e **quanto a próxima
fatura do cartão vai custar**, já contando as parcelas que eu me comprometi lá atrás.

Toda a matemática de fatura, saldo e tendência vive no backend. O frontend web e um futuro app
nativo consomem a mesma API e por isso chegam sempre no mesmo número — regra de negócio nunca é
duplicada no cliente.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, PyJWT, bcrypt |
| Banco | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, React Router |
| UI | Tailwind CSS v4, shadcn/ui sobre **Base UI** (não Radix), ícones Remix |
| Lint (front) | oxlint |
| Infra local | Docker Compose |

Detalhes de convenção e arquitetura estão em [`CLAUDE.md`](CLAUDE.md).
As regras de negócio estão em [`docs/dominio.md`](docs/dominio.md).

## Subir localmente

O backend roda em Docker; o frontend roda direto no host com Vite.

### 1. Backend + banco

```bash
cp .env.example .env
openssl rand -hex 32          # cole o resultado em JWT_SECRET dentro do .env

docker compose up --build     # exige o plugin Compose v2 (`docker compose`, sem hífen)
                              # Ubuntu/Debian: sudo apt-get install docker-compose-v2
```

- API: <http://localhost:8000>
- Documentação interativa (Swagger): <http://localhost:8000/docs>
- Healthcheck: <http://localhost:8000/health>
- Postgres: `localhost:5432`, dados no volume `dados_postgres`

Para parar sem perder dados: `docker compose down`. Com `-v` o volume vai junto — os
lançamentos somem.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

O cliente HTTP aponta para `http://localhost:8000` por padrão. Para mudar, crie
`frontend/.env`:

```
VITE_API_URL=http://localhost:8000
```

Outros comandos: `npm run build` (typecheck + build de produção), `npm run lint` (oxlint),
`npm run preview` (serve o build).

### Rodar o backend sem Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://gf:senha@localhost:5432/gestao'
export JWT_SECRET='...'
uvicorn app.main:app --reload
```

Precisa de um Postgres alcançável — o projeto não roda em SQLite.

### Checagem de código

As ferramentas rodam por `uvx`/`npx`: não são instaladas, não entram no `requirements.txt` nem
no `package.json`, e não aparecem no `git status`.

A partir da raiz do repositório:

```bash
uvx ruff check backend/                       # lint do backend (config em backend/pyproject.toml)
uvx pip-audit -r backend/requirements.txt     # vulnerabilidades conhecidas nas dependências
cd frontend && npx -y knip                    # código e dependências sem uso no frontend
```

Não há suíte de testes ainda — veja `docs/roadmap.md`.

## Estrutura

```
backend/app/
├── main.py            entrada, CORS, registro dos routers, /health
├── database.py        engine e sessão do SQLAlchemy
├── models.py          tabelas usuarios e lancamentos
├── schemas.py         contratos de entrada/saída (Pydantic)
├── security.py        hash bcrypt e emissão/verificação de JWT
├── service.py         regras de fatura, saldo e tendência (funções puras)
└── routers/
    ├── auth.py        /auth/*
    └── finance.py     /entries, /summary, /invoices, /trend

frontend/
├── api.js             cliente HTTP (JWT, header, tratamento de 401)
└── src/
    ├── main.tsx       monta o React dentro do BrowserRouter + AuthProvider
    ├── App.tsx        tabela de rotas (/login, /, /lancamentos, /fatura)
    ├── types.ts       espelho TypeScript de schemas.py
    ├── index.css      Tailwind v4 + tokens de tema do shadcn
    ├── pages/         uma tela por arquivo (Login/Summary/Entry/Invoice)
    ├── constants/
    │   └── categories.ts   listas fechadas de categoria, espelha docs/dominio.md
    ├── components/
    │   ├── Header.tsx      navegação/header compartilhado entre as telas
    │   └── ui/             componentes shadcn (button, card, input, label, table)
    └── lib/
        ├── auth-context.tsx   AuthProvider / useAuth
        └── format.ts          currentMonth() / formatCurrency() / shiftMonth()

docker-compose.yml     na raiz
.env.example           na raiz (backend); o frontend usa frontend/.env
```

`service.py` não importa o banco de propósito: as regras são funções puras, testáveis sem
subir Postgres.

## Endpoints

Todos exigem `Authorization: Bearer <token>`, exceto `/auth/register`, `/auth/token` e
`/health`.

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/auth/register` | cria conta |
| POST | `/auth/token` | login (form-urlencoded), devolve JWT |
| GET | `/auth/me` | dados do usuário |
| PUT | `/auth/me` | atualiza renda mensal e dia de fechamento |
| POST | `/entries` | cria lançamento |
| GET | `/entries` | lista lançamentos (filtro opcional `?month=2026-09`) |
| DELETE | `/entries/{id}` | remove lançamento |
| GET | `/summary/{month}` | saldo, entradas, gastos e categorias do mês |
| GET | `/invoices/{month}` | itens e total da fatura que vence no mês |
| GET | `/trend` | série dos últimos meses (`?months=6`, `?until=2026-09`) |
| GET | `/health` | status da API |

Valores monetários trafegam como **string** no JSON (FastAPI serializa `Decimal` assim).
No frontend, converta com `Number(valor)` antes de formatar ou somar.

## Deploy

O `docker-compose.yml` sobe tudo em qualquer VPS com Docker. Em hospedagem gerenciada
(Railway, Render, Fly.io), o `backend/Dockerfile` é lido direto e o Postgres é do provedor —
nesse caso você troca `DATABASE_URL` pela string deles e não usa o serviço `db` do compose.
O frontend vai para Vercel ou equivalente, com `VITE_API_URL` apontando para a API publicada.

Antes de expor na internet:

1. `JWT_SECRET` gerado de verdade (`openssl rand -hex 32`) — a API se recusa a subir sem
   ela, então isto não passa despercebido
2. `ALLOWED_ORIGINS` com o domínio real do front, não `*`
3. Remover o mapeamento `5432:5432` do compose — o banco não precisa ser público
4. HTTPS na frente (Caddy ou o proxy da plataforma)
5. `uvx pip-audit -r backend/requirements.txt` sem achados — a tela de login responde sem
   autenticação, então falha em dependência de parsing de formulário fica exposta

## Estado atual

**Funciona:** registro, login, sessão persistida em `localStorage`, roteamento multi-página
(`/login`, `/`, `/lancamentos`, `/fatura`), tela de resumo mensal (renda, gasto total, saldo
disponível), tela de lançamentos (criar, listar e excluir gastos/entradas do mês, com saldo
atualizado a cada ação) e tela de fatura (consulta por mês, com navegação entre meses). Backend
completo com todos os endpoints acima.

**Ainda não existe:** resumo por categoria, gráfico de tendência, testes automatizados, Alembic
(o schema é criado com `create_all`, que não altera tabelas existentes).

Mudanças notáveis ficam registradas em [`CHANGELOG.md`](CHANGELOG.md).
