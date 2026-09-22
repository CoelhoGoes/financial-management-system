# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] (nada — o gráfico de tendência acabou de sair)

## Próximo

- [ ] Ampliar a suíte de testes: tela de fatura; expiração do JWT; recusa de subir sem
      `JWT_SECRET` (precisa de subprocesso, porque o erro acontece no import). Já cobertos:
      `/trend`, `/invoices/{month}` e as telas de resumo, lançamentos, configuração e login
- [ ] Navegação entre meses na tela de resumo — a tela de fatura já tem; o certo é extrair
      um controle compartilhado em vez de duplicar

## Depois

- [ ] Rever `Select` do shadcn para campos de escolha fechada (categoria/tipo/método);
      `EntryScreen` usa `<select>` nativo e botões de toggle hoje
- [ ] Mover `api.js` para `src/api.ts` tipado
- [ ] Gerar `types.ts` a partir do OpenAPI do FastAPI
- [ ] Adicionar Alembic quando houver dado real que não possa ser perdido
- [ ] Filtrar lançamentos no SQL em `/summary` e `/trend`, se ficar lento
- [ ] Deploy: backend em Railway / Render / Fly.io; frontend na Vercel
- [ ] Tema escuro: os tokens `.dark` já existem em `src/index.css`, mas nada aplica a classe.
      Precisa de um toggle nas configurações do app e, por padrão, seguir a preferência do
      sistema (`prefers-color-scheme`), com a escolha manual sobrepondo o padrão
- [ ] Endpoint de exclusão de conta: hoje dá para criar usuário e apagar lançamento, mas não
      apagar o próprio usuário — só com SQL direto no banco. Ficou evidente quando uma conta
      de teste entrou no banco de desenvolvimento e não teve como removê-la pela API
- [ ] Reavaliar o `deptry` (dependências Python declaradas e nunca importadas) quando o
      `requirements.txt` crescer. Testado em 18/09/2026 com 8 dependências: 5 achados, 5 falsos
      positivos — `uvicorn` vem do `CMD` do Dockerfile, `psycopg` da string da `DATABASE_URL`,
      `python-multipart` é importado pelo próprio FastAPI, e `pyjwt` tem nome de pacote
      diferente do módulo (`jwt`). Daria para configurar em `backend/pyproject.toml` com
      `[tool.deptry.package_module_name_map]` e `[tool.deptry.per_rule_ignores]`, mas a lista de
      ignorados vira mais uma coisa a manter em sincronia, e hoje a lista inteira de
      dependências cabe na cabeça

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
