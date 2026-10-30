# Gráfico de tendência legível

- **Status:** concluído
- **Início:** 2026-10-29
- **Item do roadmap:** ajeitar o gráfico de tendência do Resumo
- **Entrada no CHANGELOG:** em `[Não lançado]`, Alterado: "O gráfico de tendência do resumo
  ganhou legenda, valores no eixo vertical e um ponto por mês na linha do saldo; o período (3,
  6 ou 12 meses) virou um seletor, e a linha da renda e os nomes dos meses ficaram legíveis no
  tema escuro"

## O que a feature entrega (1)

O gráfico de tendência do Resumo passa a se explicar sozinho. Uma legenda diz o que é cada
cor e cada linha: gasto à vista, fatura, saldo e renda. Hoje isso só aparece passando o mouse
por cima de uma coluna.

A escolha do período (3, 6 ou 12 meses) sai dos três botões soltos e vai para um menu de
seleção, que ocupa menos espaço no card.

No modo escuro, a linha tracejada da renda e os nomes dos meses embaixo das colunas ficam
legíveis: hoje são de um cinza que some no fundo. A linha do saldo ganha um ponto em cada mês,
para ver onde fica o valor de cada um, e o eixo vertical ganha faixas de valor, para ler a
ordem de grandeza de cada coluna sem passar o mouse.

## Motivação (1)

Pedido do usuário em 29/10/2026, ao fim do layout para desktop (item registrado em
`docs/roadmap.md` sem detalhe). Depois de ler a explicação do gráfico, o usuário apontou três
incômodos na leitura:

1. sem legenda, não dá para saber o que são as cores e a linha sem explicação prévia;
2. os três botões de período dispostos lado a lado não agradam;
3. o cinza da linha da renda e dos meses no eixo tem pouca visibilidade no modo escuro.

Logo depois, acrescentou um quarto: o gráfico de barras não tem valores no eixo vertical, e
pediu faixas de referência.

Sobre a cor: o usuário aceita sair da paleta atual se for preciso, porque pretende trazer uma
paleta nova depois.

Referências mandadas pelo usuário (exemplos do shadcn): "Bar Chart - Stacked + Legend",
"Line Chart - Dots" e "Dropdown Menu - Radio Group". Elas entram como insumo da etapa 2.

## Casos de uso (1)

- **UC1 — Entender o gráfico pela legenda.** Quem: usuário logado, no Resumo. O quê: olha o
  gráfico de tendência sem passar o mouse. Resultado: uma legenda nomeia os quatro elementos —
  À vista, Fatura, Saldo e Renda — cada um com a cor ou o traço que usa no gráfico. O rótulo
  "renda" escrito dentro do gráfico pode sair, já que a legenda o substitui.
- **UC2 — Trocar o período pelo menu.** Quem: usuário logado, no Resumo. O quê: abre o menu de
  período e escolhe 3, 6 ou 12 meses. Resultado: o gráfico mostra o novo período; o menu,
  fechado, mostra qual período está ativo. O padrão continua 6 meses.
- **UC3 — Ler a renda e os meses no modo escuro.** Quem: usuário logado com tema escuro (fixo
  ou seguindo o sistema). O quê: olha o gráfico. Resultado: a linha tracejada da renda e os
  nomes dos meses no eixo têm contraste suficiente para ler sem esforço. No modo claro
  continuam legíveis.
- **UC4 — Ver o saldo de cada mês na linha.** Quem: usuário logado, no Resumo. O quê: olha a
  linha do saldo. Resultado: há um ponto em cada mês; ao passar o mouse sobre um mês, o ponto
  daquele mês cresce, e o tooltip continua mostrando os valores.
- **UC5 — Ler a ordem de grandeza pelo eixo.** Quem: usuário logado, no Resumo. O quê: olha
  a altura de uma coluna. Resultado: o eixo vertical mostra faixas de valor em reais, com as
  linhas de grade alinhadas a elas e o mesmo contraste dos meses (UC3), e dá para estimar
  quanto foi gasto no mês sem o tooltip.
