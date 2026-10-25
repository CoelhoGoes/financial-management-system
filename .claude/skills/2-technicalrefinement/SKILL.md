---
name: 2-technicalrefinement
description: Etapa 2 de 7 do fluxo de desenvolvimento deste projeto — transforma os casos de uso e de falha da etapa 1 em decisões técnicas, apresentando opções com trade-offs e esperando a escolha do usuário antes de qualquer código. Registra decisões, contratos alterados e plano de implementação no documento da feature. Use depois da etapa 1, ou quando o usuário pedir para "refinar", "trazer as opções" ou "decidir como fazer" um item. Termina indicando a etapa 3 (/3-implementation).
---

# Etapa 2 — Refinamento técnico

1. `/1-usecasesrefinement` — casos de uso e de falha
2. **`/2-technicalrefinement`** — opções técnicas e decisões ← você está aqui
3. `/3-implementation` — implementar o que foi decidido
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. `/5-securitycheck` — segurança do que foi implementado
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. `/7-commits-granulares` — commits e push

O `CLAUDE.md` manda não escolher sozinho quando há mais de um caminho razoável. Esta etapa é
onde isso acontece de propósito: toda bifurcação vira uma pergunta com opções, antes de existir
código que a torne cara de desfazer.

## Entrada

O documento `docs/features/<arquivo>.md` com status `casos de uso`. Se não existir, ou tiver
pergunta aberta que afete uma decisão, volte para a etapa 1 — diga isso ao usuário em vez de
decidir por ele.

## Levantar fatos antes de propor

Opção apresentada sem verificação é palpite. Antes de perguntar:

- **Leia o código que cada caso toca** e a rule da metade envolvida
  (`.claude/rules/rules-backend.md`, `.claude/rules/rules-frontend.md`)
- **Cheque o que já existe e pode ser reaproveitado**: helper, componente shadcn instalado,
  padrão de outra tela, invariante do modelo (um `cascade`, um índice)
- **Teste o que der para testar sem mexer no projeto**: rode a ferramenta por `npx`/`uvx`
  na pasta de rascunho, consulte `npm view` / o registro do shadcn para ver dependências,
  gere o artefato e compare
- **Procure armadilhas conhecidas** do projeto: 401 derruba a sessão no `api.ts`; o container
  da API roda sem `--reload`; o Safari do iPhone dá zoom em campo com fonte abaixo de 16px;
  o `EmailStr` recusa domínios especiais como `.test`

Diga ao usuário o que você verificou e como — "conferido no código", "testado na pasta de
rascunho". O que não deu para verificar, marque como não verificado.

## Apresentar as decisões

Use `AskUserQuestion`, até quatro perguntas por vez. Em cada opção, o trade-off concreto — o
que ganha e o que custa. A opção recomendada vai primeiro, com "(Recomendado)".

Precisa de pergunta explícita, sempre (lista do `CLAUDE.md` → Decisões):

- dependência de runtime nova, trocada ou removida
- arquivo ou pasta novos
- schema do banco, contrato de API, formato de payload
- apagar código, arquivo ou configuração
- qualquer mudança em `backend/app/domain/service.py`
- `.gitignore`, `docker-compose.yml`, variáveis de ambiente
- CLI de scaffolding que traga dependência de runtime

Se uma resposta abre decisões novas (uma escolha cria duas perguntas que não existiam), faça a
segunda rodada. Não feche a etapa com bifurcação sem resposta.

Se surgir algo que contradiz o pedido do usuário — o motivo original do item deixa de ser
atendido pela opção escolhida, por exemplo — diga isso com clareza antes de registrar.

## Registrar no documento

Preencha as seções **(2)** e revise **Fora do escopo**:

```markdown
## Decisões (2)

### <A decisão, em uma frase>

**Escolhido:** <o que foi decidido>
**Alternativas:** <o que foi considerado e por que não>
**Custo aceito:** <o trade-off conhecido — sempre existe um>

## Contratos alterados (2, confirmado na 6)

- **API:** rotas novas/alteradas/removidas, payload, códigos de status
- **Schema:** colunas, índices, migração
- **Tipos do frontend:** o que muda no OpenAPI e, portanto, no `api-schema.d.ts`
- **Variáveis de ambiente:** novas ou renomeadas

## Plano de implementação (2)

Por camada, não por arquivo: o que cada peça passa a fazer. Arquivos novos aprovados,
dependências aprovadas, e **qual teste cobre cada caso** (`UC1` → teste X, `F2` → teste Y).
```

Se não houve decisão real, escreva "Nenhuma decisão relevante — o caminho era único" em vez de
inventar deliberação.

Atualize o status para `refinado` no índice e a linha **Em andamento** do `CLAUDE.md` para
apontar o documento.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 2 de 7 concluída — decisões e plano em docs/features/<arquivo>.md.
Próximo passo: 3 — implementação do refinamento (/3-implementation).
```

E pergunte: **"Sigo para a etapa 3?"** Com um sim, chame a skill `3-implementation`. Com um
não, pare.
