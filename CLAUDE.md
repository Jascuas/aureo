# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Aureo — a personal finance SaaS. Next.js 16 (App Router, React 19) frontend, Hono.js API routes running on the Edge runtime, PostgreSQL (Neon) via Drizzle ORM, Clerk for auth.

## Commands

```bash
npm run dev          # Dev server on port 4000 (not 3000)
npm run build        # Production build
npm run start         # Serve production build
npm run lint          # ESLint (flat config, eslint.config.js)

npm run db:generate   # Generate Drizzle migration from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:studio     # Drizzle Studio UI on port 5000
npm run db:up         # Drizzle-kit up
```

There is no test suite and none should be added — this project deliberately ships with zero tests (see Critical Rules below). One-off verification scripts live in `scripts/*.mjs` / `scripts/*.ts` (e.g. `node scripts/diagnose-balance-corruption.mjs`) and are run directly with `node`/`tsx`, not through a test runner.

## Critical rules (do not violate)

- **Amounts are stored in milliunits** (× 1000). Always convert at the boundary using `convertAmountToMilliunits` / `convertAmountFromMilliunits` from `lib/utils.ts`. Positive = income, negative = expense.
- **Never compute or mutate account balances in application code.** A PostgreSQL trigger (`update_account_balance()`, see `drizzle/0002_fix_balance_trigger.sql`) maintains `accounts.balance` on every transaction insert/update/delete, comparing `LOWER(transaction_type.name)` against `income`/`expense`. A prior case-sensitivity bug in this trigger silently corrupted 83% of account balances — do not reintroduce manual balance math.
- **No comments in code** — it's expected to be self-explanatory. Don't add docstrings or inline explanations.
- **No tests** — do not write, suggest, or configure a test framework.
- Use specific `select({ ... })` column lists in Drizzle queries, never `select *`.
- Git commits follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).

## Architecture

Feature-based structure. Each domain under `features/{domain}/` owns its own slice end to end:

```
features/{domain}/
  api/        React Query hooks (use-get-*, use-create-*, use-edit-*, use-delete-*)
  components/ Feature UI (forms, sheets)
  hooks/      Zustand stores for UI-only state (modal open/close)
  lib/        Business logic, algorithms, optional config.ts for constants
  types/      Feature-local types

components/       Shared UI (charts, filters, layout)
components/ui/    shadcn/ui primitives
hooks/            Global utility hooks (use-confirm, use-chart-controls)
lib/              Cross-cutting utils: utils.ts, types.ts, hono.ts (RPC client), api-errors.ts
app/
  (auth)/               Public routes
  (dashboard)/          Protected routes
  api/[[...route]]/     Hono app mounted as a single Next.js API route, one file per domain
db/                 Drizzle schema + Zod schemas derived from it (drizzle-zod)
drizzle/            Generated SQL migrations
```

Existing feature domains: `accounts`, `categories`, `transactions`, `transaction-types`, `csv-import`, `summary`.

Data flow: `Component → React Query hook (features/*/api) → Hono client (lib/hono.ts) → Hono route (app/api/[[...route]]/*.ts) → Drizzle → Postgres`. Modal/sheet visibility flows through per-feature Zustand stores instead of props drilling.

### API layer (Hono)

- Single Hono app in `app/api/[[...route]]/route.ts`, `basePath("/api")`, with one sub-router per domain (`accounts.ts`, `transactions.ts`, `categories.ts`, `csv-import.ts`, `transaction-types.ts`, `summary/`, `admin.ts`). Exports `AppType` for end-to-end type inference on the client.
- Client: `lib/hono.ts` builds `hc<AppType>(...)`; feature hooks call `client.api.<domain>.$get/$post/...`.
- Auth is checked in four layers: global `middleware.ts`, per-route `clerkMiddleware()`, an explicit `if (!auth?.userId)` guard, and a row-level `.where(eq(table.userId, auth.userId))` filter (via `innerJoin` to `accounts` for tables like `transactions` that don't carry `userId` directly).
- Validation via `@hono/zod-validator`'s `zValidator("json" | "query" | "param", schema)`, built from `drizzle-zod` schemas in `db/schema.ts` (e.g. `insertAccountSchema.pick({ name: true })`).
- Errors must use the shared constants in `lib/api-errors.ts` (`API_ERRORS.UNAUTHORIZED`, `NOT_FOUND`, `INTERNAL_ERROR`, `INVALID_REQUEST`, etc.) — never inline error strings.

### Database (Drizzle + Postgres)

- Core tables: `accounts` (balance in milliunits, trigger-managed), `categories` (self-referencing `parentId` for hierarchy), `transactions` (`accountId` CASCADE, `categoryId` SET NULL, `transactionTypeId` required), `transaction_types` (fixed rows: Income/Expense/Transfer, referenced by known ids in `.opencode/docs/database-schema.md`).
- IDs are `text` primary keys generated with `createId()` from `@paralleldrive/cuid2`, not serial/uuid.
- Zod schemas are derived from the Drizzle schema (`createInsertSchema` in `db/schema.ts`) and reused for both form validation and API validation.

### State management

- **React Query** for all server state. Query keys: `["accounts"]`, `["account", { id }]`, `["transactions", { from, to }]`, `["summary"]`. Default `staleTime` is 60s (`providers/query-provider.tsx`).
- Mutations invalidate related query keys explicitly — there is **no optimistic-update pattern** in this codebase. E.g. mutating an account invalidates `accounts`, `transactions`, and `summary`; mutating a category also invalidates `transactions` (categories are displayed there).
- **Zustand** is used only for ephemeral UI state — specifically sheet/modal open state per entity (`useNewAccount`, `useOpenAccount`, etc.), never for server data.

### Conventions

- Files: `kebab-case` throughout (`new-account-sheet.tsx`, `use-get-accounts.ts`).
- Prefer `type` over `interface`; types are co-located in the file that uses them unless truly global (`lib/types.ts`).
- Imports are auto-sorted by `eslint-plugin-simple-import-sort` into: external packages (alphabetical) → `@/`-aliased internal imports (alphabetical) → relative imports.
- For features with 5+ tunable constants (batch sizes, thresholds, AI hyperparameters), centralize them in a `lib/config.ts` with an `as const` object (see `features/csv-import/lib/config.ts`).

## More detail

The `.opencode/docs/` directory has deeper documentation that predates this file and remains authoritative for its topics:

- `.opencode/docs/architecture.md` — feature scaffolding walkthrough, DB trigger details
- `.opencode/docs/database-schema.md` — full table/relation reference, transaction-type IDs
- `.opencode/docs/api-patterns.md` — full CRUD endpoint template, validation patterns
- `.opencode/docs/state-management.md` — query/mutation hook templates, invalidation matrix
- `.opencode/docs/github-workflow.md` — task/issue workflow
- `.opencode/docs/agent-delegation.md` — how the `.opencode` agents divide work
