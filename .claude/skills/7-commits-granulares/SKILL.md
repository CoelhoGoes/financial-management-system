---
name: 7-commits-granulares
description: Etapa 7 de 7 do fluxo de desenvolvimento deste projeto — organiza as alterações pendentes em commits atômicos no padrão Conventional Commits, separando por hunks quando necessário, rodando os checks antes de cada commit e apresentando o plano para aprovação antes de executar; depois, e só com um sim explícito, faz push para o repositório remoto. Use depois da etapa 6, e sempre que o usuário mencionar commitar, commit, push, git, subir alterações, mandar para o remoto, organizar mudanças ou "pode salvar isso". Também serve para commitar no meio do trabalho, sem push. Ao terminar o fluxo, indica o próximo item do roadmap e a etapa 1 (/1-usecasesrefinement).
---

# Etapa 7 — Commits e envio ao remoto

1. `/1-usecasesrefinement` — casos de uso e de falha
2. `/2-technicalrefinement` — opções técnicas e decisões
3. `/3-implementation` — implementar o que foi decidido
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. `/5-securitycheck` — segurança do que foi implementado
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. **`/7-commits-granulares`** — commits e push ← você está aqui

Esta skill também roda fora do fluxo, só para commitar no meio do trabalho. Nesse caso,
pare no passo 7 e não ofereça push.

Um commit por mudança lógica. Isso não é preciosismo: é o que permite reverter uma coisa sem
reverter as outras, fazer `bisect` quando algo quebra, e revisar um diff que cabe na cabeça.

## Fluxo

### 1. Levantar o estado

```bash
git status
git diff
git diff --staged
git log --oneline -10   # para pegar o estilo de escopo já usado no projeto
```

Leia o diff inteiro antes de propor qualquer coisa. Um plano de commits feito só a partir do
`git status` erra sempre que um arquivo contém duas mudanças não relacionadas.

### 2. Checar o que não deveria estar aí

Antes do primeiro commit, confirme que nada indevido entrou:

- `.env`, credenciais, tokens, chaves
- `__pycache__/`, `.pyc`, `node_modules/`, `.venv/`
- bancos SQLite de teste, dumps, arquivos temporários
- artefatos de build, `dist/`, `.coverage`

Se algo assim aparece no `git status`, o certo é adicionar ao `.gitignore` e avisar o usuário —
não commitar e não apagar o arquivo do disco dele.

### 3. Montar e apresentar o plano

Agrupe as mudanças em commits logicamente coesos. Uma correção de estrutura de pastas e uma
feature nova não vão no mesmo commit, mesmo que tenham sido feitas na mesma sessão.

Ordene os commits de forma que **cada um deixe o repositório em estado funcional**: mudanças de
infra e estrutura antes do código que depende delas, migration antes do model que a usa, código
antes do teste que o exercita (ou juntos).

Apresente assim, e **pare para aprovação**:

```
Plano de commits:

1. chore(infra): adicionar postgres ao docker-compose
   docker-compose.yml, .env.example

2. feat(fatura): adicionar campo de vencimento
   alembic/versions/a3f9_add_vencimento.py, app/models/fatura.py

3. test(fatura): cobrir cálculo de vencimento
   tests/test_fatura.py

4. docs(fatura): documentar novo campo na API
   docs/api.md

Confirma essa ordem?
```

Não comece a commitar antes da resposta.

### 4. Separar por hunks quando preciso

Se um arquivo contém mudanças de dois commits diferentes, use `git add -p` para separar por
hunk. Não commite o arquivo inteiro "só dessa vez" — é exatamente aí que a granularidade se perde.

Quando os hunks forem interdependentes demais para separar com segurança, diga isso ao usuário e
proponha um commit combinado com justificativa, em vez de fazer a separação errada.

### 5. Rodar os checks antes de cada commit

Antes de cada commit, rode o que for relevante para aquele conjunto de arquivos:

- testes da área afetada
- linter/formatter, se o projeto usa
- `docker compose config` para validar YAML de compose
- import/build básico, se não houver suíte de testes

Se algo quebrar, **pare e avise qual mudança específica quebrou** — não continue commitando por
cima de um estado quebrado nem "conserte" silenciosamente.

### 6. Escrever a mensagem

Formato:

```
tipo(escopo): resumo curto no imperativo

Corpo explicando o porquê quando não for óbvio pelo diff.
```

**Tipos:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.

**Escopo em português**, consistente com o domínio do projeto (`fatura`, `auth`, `lancamentos`,
`infra`). Pegue o vocabulário dos commits anteriores em vez de inventar escopo novo.

**Resumo no imperativo, minúsculo, sem ponto final:** "adicionar validação de CPF", não
"adicionada validação" nem "Adiciona validação de CPF.".

O corpo é para o **porquê**, não para reescrever o diff em prosa. Se a mudança é auto-explicativa,
não force corpo.

Exemplos:

```
feat(fatura): permitir vencimento em dia não útil

O gateway aceita a data e faz o ajuste próprio para D+1. Validar aqui rejeitava
faturas legítimas geradas no fim de semana.
```

```
refactor(lancamentos): extrair cálculo de saldo para service
```

### 7. Fechar

Ao final, mostre o resultado para revisão:

```bash
git log --oneline -<n>
```

### 8. Push — só com um sim explícito

Push publica o trabalho e é difícil de desfazer. Nunca faça por conta própria, nem porque o
fluxo chegou aqui. Mostre exatamente o que vai sair:

```bash
git status -sb                                  # branch e se está à frente do remoto
git log --oneline @{upstream}..HEAD             # os commits que vão subir
```

E pergunte: **"Faço push destes <n> commits para `<remoto>/<branch>`?"** Só com um sim a esta
pergunta — não a uma anterior, não a um "pode seguir" genérico — rode `git push`.

- **Nunca** `--force` nem `--force-with-lease` sem o usuário pedir com essas palavras.
- **Push recusado** (o remoto tem commits que você não tem): pare e mostre. Não faça `pull`,
  `rebase` nem `merge` sozinho — diga o que encontrou e pergunte como ele quer integrar.
- **Sem upstream configurado:** mostre o comando (`git push -u origin <branch>`) e confirme o
  remoto e o nome da branch antes de rodar.
- Depois do push, mostre o `git status -sb` de novo para confirmar que está em dia.

## Ao terminar

Dentro do fluxo, encerre sempre com este bloco:

```
Etapa 7 de 7 concluída — <n> commits enviados para <remoto>/<branch>.
Fluxo concluído para "<item>".
Próximo item do roadmap: "<o que agora está em Em andamento no docs/roadmap.md>".
Próximo passo: 1 — casos de uso e de falha (/1-usecasesrefinement).
```

Se o usuário não quis push, diga isso no bloco ("commits locais, sem push").

E pergunte: **"Começo a etapa 1 do próximo item?"** Com um sim, chame a skill
`1-usecasesrefinement`. Com um não, pare.