- **UC6 — O resto do gráfico não muda.** Quem: usuário logado. O quê: navega entre meses pelas
  setas do Resumo. Resultado: o gráfico continua terminando no mês da tela, com as mesmas
  barras empilhadas e o mesmo tooltip — nenhum número muda, só a apresentação.

## Casos de falha (1)

- **F1 — Renda zero ou não informada.** Quando: o usuário não preencheu a renda mensal. Hoje a
  linha tracejada nem é desenhada. Esperado (confirmado pelo usuário na revisão): o item "Renda" também sai
  da legenda, para a legenda não nomear algo que não está no gráfico.
- **F2 — Erro ao buscar a tendência.** Quando: a API falha. Esperado: como hoje, a mensagem de
  erro aparece no card; o menu de período continua utilizável para tentar outro período.
- **F3 — Trocar de período rápido.** Quando: o usuário escolhe 12 e logo depois 3, e as
  respostas chegam fora de ordem. Esperado: o gráfico mostra o último período escolhido, nunca
  o anterior — a guarda que já existe continua valendo.
- **F4 — Carregando.** Quando: a primeira resposta ainda não chegou. Esperado: como hoje,
  "Carregando…" até chegar, com o seletor já mostrando o período. Ao trocar de período depois
  disso, o gráfico anterior fica na tela até o novo chegar — também como hoje. *Corrigido na
  etapa 3: a versão da etapa 1 dizia "Carregando…" a cada troca, o que não é o comportamento
  atual.*
- **F5 — Celular, tela estreita.** Quando: 375px de largura, 12 meses. Esperado: a legenda
  quebra em mais de uma linha sem sair do card nem criar rolagem horizontal; o menu abre
  dentro da tela; os nomes dos meses não se sobrepõem.
- **F6 — Teclado e leitor de tela.** Quando: o usuário navega por Tab. Esperado: o menu abre e
  troca de opção pelo teclado; o leitor de tela anuncia o período escolhido. Hoje os botões
  usam `aria-pressed` — o menu não pode perder essa informação.
- **F7 — Troca de tema com o gráfico aberto.** Quando: o sistema muda de claro para escuro (ou
  o usuário troca em Configurações). Esperado: as cores novas da renda e dos meses acompanham
  o tema sem recarregar a página.
- **F8 — Mês sem lançamentos.** Quando: um ou mais meses do período não têm gasto. Esperado:
  como hoje, coluna vazia; o ponto do saldo aparece mesmo assim, porque o saldo existe.
- **F9 — Valores grandes no eixo, tela estreita.** Quando: gastos na casa dos milhares num
  celular de 375px. Esperado: os rótulos do eixo cabem sem cortar nem empurrar as colunas para
  fora do card; o formato abreviado ou não é decisão da etapa 2.
- **F10 — Renda bem acima dos gastos.** Quando: a renda é muito maior que qualquer coluna. Hoje
  a escala já vai até a renda, para a linha tracejada aparecer. Esperado: as faixas do eixo
  cobrem até a renda também, sem a linha ficar fora da escala.

## Perguntas abertas (1)

Nenhuma. A do F1 (o item "Renda" some da legenda com renda zero) foi confirmada na revisão.

## Fora do escopo (1, revisado na 2)

- **Paleta nova.** O usuário pretende trazer uma paleta depois. Aqui só muda o necessário para
  o contraste da renda e dos meses.
- **Altura do card e posição da linha do saldo sobre as barras.** Levantados na explicação,
  mas o usuário não os apontou como incômodo.
- **Faixas novas de período.** Continuam 3, 6 e 12 meses.
- **Qualquer mudança no backend.** `/trend` já devolve tudo o que o gráfico usa.
- **O botão com menu da referência.** O usuário escolheu o `NativeSelect` na etapa 2.

## Decisões (2)

### A renda vira uma série tracejada, e a legenda é a do shadcn

