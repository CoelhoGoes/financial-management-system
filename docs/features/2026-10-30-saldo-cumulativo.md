# Saldo cumulativo

- **Status:** concluído
- **Início:** 2026-10-30
- **Item do roadmap:** saldo cumulativo — o saldo positivo ou negativo de um mês passa para o
  seguinte
- **Entrada no CHANGELOG:** em `[Não lançado]` — Adicionado: "Histórico da renda mensal…";
  Alterado: "O saldo disponível passou a ser acumulado…"; Corrigido: "Quando o servidor recusa
  um campo, a tela diz em português o que corrigir…"

## O que a feature entrega (1)

Hoje cada mês começa do zero: o saldo de novembro é a renda de novembro menos o que sai em
novembro, e o que sobrou ou faltou em outubro some. Com esta feature, o saldo **acumula**: o que
sobrou num mês entra no seguinte, e o que faltou também — um mês negativo puxa os próximos para
baixo.

O resumo e a tela de lançamentos passam a mostrar o saldo acumulado em destaque, com o saldo do
próprio mês logo abaixo. O gráfico de tendência ganha duas linhas, uma para cada. Navegando para
meses futuros, o acumulado continua projetando: soma a renda de cada mês e desconta as parcelas
já comprometidas no cartão.

A renda mensal ganha histórico. Ao mudar a renda em Configurações, o usuário diz a partir de
qual mês o valor novo vale; os meses anteriores continuam com o valor antigo, então mudar a
renda deixa de reescrever o passado.

## Motivação (1)

Pedido do usuário em 29/10/2026, depois de confirmar que o saldo de cada mês é isolado
(`calculate_summary` em `service.py` só usa dados do próprio mês). Registrado no
`docs/roadmap.md`. O motivo de querer o saldo acumulado não foi detalhado além do próprio
pedido: "saldos positivos e negativos passam pro mês seguinte".

O histórico da renda veio como consequência, escolhido pelo usuário na etapa 1: sem ele, como a
renda é um valor único aplicado a todo mês (`docs/dominio.md` → Renda mensal), mudar a renda
reescreveria o acumulado de todos os meses passados.

## Casos de uso (1)

- **UC1 — Ver o saldo acumulado no resumo.** Quem: usuário logado. O quê: abre o resumo de um
  mês. Resultado: o saldo acumulado aparece em destaque — o acumulado do mês anterior mais o
  saldo deste mês — e o saldo do mês, calculado como hoje, aparece também, menor.
- **UC2 — O acumulado é sempre cumulativo.** Quem: usuário logado. O quê: olha o resumo de
  qualquer mês. Resultado: o acumulado é a soma dos saldos de **todos** os meses até o mês
  visto, sem exceção — todo mês traz o saldo dos anteriores, mesmo que seja zero ou negativo.
  Não existe caso em que um mês volta a ser isolado. Na prática, só contribuem os meses a
  partir do **mais antigo** entre o primeiro lançamento e a primeira renda registrada: antes
  disso não há renda nem lançamento, e cada mês soma zero. Por padrão a renda é registrada a
  partir do primeiro lançamento (UC5), então os dois coincidem; o usuário pode registrar a
  renda num mês anterior para começar a rastrear antes.
- **UC3 — Saldo negativo passa adiante.** Quem: usuário logado. O quê: um mês fecha negativo.
  Resultado: o acumulado dos meses seguintes começa com esse negativo descontado.
- **UC4 — Projeção nos meses futuros.** Quem: usuário logado. O quê: navega para um mês depois
  do atual. Resultado: o acumulado continua somando a renda de cada mês e descontando as
  parcelas já comprometidas, mês a mês, até o mês visto.
- **UC5 — Mudar a renda a partir de um mês.** Quem: usuário logado, em Configurações. O quê:
  informa uma renda nova e o mês a partir do qual ela vale — o campo vem preenchido com o mês
  atual (revisado na etapa 2; era o do primeiro lançamento), e o usuário pode trocar por
  qualquer mês, passado ou futuro (um aumento já combinado). Resultado: daquele mês em diante a renda é o valor novo; os meses
  anteriores continuam com o valor anterior. O saldo do mês e o acumulado se ajustam a partir
  do mês escolhido.
