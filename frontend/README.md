# Frontend — Gestão Financeira

React 19 + TypeScript + Vite, Tailwind CSS v4 e shadcn/ui sobre Base UI.

Para subir o projeto inteiro (backend incluso), veja o [README da raiz](../README.md).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build — é também o typecheck do projeto
npm run lint       # oxlint
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

**Os primeiros componentes shadcn já estão instalados** (`Button`, `Input`, `Label`, `Card`,
`Table`, em `src/components/ui/`) e substituíram os `<input>`/`<button>` crus que existiam em
`App.tsx`. Instale os próximos componentes pelo CLI, no mesmo padrão.

**O `cn` vem do pacote `cn`**, não de um helper local — é o pacote oficial do shadcn, que
substitui `clsx` + `tailwind-merge`, e é assim que o CLI gera os imports desde o `Table`.
Não recrie um `src/lib/utils.ts`.

> **Em observação:** o `components.json` ainda declara `"utils": "@/lib/utils"`, alias que
> aponta para um arquivo que não existe mais. Ficou assim de propósito: o CLI novo aparenta
> não usar esse alias, mas isso não foi verificado. O próximo `npx shadcn add` confirma — se
> o componente gerado vier com import quebrado, é aqui que está a causa.

**Cores vêm dos tokens semânticos.** `bg-background`, `text-foreground`, `border-border`,
`text-destructive`. Nunca hex nem classes de paleta bruta (`bg-neutral-900`) — é o que mantém o
tema escuro funcionando. Já teve um bug de contraste por causa disso (veja o `CHANGELOG.md`).

**Use o alias `@/`** para imports dentro de `src/`. A exceção é `api.js`, que fica fora de
`src/` e é importado por caminho relativo.

**Navegação é `react-router`** (rotas `/login`, `/`, `/lancamentos`, `/fatura` e
`/configuracoes`, definidas em
`App.tsx`).
Dentro das telas, navegue com `useNavigate()`, não com `<Link>` — o `Button` do shadcn é
baseado em `@base-ui/react/button` e não tem suporte confirmado a renderizar como outro
elemento (o `asChild` do Radix), então um botão que navega usa `onClick={() => navigate(...)}`.

## Estrutura

```
api.js                    cliente HTTP — JWT, header Authorization, tratamento de 401
src/
├── main.tsx              monta o React dentro do BrowserRouter + AuthProvider
├── App.tsx               tabela de rotas (/login, /, /lancamentos, /fatura, /configuracoes)
├── types.ts              espelho manual de backend/app/schemas.py
├── index.css             import do Tailwind + tokens de tema
├── pages/                 uma tela por arquivo (LoginScreen, SummaryScreen, EntryScreen,
│                          InvoiceScreen, ConfigScreen)
├── constants/
│   └── categories.ts     listas fechadas de categoria, espelha docs/dominio.md
├── components/
│   ├── Header.tsx        header/navegação compartilhado entre as telas autenticadas
│   └── ui/                componentes shadcn (button, card, input, label, table)
└── lib/
    ├── auth-context.tsx  AuthProvider / useAuth — estado de sessão
    └── format.ts         currentMonth() / formatCurrency() / formatPercent()
                          / shiftMonth()
```

## Dinheiro chega como string

O FastAPI serializa `Decimal` como string no JSON. Todo campo monetário em `types.ts` é
`string` de propósito. Converta com `Number(valor)` só na hora de formatar ou somar, e nunca
mande float de volta para a API.

## Sessão

Toda leitura de estado de autenticação passa por `useAuth()`, nunca por `api.js` direto. O token
fica em `localStorage` sob a chave `gf:token`. Em qualquer `401`, o `api.js` limpa o token e
lança — o chamador redireciona para o login.