**Escolhido:** `ChartLegend` + `ChartLegendContent` do `ui/chart.tsx`, como na referência
"Bar Chart - Stacked + Legend". A renda deixa de ser `ReferenceLine` e vira uma `Line`
tracejada com o valor da renda em cada mês. Assim entra na legenda sozinha e, quando a renda é
zero, a linha não é desenhada e o item some (F1). Os ícones de linha (saldo) e de linha
tracejada (renda) vêm do `icon` de cada item do `ChartConfig`; as barras ficam com o
quadradinho padrão.
**Alternativas:** legenda própria com `ChartSwatch`, como a da rosca, mantendo a
`ReferenceLine` — foge do componente do shadcn, e o F1 vira uma condição à parte. Injetar o
item da renda na legenda do shadcn não dá: o `Legend` do recharts 3.8 não aceita `payload`
(conferido em `node_modules/recharts/types/component/Legend.d.ts`).
**Custo aceito:** o tooltip passa a mostrar também "Renda R$ 6.500,00" em todo mês. O valor é
o mesmo em todos — `monthly_income` vem da configuração do usuário, não do mês
(`service.py:129`) —, então nenhum número muda em relação à linha de hoje.

### O período vira um NativeSelect

**Escolhido:** `NativeSelect` (já instalado) com 3, 6 e 12 meses, padrão 6, e rótulo
acessível "Período".
**Alternativas:** `DropdownMenu` em modo radio (a referência mandada; componente novo, sem
dependência de runtime nova — conferido no registro do shadcn) e o `Select` do Base UI
(popup estilizado, também componente novo).
**Custo aceito:** visual de campo de formulário em vez do botão com menu da referência. Em
troca, segue a convenção das regras para escolha fechada, abre o seletor nativo no celular
(F5) e o leitor de tela anuncia o valor sem trabalho extra (F6).

### A renda ganha um token âmbar fora da paleta

**Escolhido:** token novo `--chart-income` em `:root` e `.dark` no `index.css`, num âmbar com
contraste alto nos dois temas. É a cor da linha tracejada e do ícone dela na legenda.
**Alternativas:** `--foreground` tracejado — contraste máximo sem token novo, mas a mesma cor
do saldo, e só o tracejado diferenciaria as duas linhas.
**Custo aceito:** uma cor fora da rampa verde até a paleta nova. Fica isolada num token, para
a paleta nova trocar num lugar só.

### Eixos em --foreground; valores do eixo vertical inteiros

**Escolhido:** os nomes dos meses e os valores do eixo vertical passam do cinza
(`--muted-foreground`) para `--foreground`. O eixo vertical aparece com valores inteiros,
`2.000`, `4.000`, por um helper novo em `shared/format.ts` (as regras proíbem formatar número
dentro da tela).
**Alternativas:** compacto (`2 mil`) e compacto com moeda (`R$ 2 mil`).
**Custo aceito:** os rótulos inteiros ocupam mais largura e tiram espaço das colunas no
celular (F9) — conferir em 375px na etapa 3.

### Sem decisão real

- **Pontos na linha do saldo (UC4):** `dot` e `activeDot` da `Line`, como na referência "Line
  Chart - Dots".
- **Faixas do eixo até a renda (F10):** já é o domínio do `YAxis` de hoje; com a renda como
  série, o recharts inclui o valor dela na escala sozinho.

## Contratos alterados (2, confirmado na 6)

- **API:** nenhuma.
- **Schema:** nenhum.
- **Tipos do frontend:** nenhum.
- **Variáveis de ambiente:** nenhuma.
- **Dependências:** nenhuma. Nenhum componente shadcn novo.
- **Token CSS novo:** `--chart-income`.
- **Confirmado na etapa 6:** API, schema, tipos, variáveis e dependências não mudaram. Fora do
  plano da etapa 2, só no frontend: dois arquivos novos, `LineIcon.tsx` e
  `EdgeToEdgeCurve.tsx` (revisão estrutural, aprovados), e a prop opcional `marker` no
  `ChartTooltipRow` (revisão na etapa 3).

## Plano de implementação (2)

Tudo no frontend, sem arquivo novo.

- **`shared/format.ts`** — helper de valor inteiro em reais (`2.000`), com teste em
  `format.test.ts` (UC5, F9).
- **`index.css`** — `--chart-income` nos dois temas.
- **`TrendChart.tsx`**:
  - `NativeSelect` no lugar dos três botões (UC2);
  - renda como `Line` tracejada em `--chart-income`, só quando maior que zero (UC1, F1);
  - `ChartLegend` + `ChartLegendContent`, com ícones de linha e linha tracejada (UC1);
  - pontos na linha do saldo (UC4);
  - `YAxis` visível com o helper novo (UC5), domínio como hoje (F10);
  - rótulos dos dois eixos em `--foreground` (UC3).

