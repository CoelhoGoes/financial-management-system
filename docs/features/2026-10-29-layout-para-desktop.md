# Layout para desktop

- **Status:** concluído
- **Início:** 2026-10-29
- **Item do roadmap:** layout responsivo para desktop — organizar os blocos em grade em telas
  largas, sem quebrar a coluna única do celular
- **Entrada no CHANGELOG:** em `[Não lançado]` — Adicionado: "No resumo, clicar numa
  categoria (na legenda ou na fatia do gráfico) abre uma janela com as transações daquela
  categoria no mês"; Alterado: as telas no computador usam a largura em colunas, a navegação
  virou barra fixa no topo, e o gasto por categoria virou gráfico de rosca

## O que a feature entrega (1)

Hoje, num monitor de computador, todas as telas do app aparecem como uma coluna estreita no
meio, com a maior parte da tela vazia dos lados. No Resumo, para ver a tendência é preciso
rolar a página inteira, passando pelo resumo e por todas as categorias, mesmo com espaço de
sobra ao lado.

Depois desta feature, numa tela larga os blocos de cada tela se distribuem lado a lado: no
Resumo, por exemplo, dá para ver o saldo, as categorias e a tendência com pouca ou nenhuma
rolagem. Em Lançamentos, o formulário e a lista do mês ficam visíveis ao mesmo tempo. Fatura e
Importar ganham largura para as tabelas respirarem.

No celular nada muda: continua uma coluna só, na mesma ordem de hoje.

## Motivação (1)

Pedido do usuário em 29/10/2026, com um print do Resumo num monitor 1920px mostrando a coluna
estreita e o espaço vazio. O objetivo declarado é aproveitar o espaço disponível na tela maior.
O item foi posto em primeiro na fila de **Próximo** do roadmap; o motivo da prioridade não foi
informado.

Estado atual, pelo código: cada tela é um `flex-col` centralizado e cada uma tem uma largura
máxima própria — Lançamentos `max-w-sm`, Resumo e Configurações `max-w-md`, Importar `max-w-lg`,
Fatura `max-w-2xl`. O cabeçalho acompanha a largura de cada tela, então ele também muda de
tamanho ao trocar de aba.

## Casos de uso (1)

- **UC1 — Ver o resumo do mês sem rolar.** Quem: usuário logado, no computador. O quê: abre o
  Resumo. Resultado: resumo do mês, categorias e tendência aparecem distribuídos pela largura
  da tela, em vez de empilhados numa coluna.
- **UC2 — Lançar e conferir ao mesmo tempo.** Quem: usuário logado, no computador. O quê:
  preenche um lançamento em Lançamentos. Resultado: o formulário e a lista do mês ficam
  visíveis lado a lado; ao salvar, o novo item aparece na lista sem precisar rolar até ela.
- **UC3 — Editar um lançamento da lista.** Quem: usuário logado, no computador. O quê: clica
  para editar um item da lista. Resultado: o formulário, ao lado, passa a mostrar o item em
  edição — sem a página pular para o topo para mostrá-lo.
- **UC4 — Configurações em grade.** Quem: usuário logado, no computador. O quê: abre
  Configurações. Resultado: os blocos (dados, aparência, excluir conta) se distribuem pela
  largura em vez de empilhados.
- **UC5 — Fatura e Importar mais largas.** Quem: usuário logado, no computador. O quê: abre a
  Fatura ou confere um extrato em Importar. Resultado: a tabela/lista ocupa uma largura maior,
  com descrições longas menos cortadas ou quebradas.
- **UC6 — Navegação consistente entre telas.** Quem: usuário logado, no computador. O quê:
  troca de aba. Resultado: o cabeçalho fica na mesma posição e largura em todas as telas, em
  vez de encolher e esticar conforme a tela.
- **UC7 — Celular em uma coluna.** Quem: usuário logado, no celular. O quê: usa qualquer tela.
  Resultado: o conteúdo continua numa coluna só, na mesma ordem de hoje. A navegação muda:
  passa a ser a mesma barra do desktop, em duas linhas (revisado na etapa 2).

## Casos de falha (1)

- **F1 — Largura intermediária (tablet, janela redimensionada).** Quando: a janela fica entre
  celular e desktop, ou é redimensionada com a tela aberta. Esperado: o layout passa de uma
  para várias colunas sem sobreposição, corte de conteúdo nem rolagem horizontal.