- **UC5b — Ver e apagar rendas registradas.** Quem: usuário logado, em Configurações. O quê:
  vê a lista das rendas registradas, cada uma com o mês a partir do qual vale, e apaga uma.
  Resultado: ao apagar, os meses que ela cobria voltam a usar a renda registrada antes dela
  (ou zero, se não houver).
- **UC6 — Gráfico de tendência com os dois saldos.** Quem: usuário logado, no resumo. O quê:
  olha o gráfico. Resultado: duas linhas — saldo acumulado (em destaque) e saldo do mês —, as
  duas na legenda e no tooltip.
- **UC7 — Lançamentos mostra o mesmo que o resumo.** Quem: usuário logado, na tela de
  lançamentos. O quê: olha o quadro de saldo. Resultado: acumulado em destaque e o saldo do mês
  embaixo, iguais aos do resumo do mesmo mês.
- **UC8 — Lançar num mês passado.** Quem: usuário logado. O quê: cria, edita ou exclui um
  lançamento num mês anterior ao visto. Resultado: o acumulado daquele mês e de todos os
  seguintes muda na hora; nada fica guardado desatualizado.
- **UC9 — Contas que já existem.** Quem: quem já usava o app antes da mudança. O quê: abre o
  resumo depois da atualização. Resultado: a renda que estava configurada passa a valer a
  partir do mês do primeiro lançamento da conta, então o saldo **do mês** de cada mês passado
  continua igual ao de antes; só o acumulado é novo. Conta sem lançamento: a renda passa a
  valer a partir do mês de criação da conta.

## Casos de falha (1)

- **F1 — Conta sem lançamento e sem renda.** Quando: nada foi lançado nem registrado.
  Esperado: continua cumulativo, como todo mês (UC2). Como nenhum mês tem renda nem
  lançamento, todos somam zero e o acumulado é zero. Sem lançamento mas com renda registrada,
  o acumulado vai somando a renda desde o mês dela.
- **F2 — Mês anterior ao primeiro lançamento e à primeira renda.** Quando: o usuário navega
  para trás além deles. Esperado: continua cumulativo; esses meses não têm nada, então o
  acumulado ali é zero (x + 0 = x, com x = 0).
- **F3 — Excluir o lançamento mais antigo.** Quando: o primeiro lançamento é apagado. Esperado:
  aquele mês deixa de contribuir e todo o acumulado dali em diante muda junto.
- **F4 — Importar um extrato antigo.** Quando: um OFX traz lançamentos de meses anteriores ao
  primeiro lançamento atual. Esperado: esses meses passam a contribuir para o acumulado. Nos
  meses sem renda registrada a renda é zero (decisão do usuário), então esses
  meses tendem a ficar negativos e puxam o acumulado para baixo — é o comportamento esperado,
  não um erro.
- **F5 — Mês da renda inválido.** Quando: o mês "a partir de" vem vazio ou fora do formato.
  Esperado: o servidor recusa com 422 e a tela mostra a mensagem, sem mudar a renda.
- **F6 — Duas rendas para o mesmo mês.** Quando: o usuário registra a renda duas vezes com o
  mesmo mês de início. Esperado: vale a última; não ficam duas.
- **F7 — Renda zero.** Quando: o usuário informa renda 0 a partir de um mês (parou de
  receber). Esperado: aceito; dali em diante não há renda somada.
- **F7b — Apagar a única renda registrada.** Quando: o usuário apaga a última renda que
  restava. Esperado: aceito; nenhum mês tem renda, e o acumulado passa a refletir só os
  lançamentos — continua cumulativo.
- **F8 — Renda negativa.** Quando: valor menor que zero. Esperado: recusado com 422, como hoje.
- **F9 — Sessão expirada ou API fora do ar.** Quando: ao abrir o resumo, lançamentos ou salvar
  a renda. Esperado: como hoje — 401 leva ao login; erro de rede aparece na tela.
- **F10 — Muitos meses de histórico.** Quando: anos de lançamentos. Esperado: o acumulado
  continua correto; o custo de recalcular tudo a cada tela é a dívida já registrada de carregar
  todos os lançamentos na memória (`docs/dominio.md` → Dívidas conhecidas).
