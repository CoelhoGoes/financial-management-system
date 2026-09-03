# Gestão Financeira — backend

API em FastAPI + PostgreSQL, com toda a regra de fatura e saldo no servidor.
Assim o site e um futuro app nativo calculam exatamente a mesma coisa.

## Subir localmente

```bash
cp .env.example .env
# gere um segredo real:
openssl rand -hex 32     # cole em SEGREDO_JWT dentro do .env

docker compose up --build
```

- API: <http://localhost:8000>
- Documentação interativa: <http://localhost:8000/docs>
- Banco: `localhost:5432` (dados persistem no volume `dados_postgres`)

Para derrubar sem perder os dados: `docker compose down`.
Com `-v` o volume vai junto, então cuidado.

## Estrutura

```
backend/app/
├── main.py          ponto de entrada, CORS, registro das rotas
├── database.py      engine e sessão do SQLAlchemy
├── models.py        tabelas usuarios e lancamentos
├── schemas.py       contratos de entrada/saída (Pydantic)
├── seguranca.py     hash de senha (bcrypt) e token JWT
├── servico.py       regras de fatura, saldo e tendência
└── routers/         endpoints HTTP
```

`servico.py` não importa o banco de propósito: as regras são funções puras,
testáveis sem subir Postgres.

## Endpoints

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/auth/registrar` | cria conta |
| POST | `/auth/token` | login, devolve JWT |
| GET/PUT | `/auth/eu` | lê e atualiza renda e dia de fechamento |
| POST/GET | `/lancamentos` | cria e lista lançamentos (filtro `?mes=2026-09`) |
| DELETE | `/lancamentos/{id}` | remove |
| GET | `/resumo/{mes}` | saldo, entradas, gastos e categorias do mês |
| GET | `/faturas/{mes}` | itens e total da fatura que vence no mês |
| GET | `/tendencia?meses=6` | série dos últimos meses |

## Regra da fatura

Compra no crédito **antes** do dia de fechamento cai na fatura do mês seguinte;
a partir do fechamento, pula para a subsequente. Parcelas se espalham pelos
meses seguintes, e a última absorve o centavo da divisão — `100,00` em 3x vira
`33,33 + 33,33 + 33,34`.

Valores são `Numeric(12,2)` no banco e `Decimal` no Python, nunca `float`.
Dinheiro em ponto flutuante acumula erro de arredondamento.

## Deploy

O `docker-compose.yml` sobe tudo em qualquer VPS com Docker. Para hospedagem
gerenciada, Railway, Render e Fly.io leem o `backend/Dockerfile` direto e
oferecem Postgres gerenciado — nesse caso você só troca `DATABASE_URL` pela
string que eles fornecem e não usa o serviço `db` do compose.

Antes de expor na internet:

1. `SEGREDO_JWT` gerado de verdade, nunca o valor de exemplo
2. `ORIGENS_PERMITIDAS` com o domínio real do front, não `*`
3. Tirar o mapeamento `5432:5432` do compose (o banco não precisa ser público)
4. HTTPS na frente (Caddy ou o proxy da plataforma)

## Migrações

O projeto usa `create_all`, que cria as tabelas mas não altera as existentes.
Quando o schema começar a mudar, vale trazer Alembic:

```bash
pip install alembic && alembic init alembic
```

## Frontend

`frontend/api.js` é o cliente pronto: guarda o JWT, injeta o header em toda
chamada e trata 401. O React (`frontend/src`) já consome esse cliente via
`AuthProvider`/`useAuth` (`frontend/src/lib/auth-context.tsx`), com telas de
login/cadastro e resumo mensal.