- **F2 — Tela muito larga (ultrawide, 2560px+).** Quando: o monitor é bem mais largo que 1920px.
  Esperado: o conteúdo não se estica até as bordas a ponto de linhas e valores ficarem longe
  demais para ler; há um limite de largura.
- **F3 — iPhone deitado.** Quando: o celular é girado para paisagem (largura perto de 850px).
  Esperado: continua legível e usável — o teclado aberto num formulário não pode esconder o
  campo em foco atrás de outra coluna.
- **F4 — Colunas desequilibradas.** Quando: um bloco é muito mais alto que o vizinho (muitas
  categorias, mês com dezenas de lançamentos). Esperado: o bloco curto não fica esticado com
  um vazio grande dentro dele, e o longo não empurra o resto para fora de vista sem motivo.
- **F5 — Blocos que aparecem depois.** Quando: o Resumo ainda está carregando, deu erro, ou
  aparece o aviso de renda mensal não informada. Esperado: a mensagem de carregando/erro e o
  aviso continuam visíveis e num lugar que faça sentido na grade, sem a página "pular" de forma
  confusa quando os dados chegam.
- **F6 — Gráfico de tendência muda de largura.** Quando: o bloco da tendência fica mais largo
  ou mais estreito (troca de layout ou janela redimensionada). Esperado: o gráfico acompanha a
  largura do bloco, sem ficar cortado nem com tamanho antigo.
- **F7 — Ordem de leitura e teclado.** Quando: alguém navega com Tab ou com leitor de tela num
  layout em colunas. Esperado: a ordem continua lógica (a mesma do celular), e não pula de um
  lado para o outro da tela.
- **F8 — Zoom do navegador.** Quando: o usuário aumenta o zoom (150%, 200%). Esperado: o layout
  cai para menos colunas como numa tela mais estreita, sem conteúdo cortado.

Não se aplicam: entrada inválida, sessão, recurso de outro usuário, ação repetida e API fora
do ar — a feature só reorganiza blocos que já existem; as mensagens desses casos continuam as
de hoje, cobertas em F5 quanto à posição.

## Perguntas abertas (1)

Nenhuma — a da navegação foi fechada na etapa 2 (ver Decisões).

## Fora do escopo (1, revisado na 2)

- **Tela de login.** Não entrou na lista de telas escolhida pelo usuário; é um formulário
  pequeno e centralizado, e não tem a navbar. Confirmado na revisão da etapa 1.
- **Conteúdo novo.** Nenhum bloco, número ou gráfico novo — só a disposição dos que existem.
  *Revisto na etapa 3 a pedido do usuário:* "Por categoria" virou rosca com popup (ver
  Desvios).
- **Backend e contrato de API.** Nada muda no servidor.
- **Barra lateral (`Sidebar` do shadcn).** Considerada para a navegação e descartada na etapa 2:
  traria uns 6 arquivos novos e a pasta `hooks/`.

## Decisões (2)

### A navegação vira uma navbar de ponta a ponta, fixa no topo

**Escolhido:** o `Header` passa a ser uma barra que ocupa a largura toda da janela, com borda
embaixo e `sticky` ao rolar. À esquerda o nome do app ("Gestão Financeira") e as quatro abas
— **todas visíveis**, a ativa destacada e marcada com `aria-current="page"` (hoje a aba ativa
some). À direita o e-mail, a engrenagem e "Sair". No celular (abaixo de `md`): duas linhas —
nome do app + engrenagem + Sair em cima, as quatro abas só com ícone embaixo (rótulo
acessível por `aria-label`); o e-mail some.
**Alternativas:** manter os botões soltos de hoje só com largura fixa (o usuário quis a
aparência de uma barra convencional); abas no estilo tabs dentro do conteúdo; barra inferior
de app; `Sidebar` do shadcn (sem dependência de runtime, conferido com `npx shadcn view
sidebar`, mas ~6 arquivos novos e duas navegações para manter); manter o `Header` atual no
celular (UC7 intacto, ao custo de duas aparências no mesmo componente).
**Custo aceito:** o celular muda (UC7 revisado); abas só com ícone exigem reconhecer o ícone;
a barra fixa ocupa altura permanente da tela.

### Colunas a partir de `md` (768px), conteúdo limitado a 1152px

