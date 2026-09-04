---
name: commits-granulares
description: Organiza as alterações pendentes do repositório em uma sequência de commits atômicos no padrão Conventional Commits, separando por hunks quando necessário, rodando os checks antes de cada commit e sempre apresentando o plano de commits para aprovação antes de executar. Use sempre que o usuário mencionar commitar, commit, git, subir alterações, organizar mudanças ou "pode salvar isso", e sempre que terminar uma feature ou refactor com várias mudanças no working directory. Ao concluir qualquer trabalho de código, ofereça esta organização mesmo sem o usuário pedir.
---

# Commits granulares

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

**Não faça push.** O push é decisão do usuário — apresente o log e espere.
