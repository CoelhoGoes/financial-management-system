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
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PyJWT, bcrypt, ofxtools (leitura de OFX) |
| Banco | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, React Router |
| UI | Tailwind CSS v4, shadcn/ui sobre **Base UI** (não Radix), ícones Remix |
| Lint (front) | oxlint |
| Infra local | Docker Compose |

Detalhes de convenção e arquitetura estão em [`CLAUDE.md`](CLAUDE.md).
As regras de negócio estão em [`docs/dominio.md`](docs/dominio.md).

## Subir localmente

```bash
./dev.sh
```

Sobe tudo: Postgres e API em Docker, frontend em modo dev. Cria o `.env` e gera o
`JWT_SECRET` se estiver faltando, espera a API responder antes de abrir o Vite, e instala as
dependências do frontend na primeira vez. `Ctrl+C` encerra o Vite; os containers seguem de pé
(`docker compose down` para derrubar).

O resto desta seção é o caminho manual, útil quando você quer rodar só uma das metades.

O backend roda em Docker; o frontend roda direto no host com Vite.

### 1. Backend + banco

```bash
cp .env.example .env
openssl rand -hex 32          # cole o resultado em JWT_SECRET dentro do .env
                              # obrigatório: a API recusa subir sem ele, e também
                              # com menos de 32 bytes — o valor de exemplo não serve

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
`npm test` (vitest), `npm run test:watch` (vitest em watch), `npm run preview` (serve o build),
`npm run gen:types` (regenera `src/shared/api-schema.d.ts` a partir da API no ar — rode depois
de mudar `backend/app/api/schemas.py`; o `./dev.sh` avisa quando ficou desatualizado).
Antes dele, `docker compose restart api`: o container roda sem `--reload` e continua servindo o
OpenAPI antigo até reiniciar.

### Rodar o backend sem Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://gf:senha@localhost:5432/gestao'
export JWT_SECRET='...'
alembic upgrade head          # cria/atualiza as tabelas — a API não cria schema sozinha
uvicorn app.main:app --reload
```

Precisa de um Postgres alcançável — o projeto não roda em SQLite. Pular o `alembic upgrade
head` sobe uma API sem tabelas: desde a adoção do Alembic, o schema é das migrações.

### Criar uma migração

Toda mudança em `backend/app/infra/models.py` vem com uma migração no mesmo commit. Nada cria
tabela no boot: modelo sem migração quebra o deploy.

Com os containers de pé (`./dev.sh` ou `docker compose up`), a partir da raiz:

```bash
# 1. gera o arquivo comparando models.py com o banco de desenvolvimento
docker compose exec --user "$(id -u):$(id -g)" api \
  alembic revision --autogenerate -m "id de importacao em lancamentos"

# 2. aplica (o container roda `alembic upgrade head` ao subir)
docker compose restart api

# 3. confere que modelos e migrações batem: termina em "No new upgrade operations detected."
docker compose exec api alembic check
```

- **O `--user` importa:** o container roda como root, e sem ele o arquivo novo em
  `backend/alembic/versions/` fica com dono root no seu disco.
- **Leia o arquivo gerado antes de aplicar.** O autogenerate compara o estado, não a intenção:
  uma coluna renomeada vira `drop_column` + `add_column`, e os dados da coluna antiga somem.
  Nesse caso troque pelo `op.alter_column(..., new_column_name=...)` à mão. Confira também o
  `downgrade()`.
- A mensagem segue as que já existem: português, minúsculas, sem acento — ela vira o nome do
  arquivo.
- O banco precisa estar em `head` antes do passo 1, senão o autogenerate compara com um schema
  velho. Basta o container ter subido depois do último `git pull`.

Sem Docker, os mesmos comandos rodam de dentro de `backend/`, com o venv e as variáveis da seção
acima: `alembic revision --autogenerate -m "..."`, `alembic upgrade head`, `alembic check`.

