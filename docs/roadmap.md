# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] Atualizar o `.claude/rules/rules-backend.md`: o item do `ofx.py` diz que só a fatura de
      cartão é recusada, mas o arquivo misto e o extrato de investimentos também são; a lista de
      testes não tem o `test_migrations.py`; e o item do `alembic/` ainda diz que os testes não
      perceberiam um modelo sem migração. Editar `.claude/rules/` precisa de autorização
      explícita

## Próximo

Na ordem combinada em 02/10/2026: proteger o que já existe, produto, saúde do código.

- [ ] `InvoiceScreen`: o `useEffect` não lista `loadData` nas dependências (aviso
      `exhaustive-deps` do oxlint). Funciona hoje, mas é o padrão que o `EntryScreen` trocou
      por um efeito dependente do mês, com flag `ativo` e chave de recarga
- [ ] Guia de "como criar uma migração" no README: hoje só o `.claude/rules/rules-backend.md`
      explica o `alembic revision --autogenerate` e o `alembic check`
- [ ] Tema escuro: os tokens `.dark` já existem em `src/index.css`, mas nada aplica a classe.
      Precisa de um toggle nas configurações do app e, por padrão, seguir a preferência do
      sistema (`prefers-color-scheme`), com a escolha manual sobrepondo o padrão
- [ ] Endpoint de exclusão de conta: hoje dá para criar usuário e apagar lançamento, mas não
      apagar o próprio usuário — só com SQL direto no banco. Ficou evidente quando uma conta
      de teste entrou no banco de desenvolvimento e não teve como removê-la pela API
- [ ] Rever `Select` do shadcn para campos de escolha fechada (categoria/tipo/método);
      `EntryScreen` usa `<select>` nativo e botões de toggle hoje
- [ ] Mover `api.js` para `src/api.ts` tipado
- [ ] Gerar `types.ts` a partir do OpenAPI do FastAPI
- [ ] Acelerar os 8 testes de `TestFailFastDoSegredo`: cada um sobe um subprocesso Python para
      importar o app, e juntos somaram ~16s de 37s na medição de 02/10/2026
- [ ] Reavaliar o `deptry` (dependências Python declaradas e nunca importadas) quando o
      `requirements.txt` crescer. Testado em 18/09/2026 com 8 dependências: 5 achados, 5 falsos
      positivos — `uvicorn` vem do `CMD` do Dockerfile, `psycopg` da string da `DATABASE_URL`,
      `python-multipart` é importado pelo próprio FastAPI, e `pyjwt` tem nome de pacote
      diferente do módulo (`jwt`). Daria para configurar em `backend/pyproject.toml` com
      `[tool.deptry.package_module_name_map]` e `[tool.deptry.per_rule_ignores]`, mas a lista de
      ignorados vira mais uma coisa a manter em sincronia, e hoje a lista inteira de
      dependências cabe na cabeça
- [ ] Filtrar lançamentos no SQL em `/summary` e `/trend`, se ficar lento

## Depois

- [ ] Deploy: backend em Railway / Render / Fly.io; frontend na Vercel
- [ ] Limite de tamanho de corpo no servidor (uvicorn ou proxy) antes do deploy: o 413 do
      upload de OFX só dispara depois que o corpo inteiro chegou — limita a memória do
      processo, não o tráfego

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