**Escolhido:** breakpoint `md` do Tailwind para passar a várias colunas; o conteúdo fica em
`max-w-6xl` (1152px), centralizado.
**Alternativas:** `lg` (1024px), que manteria o iPhone deitado e o tablet em pé em coluna
única; `max-w-7xl` (1280px).
**Custo aceito:** o iPhone deitado (~850px) também mostra duas colunas estreitas, com o
teclado tomando metade da altura — F3 vai ser conferido nessa largura especificamente.

### Um componente de página compartilhado

**Escolhido:** arquivo novo `presentation/components/Page.tsx`, com o invólucro da tela, a
navbar e o contêiner de largura máxima. As cinco telas autenticadas passam a usá-lo, e cada
uma monta a própria grade dentro dele.
**Alternativas:** repetir as mesmas classes nas cinco telas, como hoje.
**Custo aceito:** um arquivo novo.

### Disposição de cada tela no desktop

**Escolhido:**
- **Resumo:** duas colunas — resumo e tendência empilhados à esquerda, categorias à direita
  ocupando as duas linhas. Carregando, erro e o aviso de renda ficam acima, em largura total.
- **Lançamentos:** à esquerda saldo + formulário, `sticky` abaixo da navbar; à direita, mais
  larga, a lista do mês.
- **Configurações:** dados à esquerda; aparência e excluir conta empilhados à direita.
- **Fatura e Importar:** um bloco só, limitado a `max-w-3xl` (768px) e centralizado.
  Revisto pelo usuário em 29/10/2026, depois de ver na tela: na largura total o bloco ficava
  esticado demais (o campo de arquivo ocupava 1600px).

A ordem no HTML continua a de hoje em todas as telas — a posição em colunas vem de
`grid`/`col-start`/`row-span`, não de reordenar elementos. Assim o celular mantém a ordem
(UC7) e o leitor de tela também (F7).
**Alternativas:** no Resumo, resumo | tendência com categorias embaixo, ou três colunas; em
Lançamentos, form sem `sticky`; em Configurações, grade de 2 em fluxo; Fatura e Importar mais
estreitas e centralizadas.
**Custo aceito:** no Resumo, o Tab passa pelas categorias (direita) antes da tendência
(esquerda) — F7 só parcialmente atendido. Em Lançamentos, com a janela baixa, um formulário
mais alto que a tela não rola junto. Em Fatura, valor e descrição ficam mais distantes.

## Contratos alterados (2, confirmado na 6)

- **API:** nenhum.
- **Schema:** nenhum.
- **Tipos do frontend:** nenhum.
- **Variáveis de ambiente:** nenhuma.
- **Dependências:** nenhuma.
- **Confirmado na etapa 6:** nada disso mudou. O que mudou fora do plano da etapa 2 foi só no
  frontend: componente shadcn `Dialog` (`ui/dialog.tsx`, sem dependência de runtime nova), o
  token CSS `--header-height` em `index.css`, e os arquivos novos `CategoryDonut.tsx`,
  `ChartSwatch.tsx` e `ChartTooltipRow.tsx`.

## Plano de implementação (2)

Só `frontend/src/presentation/` muda.

- **`components/Header.tsx`** — vira a navbar: nome do app, as quatro abas sempre visíveis
  (`aria-current="page"` e variante preenchida na ativa), e-mail só a partir de `md`, abas só
  com ícone abaixo de `md`, `sticky top-0` com fundo e borda dos tokens semânticos. O `<title>`
  continua aqui. A prop `className` some, porque a largura passa a ser da página.
- **`components/Page.tsx`** (novo, aprovado) — `Header` + `<main>` com `mx-auto w-full
  max-w-6xl` e o espaçamento atual. Recebe `active` e `children`.
- **Telas** (`SummaryScreen`, `EntryScreen`, `ConfigScreen`, `InvoiceScreen`, `ImportScreen`)
  — trocam o invólucro próprio e o `max-w-*` de cada card por `Page`, e montam a grade da
  decisão acima com `md:grid`. `LoginScreen` não muda.

Testes (vitest/jsdom não calcula layout, então o que é visual vai para a verificação na tela):

| Caso | Como é coberto |
|---|---|
| UC6 | `components/Header.test.tsx` (novo): as quatro abas aparecem, a ativa tem `aria-current="page"`, cada aba navega para sua rota, o ícone sozinho tem nome acessível |
| UC7, F7 | testes das telas: a ordem dos blocos no DOM é a de hoje (Resumo: resumo → categorias → tendência; Lançamentos: saldo → form → lista; Configurações: dados → aparência → excluir) |
| UC3 | `EntryScreen.test.tsx`: editar continua levando o foco ao campo de descrição |
| F5 | `SummaryScreen.test.tsx`: erro e aviso de renda continuam renderizados com o resumo |
| UC1, UC2, UC4, UC5, F1–F4, F6, F8 | na tela, no navegador do app: 375px, ~850px (iPhone deitado), 1024px, 1920px, 2560px e zoom de 200% |

