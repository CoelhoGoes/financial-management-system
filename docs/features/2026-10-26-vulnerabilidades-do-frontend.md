# Vulnerabilidades do frontend

- **Status:** concluído
- **Início:** 2026-10-26
- **Item do roadmap:** corrigir as 15 vulnerabilidades do `npm audit` no frontend
- **Entrada no CHANGELOG:** nenhuma — muda só dependências de build e de desenvolvimento, sem efeito para quem usa o app

## O que a feature entrega (1)

O `npm audit` do frontend deixa de acusar as 15 vulnerabilidades conhecidas hoje, e o relatório
passa a separar direito o que vai para o navegador do que só roda na máquina de quem
desenvolve.

Para quem usa o app, nada muda na tela: nenhuma das 15 chega ao código que roda no navegador.
Para quem desenvolve, o servidor do Vite e as ferramentas de linha de comando deixam de ter
falhas conhecidas, e um `npm audit` limpo volta a ser sinal útil — hoje qualquer achado novo
se perde no meio dos 15 antigos.

## Motivação (1)

Achadas na etapa 5 do item anterior (`docs/features/2026-10-26-testes-do-segredo-mais-rapidos.md`)
e postas como prioridade pelo usuário em 26/10/2026.

Estado em 26/10/2026 (`npm audit --json`, conferido):

| Entra por | Pacotes | Severidade | Onde roda |
|---|---|---|---|
| `shadcn` 4.20.1 (direto, em `dependencies`) | `@modelcontextprotocol/sdk`, `body-parser`, `proxy-addr`, `hono`, `undici`, `zod`, `brace-expansion`, `fast-uri`, `ip-address`, `postcss-selector-parser` | 1 crítica, 6 altas, 4 moderadas (contando o próprio `shadcn`) | só quando se roda o CLI (`npx shadcn add`) |
| `@tailwindcss/vite` 4.3.3 (direto, em `dependencies`) | `source-map-js` | alta | no build |
| `vite` 8.2.2 (direto, `devDependencies`) | o próprio `vite` e `launch-editor` | alta | servidor de desenvolvimento |
| `vitest` 5.0.1 (direto, `devDependencies`) | `vitest`, `@vitest/mocker` | moderada | testes |

- **Correção disponível para todas, e nenhuma exige versão maior** (`fixAvailable` sem
  `isSemVerMajor` em todos os 15)
- O `shadcn` aparece como runtime no `npm audit --omit=dev` porque está em `dependencies`.
  Ele não é só CLI: `src/index.css` importa `shadcn/tailwind.css`, então o pacote é lido no
  build. Não foi possível determinar por que ele foi posto em `dependencies` no commit inicial
  do frontend (`25946a4`)
- O servidor do Vite sobe sem `--host` (`package.json` → `"dev": "vite"`, e o `dev.sh` não
  muda isso), então fica em `localhost`. As falhas do Vite valem para quem abre outro site no
  navegador enquanto ele roda, não para a rede

## Casos de uso (1)

- **UC1 — Auditoria limpa.** Quem: quem desenvolve. O quê: roda `npm audit` no frontend.
  Resultado: zero vulnerabilidades, incluindo as de desenvolvimento — ou só as que foram
  aceitas por escrito em **Decisões** (F4).
- **UC2 — Auditoria do que vai para o navegador.** Quem: quem desenvolve, ou a etapa 5 do
  fluxo. O quê: roda `npm audit --omit=dev`. Resultado: só aparece o que de fato entra no
  bundle — ferramenta de build e CLI não contam como runtime.
- **UC3 — O app continua igual.** Quem: quem usa o app. O quê: abre qualquer tela.
  Resultado: mesma aparência e comportamento, nos dois temas e no celular.
- **UC4 — As ferramentas continuam funcionando.** Quem: quem desenvolve. O quê: roda
  `npm run dev`, `npm run build`, `npm test`, `npm run lint`, `npm run gen:types`,
  `./dev.sh` e `npx shadcn add <componente>`. Resultado: tudo funciona como antes.
