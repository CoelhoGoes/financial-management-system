# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] Gerar `types.ts` a partir do OpenAPI do FastAPI. Refinado em 25/10/2026:
      - **`openapi-typescript`** como dependência de desenvolvimento, só tipos — nenhum código de
        runtime. Gera `src/shared/api-schema.d.ts` (arquivo novo). O `types.ts` vira uma camada
        de apelidos (`export type Summary = components['schemas']['Summary']`) mais
        `EntryType`/`EntryMethod`, para os 10 imports de `@/shared/types` não mudarem. O
        `api.ts` continua escrito à mão (401, `FormData`)
      - **Fonte:** script npm lendo `http://localhost:8000/openapi.json`, a API que o `./dev.sh`
        sobe. Usar `--default-non-nullable false`: sem isso, campo com default no servidor
        (`method`, `installments` do `EntryCreate`) sai obrigatório no tipo
      - **Arquivo gerado é versionado**, para o build e o deploy não dependerem da API. O
        `./dev.sh` regenera num temporário a cada início e avisa em vermelho quando difere,
        como já faz com o `alembic check` — não bloqueia
      - **Comentários do `types.ts`** (`already_imported`, `skipped`, `EntryUpdate`,
        `EntryImport`) vão para `Field(description=...)` no `schemas.py`: aparecem no `/docs` e
        no tipo gerado. Muda só o texto do OpenAPI, não o payload
      - Comparado em 25/10/2026: nenhum campo divergente entre o espelho manual e o gerado; o
        gerado é mais preciso (dinheiro de entrada é `number | string`, `EntryUpdate` aceita
        `null`)

## Próximo

Na ordem combinada em 02/10/2026: proteger o que já existe, produto, saúde do código.

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