Duas coisas conferem isso depois: o `./dev.sh` roda o `alembic check` a cada início e avisa em
vermelho, e o `tests/test_migrations.py` aplica as migrações num banco vazio — só roda contra
Postgres (ver [Testes](#testes)). A suíte do dia a dia, em sqlite, monta o schema a partir dos
modelos e não percebe migração faltando.

### Checagem de código

As ferramentas rodam por `uvx`/`npx`: não são instaladas, não entram no `requirements.txt` nem
no `package.json`, e não aparecem no `git status`.

A partir da raiz do repositório:

```bash
uvx ruff check backend/                       # lint do backend (config em backend/pyproject.toml)
uvx pip-audit -r backend/requirements.txt     # vulnerabilidades conhecidas nas dependências
cd frontend && npx -y knip                    # código e dependências sem uso no frontend
```

### Testes

```bash
pip install -r backend/requirements-dev.txt   # uma vez
cd backend && pytest                          # 136 testes (1 pulado em sqlite), ~15s

cd frontend && npm test                       # 93 testes, ~5s
```

Os testes de `backend/tests/test_service.py` e `test_ofx.py` não precisam de banco —
`service.py` e `ofx.py` são puros. Os extratos usados em `test_ofx.py` são inventados e ficam
como string dentro do arquivo: `*.ofx` está no `.gitignore`, porque extrato é dado bancário. Os
de `test_api.py` rodam em sqlite por padrão. Para rodar a mesma suíte contra o Postgres de
verdade:

```bash
docker run --rm -d --name pg_test -e POSTGRES_PASSWORD=teste \
  -e POSTGRES_DB=gestao_test -p 5433:5432 postgres:16-alpine
cd backend && TEST_DATABASE_URL='postgresql+psycopg://postgres:teste@localhost:5433/gestao_test' pytest
docker stop pg_test
```

## Estrutura

```
backend/
├── requirements.txt       dependências de runtime — é o que a imagem instala
├── requirements-dev.txt   pytest + httpx2, não entram na imagem
├── alembic.ini
├── alembic/               migrações — donas do schema; rodam no boot do container
├── tests/
│   ├── test_service.py    regras de negócio, sem banco nenhum
│   ├── test_ofx.py        leitura de extrato OFX, sem banco nenhum
│   ├── test_api.py        contrato HTTP, em sqlite ou Postgres
│   └── test_migrations.py migrações batem com os modelos — só em Postgres
└── app/                   em camadas: api → domain → infra (veja Arquitetura abaixo)
    ├── main.py            entrada, CORS, registro dos routers, /health
    ├── api/               HTTP: rotas, contratos e dependências do FastAPI
    │   ├── auth.py        /auth/*
    │   ├── finance.py     /entries, /summary, /invoices, /trend, /imports
    │   ├── schemas.py     contratos de entrada/saída (Pydantic)
    │   └── deps.py        current_user e limite de tentativas de login
    ├── domain/            regras de negócio, funções puras, sem banco nem HTTP
    │   ├── service.py     fatura, saldo e tendência
    │   └── ofx.py         leitura de extrato OFX
    └── infra/             o que fala com o mundo de fora
        ├── database.py    engine e sessão do SQLAlchemy
        ├── models.py      tabelas usuarios e lancamentos
        └── security.py    hash bcrypt e JWT

frontend/
└── src/               em camadas: presentation → state → data, e shared para todas
    ├── main.tsx       monta o React dentro do BrowserRouter + AuthProvider
    ├── App.tsx        tabela de rotas (/login, /, /lancamentos, /fatura, /importar,
    │                  /configuracoes)
    ├── index.css      Tailwind v4 + tokens de tema do shadcn
    ├── presentation/  o que aparece na tela
    │   ├── pages/     uma tela por arquivo (Login/Summary/Entry/Invoice/Import/Config)
    │   └── components/
    │       ├── Header.tsx      navegação/header compartilhado entre as telas
    │       ├── MonthNav.tsx    passo de mês, compartilhado por resumo, lançamentos e fatura
    │       ├── TrendChart.tsx  gráfico de tendência (carregado sob demanda)
    │       └── ui/             componentes shadcn (badge, button, card, chart, checkbox,
    │                           input, label, native-select, table, toggle,
    │                           toggle-group)
    ├── state/
    │   ├── auth-context.tsx    AuthProvider / useAuth
    │   └── theme.ts            tema claro/escuro/sistema, por aparelho no localStorage
    ├── data/
    │   └── api.ts     cliente HTTP tipado (JWT, header, tratamento de 401)
    └── shared/        usado por qualquer camada, não depende de nenhuma
        ├── api-schema.d.ts gerado do OpenAPI da API — não edite à mão
        ├── types.ts        nomes curtos para os tipos gerados
        ├── categories.ts   listas fechadas de categoria, espelha docs/dominio.md
        └── format.ts       currentMonth() / formatCurrency() / formatPercent()
                            / shiftMonth() / formatMonthShort() / formatDayMonth()

dev.sh                 na raiz — sobe tudo numa linha
docker-compose.yml     na raiz
.env.example           na raiz (backend); o frontend usa frontend/.env
```

### Arquitetura

Os dois lados seguem a **arquitetura em camadas clássica**: cada camada só chama a de baixo,
nunca a de cima.

| Backend (`backend/app/`) | Frontend (`frontend/src/`) | Papel |
|---|---|---|
| `api/` | `presentation/` | entrada: HTTP no backend, tela no frontend |
| `domain/` | `state/` | regra ou estado da aplicação |
| `infra/` | `data/` | fala com o mundo de fora: banco e segredo, ou a API |
| — | `shared/` | tipos e helpers puros que qualquer camada usa |

`domain/` não importa o banco nem o FastAPI: as regras são funções puras, testáveis sem
subir Postgres, e devolvem dataclasses próprias. É o `response_model` das rotas que as
converte nos schemas de `api/schemas.py`.

## Endpoints

Todos exigem `Authorization: Bearer <token>`, exceto `/auth/register`, `/auth/token` e
`/health`.

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/auth/register` | cria conta |
| POST | `/auth/token` | login (form-urlencoded), devolve JWT |
| GET | `/auth/me` | dados do usuário |
| PUT | `/auth/me` | atualiza renda mensal e dia de fechamento |
| DELETE | `/auth/me` | exclui a conta (pede `password` no corpo); exclusão lógica, os dados ficam no banco |
| POST | `/entries` | cria lançamento |
| GET | `/entries` | lista lançamentos (filtro opcional `?month=2026-09`) |
| PATCH | `/entries/{id}` | altera só os campos enviados; o resultado é validado como lançamento novo |
| DELETE | `/entries/{id}` | remove lançamento |
| GET | `/summary/{month}` | saldo, entradas e gastos do mês |
| GET | `/summary/{month}/categories` | gasto por categoria, com os itens e o número da parcela |
| GET | `/invoices/{month}` | itens e total da fatura que vence no mês |
| GET | `/trend` | série dos últimos meses (`?months=6`, `?until=2026-09`) |
| POST | `/imports/preview` | lê um extrato OFX (multipart, campo `file`) e devolve as linhas, sem gravar |
| POST | `/imports` | grava as linhas revisadas (sempre à vista), pulando as já importadas |
| GET | `/health` | status da API |

Valores monetários trafegam como **string** no JSON (FastAPI serializa `Decimal` assim).
No frontend, converta com `Number(valor)` antes de formatar ou somar.

## Deploy

O `docker-compose.yml` sobe tudo em qualquer VPS com Docker. Em hospedagem gerenciada
(Railway, Render, Fly.io), o `backend/Dockerfile` é lido direto e o Postgres é do provedor —
nesse caso você troca `DATABASE_URL` pela string deles e não usa o serviço `db` do compose.
O frontend vai para Vercel ou equivalente, com `VITE_API_URL` apontando para a API publicada.

Antes de expor na internet:

1. `JWT_SECRET` gerado de verdade (`openssl rand -hex 32`) — a API recusa subir sem ela ou
   com menos de 32 bytes, então isto não passa despercebido
2. `ALLOWED_ORIGINS` com o domínio real do front, não `*`
3. Remover o mapeamento `5432:5432` do compose — o banco não precisa ser público
4. HTTPS na frente (Caddy ou o proxy da plataforma)
5. `uvx pip-audit -r backend/requirements.txt` sem achados — a tela de login responde sem
   autenticação, então falha em dependência de parsing de formulário fica exposta
6. Rever o limite de tentativas de login: hoje ele vive em memória, o que basta para um
   processo só. Com mais de um worker cada um conta em separado e o limite efetivo
   multiplica

## Estado atual

**Funciona:** registro, login, sessão persistida em `localStorage`, roteamento multi-página
(`/login`, `/`, `/lancamentos`, `/fatura`, `/importar`, `/configuracoes`), tela de resumo
mensal (saldo, renda, fatura, gasto por categoria com barra de proporção e gráfico de tendência
dos últimos meses), tela de lançamentos (criar, editar, listar e excluir gastos/entradas do
mês), tela de fatura (consulta por mês, com navegação entre meses), importação de extrato OFX
com conferência antes de gravar, e tela de configuração (renda mensal, dia de fechamento, tema
claro/escuro seguindo o sistema por padrão, e exclusão da conta).
Backend completo com todos os endpoints acima; o schema é das migrações Alembic.

**Ainda não existe:** exportar os dados, trocar e-mail ou senha, entre outros — a fila
completa está em [`docs/roadmap.md`](docs/roadmap.md).

Mudanças notáveis ficam registradas em [`CHANGELOG.md`](CHANGELOG.md).
