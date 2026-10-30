# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] Dia em que a renda cai (ex.: "todo último dia útil do mês"). Pedido em 30/10/2026, na
      etapa 2 do saldo cumulativo, que trata a renda só por mês e ano; o usuário quer tratar
      o dia com mais foco, logo em seguida. Ainda sem casos levantados — o que o dia muda no
      cálculo é a primeira pergunta

## Próximo

Na ordem combinada em 02/10/2026: proteger o que já existe, produto, saúde do código.

- [ ] Revisar a estrutura do frontend quanto aos componentes: confirmar que cada componente
      está no próprio arquivo, sem dividir arquivo com outros. Pedido em 29/10/2026, depois de
      separar a rosca do `TrendChart.tsx` na revisão estrutural do layout para desktop
- [ ] Validar a categoria contra a lista fechada também no servidor. Hoje `EntryCreate.category`
      aceita qualquer texto de 1 a 50 caracteres (`schemas.py`); a lista de `docs/dominio.md` só
      é imposta pelo seletor do frontend. Achado da revisão de segurança de 29/10/2026 — uma
      categoria como `x:red}body{display:none}` chegou a injetar CSS na rosca (corrigido no
      front). Muda o contrato da API (422 para categoria fora da lista) e precisa decidir o que
      fazer com lançamentos já gravados fora dela
- [ ] Filtrar lançamentos no SQL em `/summary` e `/trend`, se ficar lento

## Depois

- [ ] Reavaliar o `deptry` (dependências Python declaradas e nunca importadas) quando o
      `requirements.txt` crescer. Testado em 18/09/2026 com 8 dependências: 5 achados, 5 falsos
      positivos — `uvicorn` vem do `CMD` do Dockerfile, `psycopg` da string da `DATABASE_URL`,
      `python-multipart` é importado pelo próprio FastAPI, e `pyjwt` tem nome de pacote
      diferente do módulo (`jwt`). Daria para configurar em `backend/pyproject.toml` com
      `[tool.deptry.package_module_name_map]` e `[tool.deptry.per_rule_ignores]`, mas a lista de
      ignorados vira mais uma coisa a manter em sincronia, e hoje a lista inteira de
      dependências cabe na cabeça
- [ ] Tirar o `overrides` de `deepmerge` (fixado em 4.1.2) do `frontend/package.json` quando
      sair versão corrigida do GHSA-gcqx-w48m-w2h4. Entra pelo CLI do `shadcn`, que pede
      `^4.3.1`. Motivo em `docs/features/2026-10-26-vulnerabilidades-do-frontend.md`
- [ ] Anotar como `Mapped[Decimal]` as colunas de dinheiro de `models.py` (`Entry.amount`,
      `Income.amount`), hoje `Mapped[float]`. A coluna é `Numeric` e já devolve `Decimal`, então
      só a anotação está errada. Achado da revisão estrutural do saldo cumulativo, 30/10/2026
- [ ] Deploy: backend em Railway / Render / Fly.io; frontend na Vercel
- [ ] Limite de tamanho de corpo no servidor (uvicorn ou proxy) antes do deploy: o 413 do
      upload de OFX só dispara depois que o corpo inteiro chegou — limita a memória do
      processo, não o tráfego

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
