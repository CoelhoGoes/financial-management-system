# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o versionamento tenta seguir [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Estrutura inicial do backend: FastAPI + PostgreSQL, Docker Compose
- Autenticação com JWT (registro, login)
- CRUD de lançamentos (gastos e entradas)
- Cálculo de fatura de cartão com regra de fechamento e parcelamento
- Cálculo de resumo mensal (saldo, categorias, tendência)
- Cliente HTTP para o frontend (`frontend/api.js`)
- Frontend React conectado ao `frontend/api.js`, com login e cadastro de usuário e tela de
  resumo mensal (saldo, gasto total, renda)

### Corrigido
- Contraste de texto na tela de resumo do frontend, causado por CSS remanescente do template
  padrão do Vite que ficava ilegível quando o sistema/navegador preferia tema escuro

### Alterado
- Identificadores internos do código (variáveis, funções, classes, arquivos e chaves do JSON
  retornado pela API) traduzidos para inglês; interface, mensagens ao usuário e o schema do
  banco de dados continuam em português. As rotas da API também mudaram (ex.: `/lancamentos` →
  `/entries`, `/resumo/{mes}` → `/summary/{month}`, `/auth/eu` → `/auth/me`) e as variáveis de
  ambiente `SEGREDO_JWT`/`ORIGENS_PERMITIDAS` foram renomeadas para `JWT_SECRET`/
  `ALLOWED_ORIGENS` — quem tiver um `.env` local precisa atualizá-lo.

### Removido
-

<!--
## [0.1.0] - AAAA-MM-DD
### Adicionado
- ...
-->
