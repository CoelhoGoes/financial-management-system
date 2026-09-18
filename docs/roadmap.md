# Roadmap

Fila de trabalho do projeto: o que vem, e em que ordem.

O **porquê** de cada dívida técnica vive em `docs/dominio.md` → Dívidas conhecidas. Aqui
está só *quando* pretendemos pagá-la — não duplique a explicação.

Concluídos não ficam nesta lista: quando um item termina, ele sai daqui e o efeito para o
usuário é registrado no `CHANGELOG.md`.

## Em andamento

- [ ] (nada — a tela de configuração acabou de sair)

## Próximo

O backend já calcula fatura, categorias e tendência. O gráfico de tendência é só frontend —
o endpoint e o método em `api.js` já existem.

- [ ] Gráfico de tendência consumindo `/trend` — #4. Presets fixos de 3/6/12 meses; o
      frontend sempre envia `until` calculado no fuso do navegador, para o servidor não
      precisar adivinhar qual é o mês corrente
- [ ] Suíte de testes (pytest), começando por `service.py`
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

## Manutenção

Ao concluir um item: remova a linha daqui, registre no `CHANGELOG.md` e promova o próximo
para **Em andamento**, atualizando a linha correspondente no `CLAUDE.md`.
