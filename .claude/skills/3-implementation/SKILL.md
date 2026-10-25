---
name: 3-implementation
description: Etapa 3 de 7 do fluxo de desenvolvimento deste projeto — implementa exatamente o que a etapa 2 decidiu, com um teste por caso de uso e de falha, rodando todos os checks do backend e do frontend e verificando na tela quando há interface. Para e volta à etapa 2 se surgir decisão nova. Use depois da etapa 2, ou quando o usuário disser "pode implementar", "pode seguir com a implementação". Termina indicando a etapa 4 (/4-revisao-estrutural).
---

# Etapa 3 — Implementação

1. `/1-usecasesrefinement` — casos de uso e de falha
2. `/2-technicalrefinement` — opções técnicas e decisões
3. **`/3-implementation`** — implementar o que foi decidido ← você está aqui
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. `/5-securitycheck` — segurança do que foi implementado
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. `/7-commits-granulares` — commits e push

O contrato foi acordado na etapa 2; aqui você decide sozinho **como** implementá-lo (nomes,
organização interna) e mais nada.

## Entrada

`docs/features/<arquivo>.md` com status `refinado`: casos numerados, **Decisões** e **Plano de
implementação** preenchidos. Sem isso, volte para a etapa 2.

Antes de escrever código, leia a rule de cada metade que o plano toca
(`.claude/rules/rules-backend.md`, `.claude/rules/rules-frontend.md`) e os invariantes do
`CLAUDE.md` (dinheiro em `Decimal`, regra de negócio só em `domain/service.py`, escopo por
`user.id` do JWT, regra das camadas).

## Decisão nova no meio do caminho

Se a implementação esbarra em algo que a etapa 2 não cobriu — um conflito de dependência, uma
opção que a biblioteca não tem, uma regra que a escolha quebraria — **pare e pergunte** com as
opções e o que você verificou. Não contorne em silêncio. Registre a resposta em **Decisões**
no documento antes de seguir.

## Testes

- **Ao menos um teste por caso** do documento, citando o número no nome ou num comentário
  quando ajudar (`F3`). Caso que não dá para testar automaticamente vai para a verificação
  manual abaixo, dito explicitamente.
- **Confira que o teste pega o defeito:** quando possível, rode-o contra o código antigo
  (`git stash`/`git show HEAD:<arquivo>`) e veja falhar. Teste que passa com e sem a mudança não
  protege nada.
- Regra de negócio nova vai em `domain/service.py` com teste em `test_service.py` no mesmo
  commit; contrato HTTP em `test_api.py`; tela no `.test.tsx` ao lado dela.

## Checks — todos, não só os da área

```bash
# Backend (sem venv: ambiente efêmero, nada instalado no projeto)
cd backend && uv run --no-project --with-requirements requirements.txt \
  --with-requirements requirements-dev.txt pytest -q
uvx ruff check backend/

# Frontend
cd frontend && npm run build && npm test && npm run lint
```

Conforme o que mudou:

- **Modelo do banco:** migração pelo guia do README ("Criar uma migração"), revisada à mão,
  `alembic check` limpo, e a suíte inteira contra um Postgres temporário (comando no README)
  — inclui `test_migrations.py`, que no sqlite é pulado
- **Schema Pydantic:** `docker compose restart api` (o container roda sem `--reload`) e
  `cd frontend && npm run gen:types`
- **Dependência nova:** compare `npm audit` / `pip-audit` antes e depois — a etapa 5 precisa
  saber o que foi introduzido e o que já existia

Warning de lint que já existia antes não é seu; warning novo é.

## Verificação na tela

Mudança de interface só está pronta depois de vista. Com a API de pé, suba o Vite e use o
navegador do app:

- tela de celular (375px) **e** os dois temas, claro e escuro
- precisa de login: crie uma conta descartável na API de desenvolvimento (e-mail em
  `example.com` — o `EmailStr` recusa `.test`), e **apague-a por SQL ao terminar**
- endpoint novo: exercite com `curl` contra a API de desenvolvimento, incluindo os casos de
  falha, e apague o que criar

Ao parar o Vite, não use um `pkill` cujo padrão case com a própria linha de comando — o
shell que roda a limpeza morre junto. `pkill -f "[v]ite --port 5173"` evita isso.

## O que entregar

Atualize o status para `implementado` no índice de `docs/features/`. Anote para a etapa 6 o
que só a implementação revelou: armadilhas reais, desvios do plano e o motivo, edições locais
em arquivos de terceiros (componente shadcn, por exemplo).

Reporte ao usuário: o que mudou por camada, como foi verificado (contagens de teste, o que foi
visto na tela), e o que **não** foi verificado.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 3 de 7 concluída — implementado e verificado (<resumo dos checks>).
Próximo passo: 4 — revisão estrutural (/4-revisao-estrutural).
```

E pergunte: **"Sigo para a etapa 4?"** Com um sim, chame a skill `4-revisao-estrutural`. Com
um não, pare.
