---
paths:
  - "frontend/**"
---

# Frontend

- **`api.js`** — the HTTP client. On any `401` it clears the stored JWT and throws so the caller
  can redirect to login. Reads `VITE_API_URL`, defaulting to `http://localhost:8000`. Token
  lives in `localStorage` under `gf:token`.
- **`auth-context.tsx`** — `AuthProvider` wraps the app in `main.tsx` and owns `user`,
  `loading`, `error`. On mount, if a token exists it calls `/auth/me` to rehydrate the session.
  `useAuth()` throws outside the provider. All screens read auth state from here, never from
  `api.js` directly.
- **`types.ts`** — hand-maintained mirror of `backend/app/schemas.py`. **When you change a
  Pydantic schema, update this file in the same commit** — nothing enforces the correspondence.
- **`constants/categories.ts`** — `GASTO_CATEGORIES`/`ENTRADA_CATEGORIES`, hand-maintained
  mirror of the closed lists in `docs/dominio.md`. Same rule as `types.ts`: keep both in sync,
  don't invent a new category here without updating `docs/dominio.md` too.
- **`lib/format.ts`** — `currentMonth()` and `formatCurrency()` (used by `SummaryScreen`,
  `EntryScreen` and `InvoiceScreen`), `formatPercent()` (`SummaryScreen`) and `shiftMonth()`
  (`InvoiceScreen`). Money and percentages go through `Intl.NumberFormat('pt-BR')`, so they
  read `4.057,30` and `49,4%` — never format a number inline in a screen.
- **`App.tsx`** — route table only (`/login`, `/`, `/lancamentos`, `/fatura`), via `react-router`.
  `main.tsx` wraps the app in `BrowserRouter` + `AuthProvider`. Screens live one per file in
  `src/pages/` (`LoginScreen`, `SummaryScreen`, `EntryScreen`). Navigate with `useNavigate()`,
  not `<Link>` — the shadcn `Button` (Base UI) has no confirmed support for rendering as
  another element (Radix's `asChild`).

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
- **Installed so far**: `Button`, `Input`, `Label`, `Card` (`src/components/ui/`). Install more
  with the shadcn CLI (`npx shadcn@latest add <name>`) rather than writing them by hand, so the
  tokens and variants stay consistent. Closed-choice fields (category/type/method in
  `EntryScreen`) still use a native `<select>`/toggle `Button`s, not shadcn `Select` — see the
  "Revisit shadcn Select" item in `CLAUDE.md`'s Planned next steps.
- Use the `@/` alias for imports inside `src/` (`@/lib/utils`, `@/components/ui/button`).
  `api.js` is the exception — it sits outside `src/` and is imported by relative path.
- Compose with `cn()` from `@/lib/utils` when merging class names conditionally.
- Colors come from the semantic tokens (`bg-background`, `text-foreground`, `border-border`,
  `text-destructive`), never hardcoded hex or raw palette classes — that's what keeps dark mode
  working.

## Reminders that apply here

- Never reimplement invoice, balance or installment math here — call the API.
- Changing `types.ts` means the backend schema changed too; keep them in the same commit.
