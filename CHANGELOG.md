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
-

### Removido
-

<!--
## [0.1.0] - AAAA-MM-DD
### Adicionado
- ...
-->
