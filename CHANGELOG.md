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
- Tela de lançamentos no frontend: criar, listar e excluir gastos/entradas do mês corrente,
  com saldo disponível atualizado a cada ação
- Tela de fatura no frontend: consulta a fatura do cartão de crédito por mês, com navegação
  entre meses e lista das parcelas que vencem no período

### Corrigido
- Dependências do backend atualizadas para fechar vulnerabilidades conhecidas (FastAPI,
  PyJWT e python-multipart): as falhas permitiam derrubar a API com requisições forjadas
  na tela de login, que responde sem autenticação
- Gráfico de tendência mostrava a janela de meses errada nas últimas horas do último dia
  do mês: o servidor usava o relógio do container (UTC) para descobrir o mês atual, e no
  horário de Brasília o mês já tinha virado lá antes de virar aqui
- Contraste de texto na tela de resumo do frontend, causado por CSS remanescente do template
  padrão do Vite que ficava ilegível quando o sistema/navegador preferia tema escuro

### Alterado
- Cabeçalho de navegação (e-mail do usuário, links entre telas e sair) unificado num componente
  só, com ícones do remixicon, usado nas telas de resumo, lançamentos e fatura
- Identificadores internos do código (variáveis, funções, classes, arquivos e chaves do JSON
  retornado pela API) traduzidos para inglês; interface, mensagens ao usuário e o schema do
  banco de dados continuam em português. As rotas da API também mudaram (ex.: `/lancamentos` →
  `/entries`, `/resumo/{mes}` → `/summary/{month}`, `/auth/eu` → `/auth/me`) e as variáveis de
  ambiente `SEGREDO_JWT`/`ORIGENS_PERMITIDAS` foram renomeadas para `JWT_SECRET`/
  `ALLOWED_ORIGINS` — quem tiver um `.env` local precisa atualizá-lo.
- Componentes `Button`, `Input`, `Label` e `Card` do shadcn/ui instalados e usados no lugar dos
  elementos HTML nativos em `App.tsx` (login, cadastro e tela de resumo), com rótulos
  acessíveis adicionados aos campos de e-mail e senha
- Navegação do frontend passou a usar `react-router` (rotas `/login`, `/` e `/lancamentos`) no
  lugar da troca manual de tela; `App.tsx` foi dividido em `src/pages/`

### Removido
-

<!--
## [0.1.0] - AAAA-MM-DD
### Adicionado
- ...
-->
