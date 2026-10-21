---
paths:
  - "frontend/**"
---

# Frontend

`src/` is layered — `presentation/` → `state/` → `data/`, with `shared/` usable by all and
importing none of them. The dependency rule is in `CLAUDE.md` → **Architecture**.

- **`data/api.ts`** — the typed HTTP client. Each method declares its response type from
  `shared/types.ts`, so screens get typed data without casting. On any `401` it clears the stored
  JWT and throws so the caller can redirect to login. Reads `VITE_API_URL`, defaulting to
  `http://localhost:8000`. Token lives in `localStorage` under `gf:token`. It declares
  `Content-Type: application/json` **except** when the body is a `FormData` (the OFX upload in
  `previewImport`): there the browser must set the header itself, because only it knows the
  multipart boundary. Declaring it by hand makes the request arrive unparseable.
- **`state/auth-context.tsx`** — `AuthProvider` wraps the app in `main.tsx` and owns `user`,
  `loading`, `error`. On mount, if a token exists it calls `/auth/me` to rehydrate the session.
  `useAuth()` throws outside the provider. All screens read auth state from here, never from
  `data/api.ts` directly. `updateUser(user)` applies the `UserOut` returned by a `PUT /auth/me`
  (used by `ConfigScreen`) so the provider stays fresh without a second `GET`.
- **`state/theme.ts`** — light/dark/system, saved per device in `localStorage` under
  `gf:theme` (no key = follow `prefers-color-scheme`). The inline script in `index.html` repeats
  the same rule so the `.dark` class is on `<html>` before the first paint — change one, change
  the other. `followSystemTheme()` runs once in `main.tsx`.
- **`shared/types.ts`** — hand-maintained mirror of `backend/app/api/schemas.py`. **When you
  change a Pydantic schema, update this file in the same commit** — nothing enforces the
  correspondence.
- **`shared/categories.ts`** — `GASTO_CATEGORIES`/`ENTRADA_CATEGORIES`, hand-maintained
  mirror of the closed lists in `docs/dominio.md`. Same rule as `types.ts`: keep both in sync,
  don't invent a new category here without updating `docs/dominio.md` too.
- **`shared/format.ts`** — `currentMonth()` (`SummaryScreen`, `EntryScreen`, `InvoiceScreen`),
  `formatCurrency()` (those three plus `ImportScreen` and `TrendChart`), `formatPercent()`
  (`SummaryScreen`), `shiftMonth()` (`MonthNav`, which every month stepper goes
  through), `formatMonthShort()` (`TrendChart`) and `formatDayMonth()` (`ImportScreen`, which
  shows a statement line as `21/09` — the year is noise inside one statement). Money and
  percentages go through `Intl.NumberFormat('pt-BR')`, so they read `4.057,30` and `49,4%` —
  never format a number inline in a screen.
- **`presentation/components/`** (outside `ui/`) — `Header` is the nav bar every authenticated
  screen mounts; its button row wraps (`flex-wrap`) because four tabs plus the gear and "Sair" do
  not fit one line on a phone. `MonthNav` is the month stepper shared by `SummaryScreen`,
  `EntryScreen` and `InvoiceScreen`, and deliberately does **not** use the shadcn `Pagination` —
  that one renders anchors, since it was built for pages that have a URL, and an anchor without
  `href` breaks keyboard and screen reader. `TrendChart` is lazy-loaded from `SummaryScreen`
  (`React.lazy` + `Suspense`) so recharts stays out of the main bundle.
- **Tests** — `npm test` (vitest + jsdom, config in `vite.config.ts`). `shared/format.test.ts`
  covers the pure helpers; every screen and both shared components have a `.test.tsx` beside them,
  rendering with `@testing-library/react` and mocking `@/data/api`. Mock fixtures are typed against
  `shared/types.ts`, so a fixture with a wrong field type fails `npm run build`. Those mocks are
  hand-written, so they do **not** catch a backend contract change — a field can disappear from
  `Summary` and the test stays green. The gap is wider than it looks for the OFX upload: the
  multipart request itself is never exercised here (vitest mocks `@/data/api`) nor in pytest (which
  runs no JavaScript), so that seam is only ever checked by hand.
- **`App.tsx`** — route table only (`/login`, `/`, `/lancamentos`, `/fatura`, `/importar`,
  `/configuracoes`), via `react-router`. `main.tsx` wraps the app in `BrowserRouter` +
  `AuthProvider`. Screens live one per file in `src/presentation/pages/` (`LoginScreen`,
  `SummaryScreen`, `EntryScreen`, `InvoiceScreen`, `ImportScreen`, `ConfigScreen`). A new screen
  also needs its tab in `Header.tsx` — the route alone leaves it unreachable. Navigate with
  `useNavigate()`, not `<Link>` — the shadcn `Button` (Base UI) has no confirmed support for
  rendering as another element (Radix's `asChild`).

### Money in the frontend

FastAPI serializes `Decimal` as a **string**. Every money field in `types.ts` is typed `string`
on purpose. Always `Number(value)` before arithmetic or formatting, and never send a JS float
back — the backend expects a string or number it can parse into `Decimal` exactly.

### UI conventions

- **Tailwind CSS v4**, configured via the `@tailwindcss/vite` plugin. There is no
  `tailwind.config.js` — theme tokens are CSS variables in `src/index.css`.
- **shadcn/ui on Base UI, not Radix.** `@base-ui/react` is the primitive library. Most
  shadcn snippets found online assume Radix and will not work as-is. Icons come from
  `@remixicon/react`, not lucide.
- Style preset is `base-nova`, base color `neutral`, with `cssVariables: true`.
- **Check shadcn before building anything by hand.** Search the registry
  (`npx shadcn@latest search <termo>`, or the catalogue in `.agents/skills/shadcn/`) *before*
  writing a component yourself or reaching for another library. The theme already ships the
  tokens its components expect — semantic colours and `--chart-1..5` — so anything hand-rolled
  falls outside that consistency. If shadcn has it and you still choose not to use it, say why.
  This rule fires **before** the decision, not after: it is what stops a hand-made bar chart
  from being written when `Chart` exists.
- **Installed so far**: `Button`, `Input`, `Label`, `Card`, `Table`, `Chart`, `Checkbox`,
  `Badge`, `Toggle`, `ToggleGroup` (`src/presentation/components/ui/`). `Chart` wraps recharts — that is why
  `TrendChart` is lazy-loaded (see the `presentation/components/` item above).
  Install more with the shadcn CLI (`npx shadcn@latest add <name>`) rather than writing them by
  hand. Closed-choice fields (category/type/method in `EntryScreen`) still use a native
  `<select>`/toggle `Button`s, not shadcn `Select` — see the item in `docs/roadmap.md`.
- Use the `@/` alias for every import inside `src/` (`@/presentation/components/ui/button`,
  `@/data/api`). `components.json` aliases point into `src/presentation/`, so the shadcn CLI
  writes new components there.
- Compose with `cn()` from the **`cn` package** (`import { cn } from 'cn'`), the official shadcn
  replacement for `clsx` + `tailwind-merge`. There is no `utils.ts` (the shadcn `lib` alias
  points to `src/shared/`) — do not create one.
- Colors come from the semantic tokens (`bg-background`, `text-foreground`, `border-border`,
  `text-destructive`), never hardcoded hex or raw palette classes — that's what keeps dark mode
  working.

## Reminders that apply here

- Never reimplement invoice, balance or installment math here — call the API.
- Changing `types.ts` means the backend schema changed too; keep them in the same commit.