**Testes** (`TrendChart.test.tsx`, que já cobre padrão, troca, ativo e erro):

- UC2 — escolher 12 no seletor refaz a busca com 12; o seletor começa em 6; os testes dos
  botões passam a usar o seletor.
- F2 — o seletor continua habilitado depois do erro.
- F3 — duas trocas seguidas: a resposta da primeira, chegando por último, não sobrescreve.
- F4 — "Carregando…" com o seletor já no período novo.
- F6 — o seletor tem nome acessível "Período".
- UC5/F9 — helper do eixo em `format.test.ts`.
- UC1, F1, UC3, UC4, F5, F7, F8, F10 — no navegador: o recharts não desenha no jsdom (armadilha
  registrada no layout para desktop), então legenda, pontos, cores e eixo se conferem na tela,
  nos dois temas, em 375px e 1440px, com renda zero e com renda alta.
- UC6 — os testes existentes do Resumo continuam passando.
## Desvios na implementação (3)

- **Cor dos eixos por `tick={{ fill }}`, não por classe.** O plano era sobrescrever a classe do
  `ChartContainer`. Na tela, os rótulos continuavam no cinza `#666`: o seletor do shadcn
  (`.recharts-cartesian-axis-tick text`) não casa com o recharts 3.8, cujo texto é
  `.recharts-cartesian-axis-tick-value`. Ou seja, o cinza de hoje nem era o
  `--muted-foreground` do tema, e sim o padrão do recharts. Resolvido com `tick` em cada eixo.
- **Ordem da legenda.** O `Legend` do recharts ordena por nome por padrão, e saía "Saldo, À
  vista, Renda, Fatura". `itemSorter={null}` faz seguir a ordem das séries: À vista, Fatura,
  Saldo, Renda.
- **Altura de `h-56` para `h-64`.** A legenda ocupa espaço dentro do `ChartContainer`; sem
  isso a área das colunas encolhia.
- **Domínio do eixo vertical.** O domínio manual (que existia para a `ReferenceLine` caber)
  saiu: com a renda como série, o recharts já inclui o valor dela na escala (F10).

### Revisão na etapa 3, a pedido do usuário

- **Linhas de ponta a ponta.** O usuário pediu que a renda e o saldo atravessem o gráfico
  inteiro, não só de um ponto ao outro. As duas `Line` usam um `shape` próprio
  (`EdgeToEdgeCurve`, no `TrendChart.tsx`) que estica a curva até as bordas da área do gráfico
  (`usePlotArea` do recharts), repetindo o primeiro e o último valor. Para a renda, constante,
  é exato; para o saldo, as pontas são só continuação visual do primeiro e do último mês.
- **Legenda repetida no tooltip, como na rosca.** Cada linha do tooltip mostra o mesmo
  marcador da legenda: quadradinho para as barras, traço contínuo para o saldo, tracejado para
  a renda. O `ChartTooltipRow` ganhou a prop opcional `marker`, que substitui o quadradinho
  quando vem.

## Revisão estrutural (4)

Um achado: `LineIcon` e `EdgeToEdgeCurve` nasceram dentro do `TrendChart.tsx`. Movidos para
arquivos próprios em `presentation/components/` com aprovação do usuário, seguindo a
preferência de um componente por arquivo. Os dois só são importados pelo `TrendChart`, então o
recharts continua fora do pacote principal (conferido no build).

## Revisão de segurança (5)

Nenhum achado. Nenhuma dependência mudou; `pip-audit`, `npm audit` e `npm audit --omit=dev`
sem vulnerabilidades. As chaves do `ChartConfig` do gráfico são fixas no código
(`cash_expenses`, `invoice`, `available_balance`, `income`), então o `<style>` que o
`ChartStyle` monta não recebe dado da API — a armadilha registrada no layout para desktop não
se aplica. Backend, contrato e `api.ts` intocados.

## O que foi construído (6)

### Backend

Nada.

### Frontend