- **UC5 — Instalação limpa.** Quem: quem clona o repositório. O quê: roda `npm install`
  (ou `npm ci`). Resultado: instala sem erro de conflito de versão.

## Casos de falha (1)

- **F1 — A atualização quebra build, tipos ou testes.** Quando: uma versão nova do Vite, do
  Vitest ou do plugin do Tailwind muda comportamento. Esperado: algum check da etapa 3 pega
  antes do commit.
- **F2 — A aparência muda.** Quando: o `shadcn/tailwind.css` ou o Tailwind atualizado mudam
  estilo. Esperado: visto na tela (375px, claro e escuro) antes do commit.
- **F3 — O CLI do shadcn muda de comportamento.** Quando: a versão nova lê `components.json`
  de outro jeito ou gera componente diferente. Esperado: `npx shadcn add` continua
  funcionando com a configuração atual (Base UI, remixicon, aliases em `src/presentation/`).
- **F4 — Vulnerabilidade sem correção.** Quando: alguma não tem versão corrigida, ou a
  correção exige versão maior. Esperado: não some em silêncio — fica registrada como aceita,
  com o motivo. Hoje não há nenhuma assim.
- **F5 — Conflito de dependência na instalação.** Quando: a atualização esbarra no
  `overrides` do `openapi-typescript` (que pede `typescript ^5` e o projeto usa 6), ou em
  outro peer. Esperado: `npm install` termina sem `ERESOLVE` e sem `--force`.
- **F6 — O lockfile muda mais do que devia.** Quando: a correção atualiza pacotes que não
  tinham vulnerabilidade. Esperado: o diff do `package-lock.json` é explicável.
- **F7 — O build passa a depender de algo que saiu de `dependencies`.** Quando: um pacote
  muda de lugar e o build (que lê `shadcn/tailwind.css`) deixa de achá-lo numa instalação
  sem dev. Esperado: o build funciona do jeito que o projeto instala — hoje, sempre com
  `npm install` completo.

Pulados de propósito: sessão, conta excluída, recurso de outro usuário, ação repetida, rede
— o item não toca em endpoint nem em dado.

## Perguntas abertas (1)

Nenhuma. Respondidas em 26/10/2026:

- **Meta:** zero achados no `npm audit` inteiro, incluindo os de desenvolvimento (Vite,
  Vitest) — não só no `--omit=dev`.
- **Vulnerabilidade nova depois deste item:** continua sendo pega na etapa 5 de cada item;
  nenhuma checagem automática nova.

## Fora do escopo (1, revisado na 2)

- Auditoria do backend: o `pip-audit` está limpo.
- Atualizar dependências que não têm vulnerabilidade, só por estarem desatualizadas.
- Checagem automática de `npm audit` (no `dev.sh` ou outro lugar): a etapa 5 de cada item já
  cobre, decidido em 26/10/2026.

## Decisões (2)

### Corrigir com `npm audit fix` e subir o piso dos diretos no `package.json`

**Escolhido:** aplicar o `npm audit fix` (sem `--force`) e subir os ranges dos três diretos
vulneráveis para as versões corrigidas: `shadcn ^4.22.1`, `vite ^8.3.5`, `vitest ^5.0.5`.

**Alternativas:**
- Só `npm audit fix`: o `package.json` continuaria aceitando as versões vulneráveis, e
  regenerar o lockfile poderia voltar a elas.
- `npm update` geral: atualiza o que não tem vulnerabilidade, fora do escopo.

**Custo aceito:** 71 pacotes de topo mudam no lockfile — todos dentro dos ranges atuais, mas
nenhum escolhido um a um. Dois chamam atenção e ficam restritos ao CLI do `shadcn`: o `zod`
vai de 3 para 4 e o `tailwind-merge` sai (o app usa o `cn`, não o `tailwind-merge`).

### Em `dependencies`, só o que põe JS ou fonte no navegador

