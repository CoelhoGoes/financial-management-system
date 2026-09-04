---
name: registro-de-feature
description: Escreve um documento detalhado em docs/features/ ao concluir uma feature — o que foi construído, por que, quais decisões foram tomadas, quais contratos mudaram e como verificar. Preenche a lacuna entre o CHANGELOG (uma linha por mudança) e os commits (granulares demais e sem o raciocínio). Use ao terminar uma feature, um refactor grande ou uma mudança estrutural, e sempre que o usuário disser que acabou, que fechou, que a feature está pronta, ou pedir para documentar o que foi feito. Ofereça o registro ao concluir qualquer bloco de trabalho relevante, mesmo sem o usuário pedir.
---

# Registro de feature

Um projeto acumula três camadas de histórico e nenhuma delas basta sozinha:

- O **CHANGELOG** diz *o que* mudou para quem usa o sistema — uma linha, sem contexto.
- Os **commits** dizem *como* mudou, arquivo por arquivo — detalhado demais para reconstruir a
  intenção, e o corpo raramente sobrevive à pressa.
- Este documento diz **por que a feature é assim** — as decisões, os contratos que mudaram, as
  armadilhas que valem a pena lembrar.

É o que alguém lê seis meses depois quando precisa mexer na feature e não quer refazer as
descobertas do zero.

## Quando escrever

Ao **concluir** uma feature — não durante. Escrever no meio gera um documento que descreve um
estado que já mudou.

Vale registro:

- feature nova, mesmo pequena, se tocou mais de um arquivo ou camada
- refactor estrutural (mover módulos, trocar biblioteca, redesenhar um fluxo)
- mudança de contrato de API ou de modelo de dados
- qualquer trabalho que rendeu mais de dois ou três commits

Não vale registro: correção isolada de typo, ajuste de estilo, bump de dependência sem efeito,
renomeação cosmética. Esses vivem bem no CHANGELOG e no commit.

Se estiver na dúvida, pergunte ao usuário antes de escrever. Documento demais tem o mesmo
destino que documento nenhum: ninguém lê.

## Onde fica

```
docs/features/
├── README.md                                    índice, mais recente primeiro
├── 2026-09-10-tela-de-lancamentos.md
├── 2026-09-05-traducao-de-identificadores.md
└── ...
```

Nome do arquivo: `AAAA-MM-DD-slug-curto.md`, com a data de conclusão. Slug em português,
descrevendo a feature pelo que ela entrega, não pela implementação
(`tela-de-lancamentos`, não `crud-entry-component`).

## Template

```markdown
# <Nome da feature>

- **Concluída em:** AAAA-MM-DD
- **Escopo:** <domínio: fatura, auth, lancamentos, infra...>
- **Commits:** `<primeiro-sha>..<último-sha>` (`git log --oneline <range>`)
- **Entrada no CHANGELOG:** <a linha correspondente>

## O que a feature entrega

Dois ou três parágrafos, do ponto de vista de quem usa. O que dá para fazer agora que não dava
antes. Sem jargão de implementação.

## Motivação

Que problema isso resolve, e por que agora. Se a feature veio de uma prioridade já registrada
no projeto, aponte para ela.

## O que foi construído

Organize por camada, não por arquivo. Descreva o papel de cada peça nova, não o diff.

### Backend
- `<módulo>` — <o que passou a fazer>

### Frontend
- `<componente/arquivo>` — <o que passou a fazer>

### Infra / dados
- <migrações, variáveis de ambiente, serviços novos>

## Decisões

A seção mais importante. Para cada escolha que teve mais de um caminho possível:

### <A decisão, em uma frase>

**Escolhido:** <o que foi feito>
**Alternativas:** <o que foi considerado e por que não>
**Custo aceito:** <o trade-off conhecido — sempre existe um>

Se a feature não envolveu nenhuma decisão real, escreva "Nenhuma decisão relevante — o caminho
era único" em vez de inventar deliberação que não houve.

## Contratos alterados

O que mudou de forma que afeta quem consome. Deixe explícito o antes e o depois.

- **API:** rotas novas, alteradas ou removidas; mudança de payload
- **Schema:** colunas, tabelas, tipos
- **Tipos do frontend:** o que precisou mudar em `types.ts` para espelhar o backend
- **Variáveis de ambiente:** novas ou renomeadas (e o que quebra em quem não atualizar o `.env`)

Se nada mudou, escreva "Nenhum contrato alterado".

## Armadilhas

Só o que vale a pena a próxima pessoa saber. Ver a regra de filtro abaixo.

## Como verificar

Passos concretos para alguém confirmar que a feature funciona, na mão. Comandos, rotas, o que
observar na tela. Isso é especialmente importante enquanto não há suíte de testes.

## O que ficou de fora

Escopo cortado de propósito, com o motivo. Vazio é resposta válida.
```