- **`TrendChart`** — o período virou um `NativeSelect` ("Período", 3/6/12, padrão 6). A
  renda deixou de ser `ReferenceLine` e é uma série tracejada em `--chart-income`, desenhada
  só com renda maior que zero; com isso entra na legenda e no tooltip. A legenda é a do
  shadcn, na ordem das séries. O eixo vertical aparece com reais inteiros, e os rótulos dos
  dois eixos usam `--foreground`. O saldo tem um ponto por mês.
- **`EdgeToEdgeCurve`** — `shape` das duas linhas: estica a curva até as bordas da área do
  gráfico, repetindo o primeiro e o último valor.
- **`LineIcon`** — o traço (contínuo ou tracejado) que marca as séries de linha na legenda e
  no tooltip.
- **`ChartTooltipRow`** — prop opcional `marker`, que substitui o quadradinho de cor; o tooltip
  do gráfico repete os marcadores da legenda, como o da rosca.
- **`shared/format.ts`** — `formatCurrencyInteger()`, reais sem centavos para o eixo.
- **`index.css`** — token `--chart-income`, âmbar nos dois temas, provisório até a paleta nova.

### Infra / dados

Nada.

## Armadilhas (6)

### O cinza dos eixos é do recharts, não do tema

**Causa:** o `ChartContainer` do shadcn pinta os rótulos com
`[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`, mas no recharts 3.8 o texto
do rótulo tem a classe `recharts-cartesian-axis-tick-value` e o seletor não casa.
**Como se manifesta:** os rótulos saem no `#666` fixo do recharts nos dois temas, e uma classe
no `ChartContainer` para trocar a cor não tem efeito nenhum.
**O que fazer:** cor do rótulo pela prop `tick={{ fill: 'var(--…)' }}` de cada eixo. Vale
para qualquer gráfico novo, inclusive a rosca se ganhar eixo.

### Item avulso na legenda do shadcn não existe

**Causa:** o `Legend` do recharts 3.8 não aceita `payload`; a legenda só lista séries.
**Como se manifesta:** uma `ReferenceLine` (ou qualquer marca que não seja série) nunca aparece
na legenda.
**O que fazer:** o que precisa estar na legenda vira série — aqui a renda é uma `Line` de valor
constante. O ícone de cada item vem do `icon` no `ChartConfig`.

### Legenda em ordem alfabética

**Causa:** o `itemSorter` padrão do `Legend` ordena por nome.
**Como se manifesta:** a ordem da legenda não segue a do gráfico ("Saldo, À vista, Renda,
Fatura").
**O que fazer:** `itemSorter={null}` e declarar as séries na ordem desejada.

### Linhas param no centro da primeira e da última coluna

**Causa:** num eixo de categorias, o recharts põe cada ponto no centro da faixa do mês.
**Como se manifesta:** linhas constantes, como a renda, parecem curtas, sem chegar às bordas.
**O que fazer:** `shape={<EdgeToEdgeCurve />}`, que usa `usePlotArea` para esticar a curva.
Uma `ReferenceLine` também atravessa tudo, mas cai na armadilha da legenda acima.

## Como verificar (6)

1. `./dev.sh`, entrar com uma conta com gastos em vários meses e renda mensal preenchida.
2. **Resumo, tema escuro:** o gráfico de tendência mostra a legenda À vista, Fatura, Saldo,
   Renda; o eixo vertical tem valores como `2.000`, `4.000`; os meses e os valores são
   brancos; a renda é uma linha tracejada âmbar que vai de uma borda à outra, como o saldo.
3. **Hover numa coluna:** o tooltip mostra os quatro valores, cada um com o marcador da
   legenda; o ponto do saldo daquele mês cresce.
4. **Seletor "Período":** trocar para 12 meses refaz o gráfico; o seletor mostra "12 meses".
5. **Renda zero** (Configurações → renda 0): a linha âmbar e o item "Renda" somem.
6. **Celular (375px), tema claro, 12 meses:** sem rolagem horizontal, legenda dentro do card,
   meses sem sobreposição (o recharts esconde os que não cabem).
7. Testes: `cd frontend && npm test` (114), `npm run build`, `npm run lint`.