- **F11 — Celular (375px).** Quando: resumo e lançamentos com os dois saldos; gráfico com duas
  linhas de saldo. Esperado: os dois valores cabem sem quebrar o layout; legenda e tooltip com
  cinco itens cabem no card.
- **F12 — Totais e categorias do mês.** Quando: qualquer mês. Esperado: gasto total, fatura,
  gastos à vista e categorias não mudam — só o saldo ganha a versão acumulada.

## Perguntas abertas (1)

Nenhuma. Respondidas na revisão:

- conta existente sem lançamento → a renda vale a partir do mês de criação da conta (UC9);
- renda antes do primeiro lançamento → os meses contribuem desde o mais antigo dos dois (UC2);
- conta sem lançamento ou sem renda → continua cumulativo; mês vazio soma zero, nunca vira
  mês isolado (UC2, F1, F2);
- "a partir de" no futuro → pode (UC5);
- histórico da renda → lista com opção de apagar (UC5b).

## Fora do escopo (1, revisado na 2)

- **Saldo inicial informado pelo usuário** (o saldo real da conta num mês de partida). Foi uma
  das opções da etapa 1; o usuário escolheu começar pelo primeiro lançamento.
- **Mudar fatura, gastos ou categorias.** Só o saldo muda.
- **Filtrar lançamentos no SQL.** Continua item próprio do roadmap; aqui só se registra o
  custo (F10).
- **Dia em que a renda cai** (ex.: último dia útil). Pedido na etapa 2; o usuário quer tratá-lo
  com mais foco, então virou o item seguinte do roadmap. Aqui a renda é só por mês e ano.

## Decisões (2)

### O histórico da renda vive numa tabela própria

**Escolhido:** tabela `rendas` (`usuario_id`, `mes` — data no dia 1 —, `valor`), única por
usuário e mês. A migração cria a renda das contas existentes (UC9) e remove
`usuarios.renda_mensal`.
**Alternativas:** manter `renda_mensal` como cópia da renda atual (duas fontes que podem
divergir e que ninguém lê); coluna JSON em `usuarios` (sem unicidade nem `Numeric` no banco).
**Custo aceito:** migração com dados que apaga uma coluna; o downgrade recria a coluna com a
renda mais recente, mas o histórico se perde.

### Rotas da renda identificadas pelo mês

**Escolhido:** `GET /incomes`, `PUT /incomes/{YYYY-MM}` (cria ou substitui) e
`DELETE /incomes/{YYYY-MM}`. O `PUT /auth/me` passa a receber só `closing_day`.
**Alternativas:** rotas por id (o `POST` repetido teria de virar substituição na mão, e o id
não significa nada para o usuário); renda dentro do `/auth/me` (sem rota para apagar,
misturando conta e finanças).
**Custo aceito:** o `PUT /auth/me` e o `UserOut` perdem `monthly_income` — contrato quebrado
para quem os usava (só o próprio frontend).

### `available_balance` passa a ser o acumulado

**Escolhido:** pedido do usuário: `available_balance` vira o saldo acumulado (o destaque) e o
campo novo `month_balance` guarda o saldo do mês, calculado como antes. `monthly_income` passa
a ser a renda daquele mês pelo histórico.
**Alternativas:** campo novo `accumulated_balance`, sem mudar o sentido de nenhum existente.
**Custo aceito:** um campo existente muda de significado sem mudar de nome; todo uso dele no
frontend precisa ser revisto na mesma mudança.

### "A partir de" vem com o mês atual

**Escolhido:** mês atual para toda conta (UC5 revisada). A migração das contas antigas (UC9)
continua usando o mês do primeiro lançamento.
**Alternativas:** mês do primeiro lançamento, como estava na UC5 — num aumento de salário o
padrão apontaria para o passado e um "Salvar" distraído reescreveria meses antigos.
**Custo aceito:** quem quiser rastrear o passado precisa trocar o mês na mão.

### Mês sem dia

**Escolhido:** a renda vale por mês e ano. O dia do pagamento virou o próximo item do roadmap.
**Custo aceito:** nenhum número depende do dia ainda; um saldo "até hoje" fica para lá.

### Seletor de mês: `input type="month"`