**Escolhido:** `shadcn`, `tailwindcss`, `@tailwindcss/vite` e `tw-animate-css` vão para
`devDependencies`. Ficam em `dependencies`: `react`, `react-dom`, `react-router`,
`@base-ui/react`, `recharts`, `cn`, `class-variance-authority`, `@remixicon/react` e
`@fontsource-variable/inter` (este copia as fontes para o `dist/`).

**Alternativas:**
- Mover só os três primeiros: `tw-animate-css` ficaria como exceção sem motivo — é CSS puro,
  como o `shadcn/tailwind.css`.
- Mover só o `shadcn`: `tailwindcss` e `@tailwindcss/vite` continuariam contando como runtime
  no `npm audit --omit=dev`.
- Deixar como está: o `--omit=dev` já daria zero com a correção, mas o próximo achado do CLI
  voltaria a aparecer como runtime.

**Custo aceito:** o CSS desses pacotes ainda chega ao navegador, compilado no bundle — o
critério é JS e fonte, não "nada chega". O build depende de instalação completa (com dev), o
que é o padrão do `npm install`/`npm ci` e da Vercel (deploy planejado no roadmap; não
verificado lá). E o `npx shadcn init`, se for rodado de novo, põe o `shadcn` de volta em
`dependencies`.

### `deepmerge` fixado em 4.1.2 por `overrides`, até sair versão corrigida

_Decidida na etapa 5, em 28/10/2026._

**Contexto:** entre o ensaio (26/10) e a etapa 5 saíram dois avisos novos, em pacotes que já
estavam no lockfile antes do item, ambos só alcançáveis pelo CLI do `shadcn`:
`systeminformation` 5.33.8 (moderada, corrigida dentro do range) e `deepmerge` 4.3.1 (baixa,
GHSA-gcqx-w48m-w2h4, faixa `>=4.2.0 <=4.3.1`, **sem versão corrigida**; contava também
`shadcn` e `@shadcn/registry`, que dependem dele).

**Escolhido:** `"overrides": { "deepmerge": "4.1.2" }` no `package.json`, a última versão
antes da faixa afetada, mais um `npm audit fix` para o `systeminformation` (5.33.18). O
`npm audit` volta a zero. Um item no roadmap lembra de tirar o override quando sair versão
corrigida.

**Alternativas:**
- Aceitar as 3 baixas do `deepmerge` por escrito e corrigir só o `systeminformation`.
- Override sem item no roadmap: o motivo ficaria só aqui.

**Custo aceito:** o `shadcn` declara `deepmerge ^4.3.1`; o override força uma versão fora
desse range (o `npm ls` marca "overridden") e sem as correções de 4.2 e 4.3 (2019–2023).
Verificado: o `shadcn` só usa a opção `arrayMerge`, que existe desde a 2.x, e
`npx shadcn add separator` criou o componente com a 4.1.2 (na pasta de rascunho). Nada avisa
quando sair versão corrigida — o item do roadmap é o lembrete.

## Contratos alterados (2, confirmado na 6)

- **API, schema, tipos, variáveis de ambiente:** nenhum
- **`frontend/package.json`:** 4 pacotes de `dependencies` para `devDependencies`; pisos de
  `shadcn`, `vite` e `vitest` sobem; `overrides` ganha `deepmerge: 4.1.2` (etapa 5)
- **`frontend/package-lock.json`:** regenerado pelo `npm install` (nunca à mão)

## Plano de implementação (2)

1. Medir antes: `npm audit` (15) e `npm audit --omit=dev` (13), anotados
2. Mover os 4 pacotes e subir os pisos com `npm pkg delete` + `npm install -D` (o lockfile
   acompanha); rodar `npm audit fix` se ainda sobrar achado
3. Conferir que o `package.json` só mudou nesses pontos

Ensaio feito na pasta de rascunho em 26/10/2026, com o mesmo resultado esperado: 0 e 0 no
audit, build com o mesmo hash de CSS (`index-uDs080ha.css`), 93 testes, lint sem warning novo,
`npm ci` sem `ERESOLVE`, `npx shadcn add badge --dry-run` funcionando.