Os testes de tela existentes que dependem da aba ativa estar ausente, se houver, são
ajustados — conferido por busca, nenhum depende hoje.

### Desvios na implementação (3)

Ajustes feitos dentro das decisões, vistos só na tela; registrados aqui para a etapa 6.

- **E-mail na navbar só a partir de `lg`, não de `md`.** Entre 768 e 1023px o e-mail não
  cabia na linha: a barra quebrava em duas (89px em vez de 53px) e passava a cobrir o topo do
  formulário fixo de Lançamentos, que gruda em `top-19` (76px).
- **O formulário de Lançamentos só gruda com a janela de pelo menos 48rem (768px) de altura**
  (`md:[@media(min-height:48rem)]:sticky`). Em 844×390 (iPhone deitado, F3) o formulário tem
  ~474px, mais que a área visível; grudado, o "Salvar" ficava inalcançável até o fim da lista.
  Numa janela baixa, editar volta a rolar a página até o formulário (pelo `focus()`), como
  antes — UC3 vale só para janela alta.
- **`top-19` depende da altura da navbar** (53px) somada ao `p-6` do `<main>`. Mudar o
  espaçamento da navbar exige rever esse valor.
- **A grade do Resumo é um `div` próprio dentro do `<main>`**, separado de carregando/erro/aviso
  de renda: com `grid-rows-[auto_1fr]`, a linha `1fr` absorve a altura extra das categorias e a
  tendência fica colada ao resumo (medido: 24px entre eles em 1920px, com categorias 200px
  mais alta que o resumo).

### "Por categoria" vira rosca com legenda clicável (3)

Decidido pelo usuário em 29/10/2026, depois de comparar barras, pizza e rosca num seletor
temporário com os dados reais. Muda o conteúdo do card, o que a etapa 1 tinha deixado fora do
escopo ("nenhum bloco novo") — a revisão veio do próprio usuário ao ver o layout pronto.

- **Rosca** (`CategoryDonut`), exportada de `TrendChart.tsx`: o módulo já é carregado sob
  demanda, então o recharts continua fora do pacote principal sem arquivo novo. Custo aceito:
  o nome do arquivo deixa de descrever tudo o que ele contém (candidato para a etapa 4).