## A regra de filtro das armadilhas

Durante o desenvolvimento aparecem bugs. A maioria é lixo de processo: você quebrou algo
enquanto construía e consertou dez minutos depois. **Isso não entra no documento.** Registrar
cada tropeço transforma o texto num diário e enterra o que importa.

**Não registre:**

- erro que você mesmo introduziu numa versão intermediária e corrigiu antes de terminar
- import esquecido, typo, variável com nome errado
- refactor pela metade que depois foi concluído
- qualquer coisa cuja lição seja "eu tinha errado e depois acertei"

**Registre quando:**

- o bug **mudou uma decisão de design** — você tentou um caminho, ele quebrou por um motivo
  estrutural, e a feature ficou diferente por causa disso
- o bug **expôs um problema que já existia** e não foi criado pela feature
- o problema **vai acontecer de novo** com quem mexer nessa área — uma pegadinha da biblioteca,
  do framework, do ambiente
- o motivo do bug **não é visível no código final** — quem ler o resultado não tem como deduzir
  por que está daquele jeito

O teste rápido: *a próxima pessoa a mexer aqui perderia tempo se não soubesse disso?* Se a
resposta é não, corta.

Formato de cada armadilha registrada:

```markdown
### <o sintoma, em uma frase>

**Causa:** <o motivo real>
**Como se manifesta:** <o que a pessoa vai ver>
**O que fazer:** <a saída>
```

## Fluxo

1. **Confirme que a feature acabou.** Se ainda há trabalho pendente, o documento espera.
2. **Levante os fatos.** Não escreva de memória:
   - `git log --oneline <range>` — a lista de commits da feature
   - `git diff <base>..HEAD --stat` — a superfície da mudança
   - a conversa atual — é onde estão as decisões e os motivos que não sobreviveram no código
3. **Aplique a regra de filtro** antes de escrever a seção de armadilhas.
4. **Escreva o documento** no template.
5. **Atualize o índice** `docs/features/README.md`.
6. **Mostre ao usuário e confirme.** Você pode ter inferido a motivação errada ou promovido um
   tropeço a armadilha. Pergunte especificamente sobre a seção de decisões.

O documento entra num commit `docs(escopo): registrar feature <nome>` no fim da sequência, ou
no commit final da feature.

## Índice

```markdown
# Registro de features

| Data | Feature | Escopo |
|------|---------|--------|
| 2026-09-10 | [Tela de lançamentos](2026-09-10-tela-de-lancamentos.md) | lancamentos |
```

Mais recente no topo. Crie a pasta e o índice antes do primeiro registro, se não existirem.

## Relação com as outras rotinas

Este documento **não substitui** o CHANGELOG nem os commits, e não repete o que eles já dizem:

- O CHANGELOG continua ganhando sua linha curta, em português, voltada para o efeito ao usuário.
- Os commits continuam atômicos e descritivos.
- Este documento referencia os dois e adiciona o que nenhum deles carrega: o raciocínio.

Se a documentação existente (README, docs de API, `.env.example`) ficou desatualizada pela
feature, isso é trabalho separado — atualize os docs de verdade, não descreva a defasagem aqui.