Caso → verificação (não há código novo, então os testes são os checks):

- **UC1** → `npm audit`: 0
- **UC2** → `npm audit --omit=dev`: 0, e `npm ls --omit=dev` sem `shadcn`/`tailwindcss`
- **UC3 / F2** → hash do CSS do build igual ao de antes; telas vistas a 375px, claro e escuro
- **UC4 / F1** → `npm run build`, `npm test`, `npm run lint`, `npm run dev`; `./dev.sh` e
  `npm run gen:types` com a API de pé
- **F3** → `npx shadcn add badge --dry-run`
- **UC5 / F5** → `rm -rf node_modules && npm ci` sem `ERESOLVE`
- **F4** → nenhuma vulnerabilidade sem correção hoje; se aparecer, parar e registrar
- **F6** → lista dos pacotes de topo que mudaram no lockfile, conferida contra o ensaio (71)
- **F7** → build depois de `npm ci` completo

## O que foi construído (6)

### Backend

Nada.

### Frontend

Só o `frontend/package.json` e o lockfile; nenhuma linha de código.

- `shadcn`, `tailwindcss`, `@tailwindcss/vite` e `tw-animate-css` passaram para
  `devDependencies`. Em `dependencies` fica só o que põe JS ou fonte no navegador — o critério
  está agora em `CLAUDE.md` → Decisões, junto com a regra de que essas quatro pedem aprovação
  para trocar de versão, porque geram o CSS do app
- Pisos subiram para as versões corrigidas: `shadcn ^4.22.1`, `vite ^8.3.5`, `vitest ^5.0.5`
- `overrides` ganhou `deepmerge: 4.1.2` (ver Decisões); o `npm audit fix` levou os transitivos
  para as versões corrigidas
- Resultado: `npm audit` e `npm audit --omit=dev` em zero; o CSS gerado é o mesmo de antes
  (`index-uDs080ha.css`)

### Infra / dados

Nada. `README.md` e `CLAUDE.md` ganharam o `npm audit` na lista de comandos de auditoria.

## Armadilhas (6)

### Trocar o pacote direto não atualiza os transitivos vulneráveis

**Causa:** `npm install -D pacote@^x` atualiza o pacote pedido e só o que ele exige; um
transitivo que já satisfaz o range continua na versão travada no lockfile.
**Como se manifesta:** depois de subir `shadcn`, `vite` e `vitest`, o `npm audit --omit=dev`
deu zero e o `npm audit` ainda acusava `brace-expansion`, `fast-uri`, `ip-address`.
**O que fazer:** rodar `npm audit fix` (sem `--force`) depois de mexer nos diretos, e conferir
com o `npm audit` completo, não só o `--omit=dev`.

### O resultado do `npm audit` muda sem o projeto mudar

**Causa:** o audit compara o lockfile com a base de avisos do registro, que recebe avisos novos
a qualquer momento.
**Como se manifesta:** o ensaio de 26/10 deu zero; a etapa 5, em 28/10, achou 4 avisos novos
em pacotes que já estavam no lockfile antes do item (`systeminformation`, `deepmerge`). Foi
isso que levou à decisão do override.
**O que fazer:** rodar o `npm audit` de novo logo antes de commitar, e não tratar o zero de um
dia anterior como garantia.

## Como verificar (6)

```bash
cd frontend
npm audit                 # found 0 vulnerabilities
npm audit --omit=dev      # found 0 vulnerabilities
npm ls --omit=dev --depth=0   # sem shadcn, tailwindcss, @tailwindcss/vite, tw-animate-css
npm ls deepmerge          # 4.1.2 overridden
rm -rf node_modules && npm ci && npm run build && npm test && npm run lint
npx shadcn add badge --dry-run   # o CLI continua funcionando
```

- O build gera `dist/assets/index-uDs080ha.css` — o mesmo nome (hash do conteúdo) de antes
  do item, ou seja, o CSS não mudou
- Na tela, a 375px e nos dois temas, nada muda; conferido no Resumo e em Lançamentos