- **Legenda:** nome e percentual de cada categoria, como botão (escolha do usuário entre "só o
  nome" e "nome e percentual"). Os itens saíram do card.
- **Popup** (`Dialog` do shadcn, sem dependência de runtime nova — instalado pela regra do
  projeto, que dispensa aprovação nesse caso): título, total, percentual e as transações da
  categoria, com parcela quando houver. Edição local: o rótulo do botão de fechar passou de
  "Close" para "Fechar".
- **Cores: só os cinco verdes do tema, cinco maiores + "Outras".** As cinco maiores
  categorias do mês ganham um verde cada (`--chart-4, 1, 3, 5, 2`, alternando claro e escuro
  para fatias vizinhas não se confundirem); as demais viram uma fatia cinza "Outras". Na
  legenda, "Outras" mostra quantas categorias agrupa ("5 categorias") em vez de percentual; o
  popup lista cada uma com total, percentual e transações. Conta a ordem que a API já devolve
  (maior para a menor, `calculate_category_breakdown`) — o front não ordena nada.
  - Histórico: primeiro foi escolhida uma paleta de dez cores (`--chart-6..10` em outras
    matizes, cor fixa por categoria); no mesmo dia o usuário voltou atrás para manter a paleta
    verde do tema, e os tokens novos saíram do `index.css`.
  - Sem conta de dinheiro no front: "Outras" não exibe total somado. A soma dos totais existe
    só para o tamanho da fatia, como os números do gráfico de tendência.
  - Custo aceito: a cor deixa de ser fixa por categoria — Moradia pode ter um verde num mês e
    outro no seguinte, conforme a posição. E a categoria do domínio "Outros" pode aparecer
    dentro da fatia "Outras".
- **Rosca no modelo "Donut with Text" do shadcn** (pedido do usuário): clicar numa fatia abre
  o mesmo popup da legenda; o tooltip mostra a cor da fatia sob o mouse; o centro mostra o
  `total_spent` do `/summary` com "gasto no mês" — sem soma no front, porque os totais por
  categoria somam exatamente esse valor (`docs/dominio.md`, "O que entra no resumo por
  categoria"). Diferença do modelo: altura fixa `h-[250px]` em vez de `max-h-[250px]` — sem um
  pai `flex-1`, como no exemplo do shadcn, o `max-h` deixa o contêiner sem largura e a rosca
  some. O clique na fatia não tem teste automático: no jsdom o `ResponsiveContainer` mede zero
  e o recharts não desenha as fatias; foi verificado no navegador.
- **Pacote principal:** foi de 338 KB para 385 KB (109 → 125 KB gzip) com o `Dialog` do Base UI.
- **Foco:** ao fechar o popup o foco volta ao botão da categoria sem código extra — o Base UI
  devolve ao elemento focado antes de abrir. Testado no navegador com teclado (Enter/Esc).

### Revisão estrutural (4)

Ferramentas: `ruff` sem achados; `knip` com 23 achados, todos falsos positivos conhecidos
(exports de `ui/`, `api-schema.d.ts`, apelidos de `types.ts`). Do diff, quatro pontos; o
usuário decidiu em 29/10/2026:

1. **Um componente por arquivo — aplicado.** A rosca saiu do `TrendChart.tsx` para
   `CategoryDonut.tsx`, também carregado sob demanda. O Vite separa o recharts num pedaço
   compartilhado pelos dois gráficos; o nome desse pedaço (`ChartTooltipRow-*.js`) vem do
   primeiro módulo que o Vite encontra nele e não quer dizer nada.
2. **`Dialog` no pacote principal (+47 KB) — mantido** como está.
3. **Altura da navbar numa variável — aplicado.** `--header-height` (3.3125rem = 53px) no
   `:root` de `index.css`; a navbar usa `md:h-(--header-height)` e o formulário fixo de
   Lançamentos `md:top-[calc(var(--header-height)+--spacing(6))]`. Abaixo de `md` a navbar tem
   duas linhas e altura livre (89px no celular).
4. **Quadradinho de cor e linha do tooltip reutilizáveis — aplicado.** `ChartSwatch.tsx` (o
   quadradinho, usado na legenda e no tooltip da rosca) e `ChartTooltipRow.tsx` ("nome … R$
   valor", com a cor opcional; usado pelos tooltips da tendência e da rosca). Nenhum dos dois
   importa recharts, então a legenda usa o `ChartSwatch` sem puxá-lo para o pacote principal.

### Revisão de segurança (5)

Dependências sem vulnerabilidade (`pip-audit`, `npm audit` completo e `--omit=dev`); o item
não mexeu em dependência. Um achado no diff, **médio, corrigido**:

- **Nome de categoria dentro do `<style>` do gráfico.** O `donutConfig` da rosca usava o nome
  da categoria como chave, e o `ChartStyle` do shadcn escreve as chaves cruas num `<style>` via
  `dangerouslySetInnerHTML`. Como a API aceita qualquer texto como categoria, um lançamento com
  categoria `x:red}body{display:none}` escondia a página do Resumo (alcance: só a própria conta,
  que precisa do token para gravar). Correção: chaves por posição (`slice-0`, `slice-1`…), com
  o nome só no `label`, que o React escapa. Teste em `CategoryDonut.test.tsx`, que falhava antes
  da correção; verificado no navegador com a categoria maliciosa gravada pela API.
- **Anotação, virou item do roadmap:** validar a categoria contra a lista fechada também no
  servidor.

## O que foi construído (6)

### Backend

Nada.

### Frontend

- **`Page`** — invólucro de todas as telas logadas: a navbar e um `<main>` centralizado de no
  máximo 1152px (`max-w-6xl`). Cada tela monta a própria grade dentro dele com `md:grid`;
  Fatura e Importar passam `max-w-3xl`.
- **`Header`** — navbar de ponta a ponta, fixa ao rolar, com as quatro abas sempre visíveis
  (`aria-current="page"` na ativa, inclusive a engrenagem). A partir de `md` cabe numa linha e
  tem a altura de `--header-height`; abaixo, duas linhas e abas só com ícone (rótulo em
  `sr-only`). E-mail só a partir de `lg`.
- **Telas** — Resumo (resumo + tendência | categorias), Lançamentos (saldo + formulário fixo |
  lista), Configurações (dados | aparência + excluir). A ordem no HTML continua a do celular;
  a posição em colunas vem da grade.
- **`CategoryDonut`** — rosca de "Por categoria", carregada sob demanda. As cinco maiores
  categorias ganham um verde; o resto vira "Outras". Centro com o `total_spent` da API; clique
  na fatia ou na legenda abre o popup (`Dialog`) com as transações.
- **`ChartSwatch` / `ChartTooltipRow`** — o quadradinho de cor e a linha "nome … R$ valor",
  compartilhados pelos tooltips da tendência e da rosca e pela legenda.

### Infra / dados

Nada.

## Armadilhas (6)

### O formulário fixo de Lançamentos depende da altura da navbar

**Causa:** o `top` do formulário fixo é `--header-height` + o `p-6` do `<main>`. A navbar só
tem essa altura a partir de `md` e enquanto couber numa linha.
**Como se manifesta:** se algo novo entrar na navbar e ela quebrar em duas linhas entre `md` e
`lg`, ela cobre o topo do formulário. Foi assim que o e-mail passou a aparecer só a partir de
`lg`.
**O que fazer:** ao mexer na navbar, conferir em 768–1023px que ela continua com 53px; se a
altura mudar, ajustar `--header-height` em `index.css`.

### Formulário fixo mais alto que a tela fica inalcançável

**Causa:** `position: sticky` não rola o próprio conteúdo. Em janela baixa (iPhone deitado,
~390px) o formulário passa da altura visível.
**Como se manifesta:** o botão "Salvar" só aparece no fim da lista.
**O que fazer:** o formulário só gruda com a janela de pelo menos 48rem de altura
(`md:[@media(min-height:48rem)]:sticky`). Se o formulário crescer, rever esse limite.

### `max-h` do exemplo do shadcn faz a rosca sumir

**Causa:** o exemplo "Donut with Text" usa `max-h-[250px]` dentro de um pai `flex-1`; no nosso
card, sem esse pai, o contêiner fica com largura zero.
**Como se manifesta:** o card "Por categoria" mostra legenda mas nenhum gráfico, sem erro.
**O que fazer:** usar altura fixa (`h-[250px]`) com `aspect-square`.

### Chave do `ChartConfig` vai crua para um `<style>`

**Causa:** o `ChartStyle` do shadcn (`ui/chart.tsx`) escreve as chaves do config com
`dangerouslySetInnerHTML`. A API aceita qualquer texto como categoria.
**Como se manifesta:** com o nome da categoria como chave, um lançamento com categoria
`x:red}body{display:none}` escondia o Resumo.
**O que fazer:** nunca usar dado da API como chave de `ChartConfig`; usar chave fixa ou por
posição e deixar o texto no `label`. O item do roadmap de validar categoria no servidor fecha
a origem.

### Gráficos não desenham no jsdom

**Causa:** o `ResponsiveContainer` do recharts mede zero no jsdom.
**Como se manifesta:** testes que procuram fatia ou barra não acham nada; o clique na fatia da
rosca não tem teste automático.
**O que fazer:** testar no vitest o que não depende do desenho (o `<style>` do config, a
legenda, o popup) e conferir fatia e tooltip no navegador.

## Como verificar (6)

1. `./dev.sh`, entrar com uma conta que tenha lançamentos em mais de cinco categorias no mês.
2. **Desktop (1280px ou mais):** Resumo com resumo e tendência à esquerda e categorias à
   direita; a navbar ocupa a largura toda e fica no topo ao rolar.
3. **Rosca:** centro com o mesmo valor de "Gasto total do mês"; cinco fatias verdes e uma
   cinza "Outras". Passar o mouse numa fatia mostra nome, valor e a cor dela; clicar abre o
   popup com as transações. "Outras" abre as categorias agrupadas, cada uma com total e %.
4. **Lançamentos:** com a janela alta (≥ 768px de altura) e a lista longa, rolar a página —
   saldo e formulário ficam colados logo abaixo da navbar.
5. **Fatura e Importar:** bloco centralizado, de no máximo 768px.
6. **Celular (375px):** tudo em uma coluna, na ordem antiga; navbar em duas linhas, abas só
   com ícone; sem rolagem horizontal.
7. **iPhone deitado (844×390):** duas colunas; o formulário de Lançamentos não gruda e o
   "Salvar" é alcançável.
8. Testes: `cd frontend && npm test` (107), `npm run build`, `npm run lint`.
