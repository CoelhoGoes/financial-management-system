---
name: 1-usecasesrefinement
description: Etapa 1 de 7 do fluxo de desenvolvimento deste projeto — levanta os casos de uso e os casos de falha de um item antes de qualquer decisão técnica, e abre o documento da feature em docs/features/. Use quando o usuário pedir para começar, refinar ou "pegar" um item do roadmap, descrever uma feature nova, ou disser "próximo item", "casos de uso", "o que essa feature precisa fazer". Termina indicando a etapa 2 (/2-technicalrefinement).
---

# Etapa 1 — Casos de uso e de falha

O fluxo do projeto tem sete etapas, cada uma uma skill:

1. **`/1-usecasesrefinement`** — casos de uso e de falha ← você está aqui
2. `/2-technicalrefinement` — opções técnicas e decisões
3. `/3-implementation` — implementar o que foi decidido
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. `/5-securitycheck` — segurança do que foi implementado
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. `/7-commits-granulares` — commits e push

Esta etapa responde **o que** o item precisa fazer e **o que pode dar errado** — sem escolher
biblioteca, endpoint ou tela. Escolha técnica aqui contamina a etapa 2: ela passa a justificar
uma decisão em vez de comparar opções.

## Antes de começar

1. **Identifique o item.** Normalmente é o "Em andamento" de `docs/roadmap.md` (a linha
   correspondente está no fim do `CLAUDE.md`). Se o usuário trouxe algo que não está no
   roadmap, pergunte se entra como item novo e em que posição.
2. **Item pequeno não precisa do fluxo inteiro.** Um typo, um bump sem efeito, um ajuste de
   texto: diga que o fluxo é desproporcional e pergunte se segue direto para a etapa 3.
3. **Leia o contexto**, não suponha:
   - o item no `docs/roadmap.md` — às vezes já tem o motivo de existir
   - `docs/dominio.md` — regras e **Dívidas conhecidas** (várias escolhas são deliberadas)
   - **Product context** e **Decisões** no `CLAUDE.md`
   - o código que o item toca hoje, para descrever o estado atual com fatos

## O que levantar

**Casos de uso** — numerados `UC1`, `UC2`… Para cada um:

- **Quem** faz (usuário logado, visitante, a própria API num job…)
- **O quê**, em uma frase, do ponto de vista de quem usa
- **Resultado esperado** — o que a pessoa vê ou o que muda nos dados

**Casos de falha** — numerados `F1`, `F2`… O que acontece quando dá errado, e o que o sistema
deve fazer. Percorra, no mínimo:

- entrada inválida ou fora da faixa (o que o servidor recusa, com que mensagem)
- sem sessão, sessão expirada, conta excluída, recurso de outro usuário
- recurso que não existe mais (apagado em outra aba, id inventado)
- ação repetida (duplo clique, reenvio, reimportação)
- rede ou API fora do ar no meio da ação
- celular: tela estreita, teclado, Safari do iPhone

Nem toda linha se aplica a todo item. Pule a que não faz sentido, mas pule de propósito.

A numeração é o que liga as etapas: a 3 escreve ao menos um teste por caso e cita o número.

## Quando faltar informação

Pergunte (com `AskUserQuestion` quando houver opções claras). **Não preencha motivação nem
regra de negócio com o palpite mais provável** — é a regra do `CLAUDE.md`. Se o usuário não
souber ainda, registre como pergunta aberta no documento em vez de inventar.

## O documento da feature

Crie `docs/features/AAAA-MM-DD-slug-curto.md`, com a data de hoje. Slug em português, pelo que
a feature entrega (`exclusao-de-conta`, não `delete-endpoint`). Se a pasta não existir, crie
junto o índice `docs/features/README.md`:

```markdown
# Registro de features

| Início | Feature | Status |
|--------|---------|--------|
| 2026-10-25 | [Exclusão de conta](2026-10-25-exclusao-de-conta.md) | casos de uso |
```

Mais recente no topo. O status acompanha as etapas: `casos de uso` → `refinado` →
`implementado` → `concluído`.

Esta etapa preenche as seções marcadas **(1)**. As outras ficam com o marcador da etapa que as
preenche — não escreva conteúdo nelas agora.

```markdown
# <Nome da feature>

- **Status:** casos de uso
- **Início:** AAAA-MM-DD
- **Item do roadmap:** <a linha do item, resumida>
- **Entrada no CHANGELOG:** _(etapa 6)_

## O que a feature entrega (1)

Dois ou três parágrafos, do ponto de vista de quem usa. O que dá para fazer depois que não dá
hoje. Sem jargão de implementação.

## Motivação (1)

Que problema isso resolve, e por que agora. Se veio de algo já registrado (roadmap, dívida no
`dominio.md`, um bug), aponte para lá. Se o motivo não foi dito, escreva que não foi informado.

## Casos de uso (1)

- **UC1 — <título>.** Quem: … O quê: … Resultado: …

## Casos de falha (1)

- **F1 — <título>.** Quando: … Esperado: …

## Perguntas abertas (1)

O que o usuário ainda não decidiu. Vazio é resposta válida. A etapa 2 não fecha com pergunta
aberta que afete uma decisão.

## Fora do escopo (1, revisado na 2)

O que fica de fora de propósito, com o motivo.

## Decisões (2)
## Contratos alterados (2, confirmado na 6)
## Plano de implementação (2)
## O que foi construído (6)
## Armadilhas (6)
## Como verificar (6)
```

No `docs/roadmap.md`, acrescente ao item uma linha apontando para o documento — o detalhe
vive lá, não no roadmap.

## Revisão com o usuário

Mostre os casos de uso, os de falha e as perguntas abertas, e pergunte especificamente:

- falta algum caso?
- algum caso de falha deveria ter outro comportamento?
- o fora do escopo está certo?

Ajuste o documento com as respostas. Status passa a `casos de uso` no índice.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 1 de 7 concluída — casos de uso e de falha em docs/features/<arquivo>.md.
Próximo passo: 2 — refinamento técnico do escopo (/2-technicalrefinement).
```

E pergunte: **"Sigo para a etapa 2?"** Com um sim, chame a skill `2-technicalrefinement`. Com
um não, pare — o documento já guarda onde o fluxo parou.
