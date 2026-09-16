# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] (nada — a tela de fatura acabou de sair)

## Próximo

O backend já calcula fatura, categorias e tendência. Os itens abaixo são só frontend: os
endpoints e os métodos em `api.js` já existem.

- [ ] Resumo por categoria: exibir `by_category`, que o `/summary` já devolve — #3
- [ ] Gráfico de tendência de 6 meses consumindo `/trend` — #4
- [ ] Completar `SummaryScreen`: hoje ignora `invoice`, `extra_income` e `cash_expenses`
- [ ] Suíte de testes (pytest), começando por `service.py`

## Depois

- [ ] Rever `Select` do shadcn para campos de escolha fechada (categoria/tipo/método);
      `EntryScreen` usa `<select>` nativo e botões de toggle hoje
- [ ] Mover `api.js` para `src/api.ts` tipado
- [ ] Gerar `types.ts` a partir do OpenAPI do FastAPI
- [ ] Adicionar Alembic quando houver dado real que não possa ser perdido
- [ ] Filtrar lançamentos no SQL em `/summary` e `/trend`, se ficar lento
- [ ] Deploy: backend em Railway / Render / Fly.io; frontend na Vercel

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
