# Frontend — Gestão Financeira

React 19 + TypeScript + Vite, Tailwind CSS v4 e shadcn/ui sobre Base UI.

Para subir o projeto inteiro (backend incluso), veja o [README da raiz](../README.md).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build — é também o typecheck do projeto
npm run lint       # oxlint
npm test           # vitest (uma vez)
npm run test:watch # vitest em watch
npm run preview    # serve o build de produção
```

O backend precisa estar rodando em `http://localhost:8000`. Para apontar para outro endereço,
crie um `.env` nesta pasta:

```
VITE_API_URL=http://localhost:8000
```

## O que você precisa saber antes de escrever componente

**Isto é shadcn sobre Base UI, não sobre Radix.** A biblioteca de primitivos é
`@base-ui/react`. A maior parte dos exemplos de shadcn que você acha no Google assume Radix e
**não funciona copiando e colando** — as props e a estrutura de composição são diferentes.
Instale pelo CLI (`npx shadcn@latest add button`) em vez de copiar de um blog.

**Ícones são Remix (`@remixicon/react`), não lucide.** É o que está em `components.json`.

**Tailwind v4, sem `tailwind.config.js`.** A configuração é o plugin `@tailwindcss/vite` mais as
variáveis CSS em `src/index.css`. Se você procurar o arquivo de config, ele não existe — não é
um erro.

**Componentes shadcn instalados** (`Button`, `Input`, `Label`, `Card`, `Table`, `Chart`, `Checkbox`,
`Badge`, em `src/presentation/components/ui/`). **Antes de escrever qualquer componente à mão, veja
se o shadcn já tem** — é regra, não preferência; veja `.claude/rules/rules-frontend.md`. O `Chart`
embrulha o recharts, por isso o `TrendChart` é carregado com `lazy`: importado direto, ele dobraria
o bundle principal.

**O `cn` vem do pacote `cn`**, não de um helper local — é o pacote oficial do shadcn, que
substitui `clsx` + `tailwind-merge`, e é assim que o CLI gera os imports desde o `Table`.
Não recrie um `utils.ts` (o alias `lib` do shadcn aponta para `src/shared/`).

**Cores vêm dos tokens semânticos.** `bg-background`, `text-foreground`, `border-border`,
`text-destructive`. Nunca hex nem classes de paleta bruta (`bg-neutral-900`) — é o que mantém o
tema escuro funcionando. Já teve um bug de contraste por causa disso (veja o `CHANGELOG.md`).

**Use o alias `@/`** para imports dentro de `src/`, sem exceção (`@/data/api`,
`@/presentation/components/ui/button`).

**Navegação é `react-router`** (rotas `/login`, `/`, `/lancamentos`, `/fatura`, `/importar`
e `/configuracoes`, definidas em `App.tsx`). Tela nova precisa também da aba no `Header.tsx`
— só a rota a deixa inalcançável.
Dentro das telas, navegue com `useNavigate()`, não com `<Link>` — o `Button` do shadcn é
baseado em `@base-ui/react/button` e não tem suporte confirmado a renderizar como outro
elemento (o `asChild` do Radix), então um botão que navega usa `onClick={() => navigate(...)}`.

## Estrutura

Arquitetura em camadas: cada uma só importa a de baixo. `shared/` não importa nenhuma das
outras.

```
presentation/  ──▶  state/  ──▶  data/        (todas podem usar shared/)
```

```
src/
├── main.tsx              monta o React dentro do BrowserRouter + AuthProvider
├── App.tsx               tabela de rotas (/login, /, /lancamentos, /fatura, /importar,
│                         /configuracoes)
├── index.css             import do Tailwind + tokens de tema
├── presentation/         o que aparece na tela
│   ├── pages/            uma tela por arquivo (LoginScreen, SummaryScreen, EntryScreen,
│   │                     InvoiceScreen, ImportScreen, ConfigScreen)
│   └── components/
│       ├── Header.tsx    header/navegação compartilhado entre as telas autenticadas
│       ├── MonthNav.tsx  passo de mês, compartilhado por resumo, lançamentos e fatura
│       ├── TrendChart.tsx gráfico de tendência, carregado sob demanda
│       └── ui/           componentes shadcn (badge, button, card, chart, checkbox, input,
│                         label, table)
├── state/
│   └── auth-context.tsx  AuthProvider / useAuth — estado de sessão
├── data/
│   └── api.ts            cliente HTTP tipado — JWT, header Authorization, tratamento de 401
└── shared/
    ├── types.ts          espelho manual de backend/app/api/schemas.py
    ├── categories.ts     listas fechadas de categoria, espelha docs/dominio.md
    └── format.ts         currentMonth() / formatCurrency() / formatPercent()
                          / shiftMonth() / formatMonthShort() / formatDayMonth()
```

As telas chamam `data/api.ts` direto para buscar dados (pular `state/` é permitido — é
descer, não subir), mas o estado de sessão vem só de `useAuth()`.

## Dinheiro chega como string

O FastAPI serializa `Decimal` como string no JSON. Todo campo monetário em `types.ts` é
`string` de propósito. Converta com `Number(valor)` só na hora de formatar ou somar, e nunca
mande float de volta para a API.

## Sessão

Toda leitura de estado de autenticação passa por `useAuth()`, nunca por `api.ts` direto. O token
fica em `localStorage` sob a chave `gf:token`. Em qualquer `401`, o `api.ts` limpa o token e
lança — o chamador redireciona para o login.