**Escolhido:** escolha do usuário — um campo nativo, ótimo no iPhone e no Chrome.
**Alternativas:** dois `NativeSelect` (mês e ano), funcionam igual em todo navegador; o
`MonthNav` (24 cliques para recuar dois anos).
**Custo aceito:** o Firefox desktop não tem seletor de mês e mostra uma caixa de texto onde se
digita `AAAA-MM`; o `pattern` do servidor (F5) recusa o que vier errado.

### Saldo do mês em azul no gráfico

**Escolhido:** o acumulado fica como o saldo está hoje (cor do texto, sólido, com pontos); o
saldo do mês ganha um token novo, `--chart-month-balance`, azul, sólido e sem pontos — como o
`--chart-income`, fora da paleta verde até a paleta nova.
**Alternativas:** a mesma cor tracejada (duas linhas tracejadas, a outra é a renda).
**Custo aceito:** mais um token próprio a reconciliar quando a paleta mudar.

### Renda em card próprio em Configurações

**Escolhido:** card "Renda mensal" com valor, mês e a lista das rendas (cada uma com apagar).
O card atual fica só com o dia de fechamento. Cada formulário salva o que mostra.
**Alternativas:** tudo no card atual — um "Salvar" chamando duas rotas pode dar certo numa e
falhar na outra.
**Custo aceito:** um card a mais na tela.

## Contratos alterados (2, confirmado na 6)

- **API:**
  - novas: `GET /incomes` → `[{month: "YYYY-MM", amount}]` em ordem de mês;
    `PUT /incomes/{month}` `{amount ≥ 0}` → a renda gravada (repetir substitui — F6);
    `DELETE /incomes/{month}` → 204, ou 404 se não houver renda naquele mês. Mês fora de
    `AAAA-MM` → 422 (F5); valor negativo → 422 (F8).
  - todo mês em rota ou query (`/entries`, `/summary`, `/trend`, `/incomes`) passa a aceitar
    só os anos de **1900 a 2199**; fora disso, 422 (revisão de segurança, etapa 5).
  - o valor da renda e do lançamento ganha teto igual ao da coluna, `Numeric(12,2)`
    (9.999.999.999,99): acima disso, 422 em vez do 500 do Postgres (etapa 5).
  - `Summary` (em `/summary/{month}` e `/trend`): `available_balance` vira o acumulado; campo
    novo `month_balance`; `monthly_income` é a renda do mês pelo histórico.
  - `/summary/{month}` passa a validar o mês (`AAAA-MM`, senão 422). Hoje aceita qualquer
    texto; com o acúmulo, um mês inválido faria a soma percorrer meses sem fim.
  - `PUT /auth/me` recebe só `closing_day`; `UserOut` perde `monthly_income`.
- **Schema:** tabela `rendas` (`id`, `usuario_id` FK com cascade, `mes` date, `valor`
  Numeric(12,2)), única em (`usuario_id`, `mes`). Coluna `usuarios.renda_mensal` removida.
  Migração: para cada conta com `renda_mensal > 0`, uma renda no mês do primeiro lançamento,
  ou no mês de criação da conta se não houver lançamento. Renda 0 não vira registro — sem
  registro a renda já é zero, e a lista não começa com uma linha "R$ 0,00".
- **Tipos do frontend:** `Income` novo; no `api.ts`, `incomes()`, `saveIncome(month, amount)`
  e `removeIncome(month)` (o plano dizia `listIncomes`/`deleteIncome`); `Summary` ganha `month_balance`; `User` e o corpo do
  `saveConfig` perdem `monthly_income`. Regenerar `api-schema.d.ts`.
- **Variáveis de ambiente:** nenhuma.

## Plano de implementação (2)

**Infra:** model `Income` em `models.py` (atributos em inglês sobre colunas em português),
relação com `User` em cascade; `User.monthly_income` sai. Migração Alembic nova (arquivo novo
em `alembic/versions/`, gerado pelo `--autogenerate` e completado com o passo de dados).

**Domínio (`service.py`):**
- `income_for(month, incomes)` — a renda com o maior mês de início ≤ `month`, ou zero.
- o cálculo do saldo do mês continua o mesmo, com a renda vinda do histórico;
- o acumulado soma o saldo do mês de cada mês desde o mais antigo entre o primeiro lançamento
  e a primeira renda até o mês pedido. Antes disso todo mês é zero, então começar ali é só
  atalho, não mudança de regra (UC2). Faturas e lançamentos são agrupados por mês uma vez e o
  acumulado é uma soma corrida, para o `/trend` de 12 meses não recalcular tudo 12 vezes.
