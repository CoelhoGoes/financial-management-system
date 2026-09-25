# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o versionamento tenta seguir [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Importação de extrato bancário em OFX: a aba Importar lê o arquivo que você baixa do app
  do banco, mostra tudo que veio para você conferir e escolher categoria, e só grava depois
  que você confirma. Lançamento que já entrou numa importação anterior aparece marcado e
  fora da seleção, então reimportar o mesmo extrato não duplica nada. Fatura de cartão é
  recusada com o motivo: ela já é calculada a partir dos seus lançamentos no crédito
- Navegação entre meses na tela de resumo: as setas movem saldo, categorias e o gráfico de
  tendência juntos, então a tela inteira passa a mostrar o mesmo mês
- Gráfico de tendência na tela de resumo: barras empilhadas de gasto à vista e fatura mês a
  mês, linha do saldo disponível e uma referência da renda mensal, com recortes de 3, 6 ou
  12 meses
- Tela de configuração: define a renda mensal e o dia de fechamento da fatura pelo próprio
  app. Antes só dava para gravar esses valores chamando a API na mão, então toda conta nova
  ficava com renda zero e via um saldo que não batia
- Tela de resumo completa: além de renda, gasto e saldo, agora mostra entradas extras,
  gastos à vista e fatura do cartão separados, e o gasto de cada categoria com barra de
  proporção. Compras parceladas aparecem com o número da parcela (ex.: parcela 3/9)
- Limite de tentativas de login: após 5 senhas erradas para a mesma conta vindas da mesma
  origem, a API recusa novas tentativas por 15 minutos
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
- Botões do cabeçalho saíam da tela no celular: com a aba nova eles não cabiam mais numa
  linha só, e "Sair" e o acesso às configurações ficavam fora da área visível
- Dependências do backend atualizadas para fechar vulnerabilidades conhecidas (FastAPI,
  PyJWT e python-multipart): as falhas permitiam derrubar a API com requisições forjadas
  na tela de login, que responde sem autenticação
- Gráfico de tendência mostrava a janela de meses errada nas últimas horas do último dia
  do mês: o servidor usava o relógio do container (UTC) para descobrir o mês atual, e no
  horário de Brasília o mês já tinha virado lá antes de virar aqui
- Contraste de texto na tela de resumo do frontend, causado por CSS remanescente do template
  padrão do Vite que ficava ilegível quando o sistema/navegador preferia tema escuro

### Alterado
- A API também recusa subir com uma `JWT_SECRET` curta, não só quando ela falta. Abaixo de
  32 bytes o segredo é quebrável por força bruta, e quem o quebrasse forjaria a sessão de
  qualquer usuário. Quem usa um valor curto precisa gerar outro com `openssl rand -hex 32`
- Valores em dinheiro passam a usar o formato brasileiro em todas as telas, com separador
  de milhar e vírgula decimal (R$ 4.057,30 no lugar de R$ 4057.30)
- A API não sobe mais sem `JWT_SECRET` definida. Antes ela caía num valor padrão que está
  publicado no repositório — quem o conhecesse podia forjar a sessão de qualquer usuário, sem
  deixar rastro. Quem já tem um `.env` local precisa acrescentar a variável
- A mensagem de erro do cadastro não confirma mais se um e-mail já tem conta
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