- `calculate_summary` recebe o histórico da renda além de `user` (que segue dando o
  `closing_day`).

**API:** rotas de renda em `finance.py`, escopadas pelo `user.id` do JWT; `_all` ganha o
irmão que carrega as rendas do usuário; `/summary` e `/trend` passam as rendas ao domínio.
`UserConfig`/`UserOut` sem `monthly_income`; `Summary` com `month_balance`; `IncomeIn`/
`IncomeOut` em `schemas.py`.

**Frontend:**
- `api.ts`: `listIncomes`, `saveIncome(month, amount)`, `deleteIncome(month)`;
  `saveConfig(closingDay)`.
- `ConfigScreen`: card "Renda mensal" — valor, `input type="month"` com o mês atual, lista
  das rendas com apagar; card de configurações só com o dia de fechamento.
- `SummaryScreen` e `EntryScreen`: "Saldo disponível" (acumulado) em destaque e "Saldo do
  mês" abaixo, menor.
- `TrendChart`: série `month_balance` ("Saldo do mês", `--chart-month-balance`, sem pontos,
  `EdgeToEdgeCurve`); `available_balance` vira "Saldo acumulado". Token novo no `index.css`
  nos dois temas.

**Testes por caso:**
- `test_service.py`: UC1 (acumulado = anterior + mês), UC2/F1/F2 (meses vazios somam zero,
  conta vazia dá zero), UC3 (negativo passa adiante), UC4 (futuro soma renda e parcelas), UC5
  (renda muda a partir do mês), UC5b (apagar volta à anterior), UC8 (lançamento passado muda
  os seguintes), F3, F4, F7, F7b, F12 (totais e categorias iguais).
- `test_api.py`: UC5/UC5b/F5/F6/F8 nas rotas de renda, escopo por usuário (renda de outro
  usuário não aparece nem é apagável), `/summary` com mês inválido → 422, `PUT /auth/me` sem
  renda, UC6 (`/trend` traz os dois saldos), UC7 (mesmo `Summary` nas duas telas).
- `test_migrations.py`: UC9 — conta com lançamento, conta sem lançamento e conta com renda 0.
- frontend: `ConfigScreen` (UC5, UC5b, F5, F9), `SummaryScreen`/`EntryScreen` (UC1, UC7),
  `TrendChart` (UC6). F10 e F11 se conferem na tela.

**Arquivos novos:** só a migração.
**Dependências novas:** nenhuma.
## O que foi construído (6)

### Backend

- **Domínio:** `income_for` acha a renda de um mês no histórico. `calculate_summaries` monta
  as faturas e agrupa os lançamentos uma vez, e faz uma soma corrida do mais antigo entre o
  primeiro lançamento e a primeira renda até o último mês pedido; cada `Summary` sai com
  `month_balance` (o mês sozinho) e `available_balance` (o acumulado). `calculate_summary` é a
  chamada de um mês só. `month_start` converte `AAAA-MM` na data guardada na renda.
- **API:** rotas `/incomes` (listar, gravar ou substituir por mês, apagar), escopadas pelo
  usuário do JWT por `_income_at`. `/summary` e `/trend` passam o histórico ao domínio; o
  `/trend` calcula a série numa chamada só. O padrão `MONTH` limita o ano a 1900–2199.
  `PUT /auth/me` ficou só com o dia de fechamento.

### Frontend

- **Configurações:** card "Renda mensal" (valor, "a partir de" com o mês atual, lista das
  rendas com apagar) acima do card do dia de fechamento.
- **Resumo e Lançamentos:** "Saldo disponível" (acumulado) em destaque, "Saldo do mês"
  embaixo. O aviso de renda zero passou a dizer que nenhuma renda vale para o mês.
- **Erros:** `errorMessage` no `api.ts` transforma a lista de um 422 em frases em português,
  para toda tela (`api.test.ts`, arquivo novo aprovado na etapa 6).
- **Tendência:** linha azul "Saldo do mês" (token `--chart-month-balance`, nos dois temas); a
  do acumulado virou "Saldo acumulado". A legenda quebra em linhas.

### Infra / dados

- Tabela `rendas`, migração `580bb2fb1f8d`: cria a renda das contas existentes (UC9) e apaga
  `usuarios.renda_mensal`. O downgrade recria a coluna com a renda mais recente.

## Armadilhas (6)

### Sem validar o mês, o acumulado não termina

**Causa:** a soma anda mês a mês até o mês pedido. Antes desta feature, `/summary/{month}`
aceitava qualquer texto, e um texto que não é mês nunca seria alcançado; um ano válido mas
distante (0001, 9999) também deixava cada requisição ocupada uns 6 s.
**Como se manifesta:** requisição que não volta, ou volta em segundos, por um mês estranho.
**O que fazer:** todo mês que entra pela API passa pelo `MONTH` (1900–2199). Rota nova que
receba mês usa o mesmo padrão.

### Valor acima da coluna dava 500

**Causa:** `Decimal` no Pydantic sem `max_digits` aceita qualquer tamanho, e o Postgres recusa
o que não cabe em `Numeric(12,2)`. Já existia nos lançamentos; apareceu ao revisar a renda.
**Como se manifesta:** "Não deu para completar a operação" ao salvar um valor enorme.
**O que fazer:** campo de dinheiro de entrada leva `max_digits=12`, como a coluna.

### Todo 422 aparecia na tela como "[object Object]"

**Causa:** o `detail` de um 422 do FastAPI é uma lista de erros, não texto, e o `api.ts`
passava a lista direto para `new Error`. Já existia; apareceu porque o teto acima trocou um
500 (que mostrava a frase genérica) por um 422.
**Como se manifesta:** a mensagem de erro do formulário diz "[object Object]".
**O que fazer:** `errorMessage` no `api.ts` traduz cada erro pelo tipo e pelo campo. Campo
novo em formulário precisa do rótulo em `FIELD_LABELS`; o tipo de erro do Pydantic às vezes
não é o que o nome do limite sugere (`max_digits` responde `decimal_whole_digits`).

### Cinco itens não cabem na legenda a 375px

**Causa:** o `ChartLegendContent` do shadcn põe tudo numa linha só.
**Como se manifesta:** nomes cortados ou quebrados no meio, no celular.
**O que fazer:** o `className` com `flex-wrap` e `whitespace-nowrap` no `TrendChart`; uma
série nova no gráfico precisa ser conferida a 375px.

### Valor e mês lado a lado cortam o mês

**Causa:** o `input type="month"` mostra o mês por extenso ("outubro de 2026").
**Como se manifesta:** "outubro de 2…" no celular.
**O que fazer:** os campos ficam um por linha no card da renda.

### Dois "Salvar" simultâneos no mesmo mês dão 500

**Causa:** as duas requisições não acham a renda e tentam criar; a unicidade (`uq_renda_mes`)
barra a segunda. Só acontece dentro da mesma conta, e a renda fica gravada pela primeira.
**Como se manifesta:** mensagem de erro, mas a renda aparece salva ao recarregar.
**O que fazer:** nada por enquanto — o botão fica desativado enquanto salva. Aceito na
etapa 5.

## Como verificar (6)

1. `./dev.sh` (sobe a migração) e entre numa conta.
2. Configurações → "Renda mensal": registre 5000 a partir de um mês passado. A lista mostra a
   linha; registrar de novo no mesmo mês substitui o valor (F6); o lixo apaga (UC5b).
3. Resumo: "Saldo disponível" é o acumulado; "Saldo do mês" embaixo. Avance um mês: o
   acumulado novo é o anterior mais o saldo do mês novo, também em meses futuros (UC4).
4. Lance um gasto num mês passado: o acumulado daquele mês e de todos os seguintes cai (UC8).
5. Tendência: além das barras, as linhas do saldo acumulado, do saldo do mês (azul) e da
   renda (tracejada), as três na legenda e no tooltip (UC6).
6. A 375px, nos dois temas: legenda em linhas, campos da renda um por linha.
7. API: `curl` em `/summary/1899-12` ou `/incomes/2200-01` → 422; renda
   `{"amount":"10000000000.00"}` → 422.
8. Testes: `pytest` (com `TEST_DATABASE_URL` para incluir `test_migrations.py`, que cobre a
   migração das contas existentes) e `npm test`.
