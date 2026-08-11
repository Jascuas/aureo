# Refactors

20 reuse/simplification/efficiency opportunities merged from 9 audit agents, ranked by impact. The most important item is #1: replacing the per-row csv-import matcher loops with set-based SQL — it collapses the ~4,000-round-trip `/analyze` path (bugs.md #10) into a handful of queries and is the single highest-latency fix available. #2 (a query-key factory) and #3 (a shared ownership-scoping helper) are the structural fixes for the two worst bug clusters (stale dashboard, cross-tenant writes).

## High impact

### 1. Batch the csv-import matchers into set-based SQL `[performance]` `[csv-import]`
`features/csv-import/lib/duplicate-matcher.ts` (one exact + one fuzzy query per row; TODO at ~:131 already acknowledges it), `payee-category-matcher.ts:113-121` (two per payee), `transaction-categorizer.ts:44-57` (few-shot query per row). Join input rows via `unnest()`/`VALUES` against `transactions` for exact matches and one lateral-join query for fuzzy; fetch few-shot examples for all payees in one query. Collapses ~2,000–4,000 round trips into 2–4 per phase.

### 2. Centralized query-key factory; align summary keys with the invalidation matrix `[performance]` `[architecture]`
A `lib/query-keys.ts` (`queryKeys.summary.overview(params)`, `queryKeys.transactions.list(filters)`, …) consumed by both queries and invalidations would have made the `["summary"]` divergence (bugs.md #5) a type error instead of a silent no-op. Minimum viable version: rename the five summary hooks' keys to nest under `["summary", ...]` — one line each, fixes the stale dashboard without touching any mutation.

### 3. Shared ownership-scoping helper for all transaction write paths `[security]` `[transactions]`
The `db.$with(...).select(id).innerJoin(accounts)...where(userId)` CTE is duplicated at `transactions.ts:174-185`, `:247-253`, `:289-295` — and is exactly what POST/bulk-create/PATCH-accountId are missing (bugs.md #1). One helper taking an id filter fixes the duplication and the security gaps together.

## Medium impact

### 4. Mount auth middleware once at the app level `[security]`
`clerkMiddleware(), requireAuth` is copy-pasted onto ~25 endpoints across all 7 route files; with no effective global backstop (bugs.md #43), forgetting the pair on a new endpoint ships an unauthenticated route. `app.use("/api/*", ...)` in `route.ts`, or a real matcher in `proxy.ts`.

### 5. Delete the dead-code clusters `[summary]` `[csv-import]` `[architecture]` `[performance]`
- Charts: `payee-chart/payee-chart.tsx`, `account-chart/account-chart.tsx`, `time-series/variants/bar-variant.tsx`, `time-series-tooltip.tsx`, `category-chart/variants/{pie,radar,radial}-variant.tsx`, `tooltips/pie-tooltip.tsx` — never imported; downstream, `use-get-payee-summary.ts` and the whole `by-payee.ts` route serve only the dead `PayeeChart`.
- csv-import: `lib/column-detector.ts` (the real format detector — wire it in to fix bugs.md #6, or delete), `api/use-detect-duplicates.ts`, `api/use-match-payees.ts`, `resolveTransactionTypeByAmount` (`payee-category-matcher.ts:88-104` — its `?? typeName` fallback is an FK bomb if ever wired).
- Legacy import flow: `app/(dashboard)/transactions/import-card.tsx`, `import-table.tsx`, `table-head-select.tsx`, `upload-button.tsx` — orphaned by `features/csv-import`.
- Scaffolding: `app/(spacing-demo)/` (4 files shipped as public routes), `config/index.ts` (0 bytes), `types/api.ts` (zero imports), `calculateBalanceForPeriod` (`lib/balance-utils.ts:126-183`), `TransactionTypeList` (`lib/api-types.ts:35-38`), unused deps `react-icons`/`framer-motion` in `package.json`, plus small unused imports/exports flagged by lint (`csv-import.ts:65`, `new-transaction-sheet.tsx:35`, `lib/utils.ts:5`, `file-upload-section.tsx:6`, `use-analyze-retry.ts:1`).

### 6. Extract the triplicated form schemas in all three CRUD domains `[accounts]` `[categories]` `[transactions]`
The same zod schema + `FormValues` type is defined three times per domain: `account-form.tsx:18-22`/`new-account-sheet.tsx:16-20`/`edit-account-sheet.tsx:20-24`; `category-form.tsx:19-24`/`new-category-sheet.tsx:17-22`/`edit-category-sheet.tsx:22-27`; `transaction-form.tsx:25-33`/`new-transaction-sheet.tsx:23-33`/`edit-transaction-sheet.tsx:27-37`. The sheet copies are underscore-prefixed dead values existing only for type inference. Export once from the form (or a feature `types/`) and delete the copies.

### 7. Fix the app→features dependency inversion `[architecture]`
`features/transactions/components/columns.tsx:8-10`, `features/accounts/components/columns.tsx:6`, `features/categories/components/columns.tsx:7` import `Actions`/`AccountColumn`/`CategoryColumn` from `@/app/(dashboard)/...`. Architecture flows app → features, never the reverse; those are feature components that belong in `features/{domain}/components/`.

### 8. Zustand stores persisting server-derived data `[architecture]`
`features/csv-import/store/import-session.ts:33-43,93-216` and `store/duplicate-resolution.ts` hold API results (AI categorizations, duplicate matches, import results) persisted to sessionStorage, against the "Zustand only for ephemeral UI state" rule. A multi-step wizard is a defensible exception — either amend `state-management.md` to document it or migrate analysis results into the React Query cache keyed by session.

### 9. Collapse the three analyze/categorize pipelines `[csv-import]`
`use-transaction-analyzer.ts`, `use-analyze-retry.ts`, `use-categorize-retry.ts` each rebuild `prepareTransactionsForAnalysis` + format fallback + progress/error bookkeeping; the retry copy drifting is exactly how bugs.md #37 happened. The analyzer already handles both phases and cancellation — fold retries into it.

### 10. Deduplicate and constant-fold transaction-type resolution `[performance]` `[transaction-types]` `[csv-import]`
`categorization-db.ts:11-31` (`detectTransactionType`) and `payee-category-matcher.ts:92-100` are the same 3-row lookup implemented twice and executed per imported row. The ids are documented constants (`.opencode/docs/database-schema.md`); resolve once per request (or cache at module scope) in a shared `features/transaction-types/lib/` helper — also the natural home for the amount-sign→type rule.

### 11. `by-category.ts` and `by-payee.ts` are ~85% identical `[summary]`
Same zod schema, type-widening, joins, filters, and aggregate expression — extract a shared query builder or one endpoint with `groupBy=category|payee`.

### 12. Collapse `calculateCurrentBalanceChange`'s three serial queries into one `[summary]` `[performance]`
`lib/balance-utils.ts:34-99` — balance sum + two "transactions after X" sums can be one conditional-aggregation query; `over-time.ts:37-47` independently re-runs the identical current-balance query. Pairs with improvements.md #5. Also consider moving `lib/balance-utils.ts` next to the summary domain — it's single-consumer business logic sitting in cross-cutting `lib/`, right at the trigger rule's red line.

### 13. Extract the duplicated sheet option-wiring into a shared hook `[transactions]` `[transaction-types]` `[categories]`
`new-transaction-sheet.tsx:42-70` and `edit-transaction-sheet.tsx:54-81` duplicate ~60 lines building `categoryOptions`/`accountOptions`/`transactionTypeOptions` + `onCreateAccount`/`onCreateCategory`; a `useTransactionFormOptions()` hook collapses both.

## Low impact

### 14. `zValidator("param", { id: optional })` + `requireId` is dead weight on every `:id` route `[accounts]` `[transactions]`
`accounts.ts:31-36,114-119,149-154`, `transactions.ts:99-105,227-232,275-281` — on a literal `/:id` route the param always exists; the optional-id schema validates nothing and the 400 branch in `lib/validation-middleware.ts` is unreachable. One shared middleware tuple (`zValidator + clerkMiddleware + requireAuth + requireId`) per domain would also reduce drift.

### 15. csv-import deviates from the documented feature layout `[architecture]`
`features/csv-import/store/` (docs say Zustand lives in `hooks/`), `const/import-const.ts` (undocumented directory coexisting with the sanctioned `lib/config.ts`), the hook `components/use-preview-columns.tsx` living in `components/`, and the pipeline constants `CATEGORIZE_BATCH_SIZE/MAX_CONCURRENT/RETRIES` in `analysis-pipeline.ts:15-17` instead of `lib/config.ts` (which would also fix the magic `30` in `analysis-section.tsx`).

### 16. Duplicated query/response shapes worth one helper each `[categories]` `[csv-import]`
`categories.ts:22-31` vs `:50-59` duplicate the select + leftJoin projection (extracting it is also where the missing parent-`userId` guard from bugs.md #17 belongs); `csv-import.ts:150-175` vs `:196-221` serialize the same duplicate/payee shapes twice; the nine csv-import api hooks repeat the identical `!("data" in result)` unwrap ritual — a shared `unwrap(response)` in `lib/hono.ts` deletes ~80 lines.

### 17. `useSelectAccount` duplicates the promise-dialog machinery of `use-confirm` `[accounts]`
`features/accounts/hooks/use-select-account.tsx:37-55` — extracting a generic promise-dialog helper fixes the remount and empty-resolve defects (bugs.md #48) in one place.

### 18. `enrichCategorizations` is O(n²) `[csv-import]`
`transaction-enricher.ts:12-14` does `.find(...)` per categorization; a Map keyed by `csvRowIndex` is linear at the 1000-row cap and would make the bugs.md #37 duplicate-key collision detectable.

### 19. Small cleanups `[accounts]` `[categories]` `[transactions]` `[summary]` `[csv-import]` `[architecture]`
`ResponseType` exported from `features/accounts/components/columns.tsx:11-14` under a name every API hook reuses locally (rename `AccountRow`); `getDescendantIds` recreated per render and omitted from `useMemo` deps (`edit-category-sheet.tsx:42-65` — share one tree-walk utility with `use-category-tree.ts`); `parseFloat(row.getValue("amount"))` on an already-numeric field (`features/transactions/components/columns.tsx:121`); duplicated `chartConfig` memo in `area-variant.tsx:22-31`/`bar-variant.tsx:22-31` (moot if BarVariant is deleted per #5); `fetchFinancialData` re-declared per request with inconsistent closure (`overview.ts:41-70`); over-time totals reduced in JS from already-grouped SQL (`over-time.ts:77-84`); `column-mapping.tsx:69-95` re-implements `validateColumnMapping` (`lib/validators.ts:3-24`) and builds `reverseMapping` twice with silent last-write-wins on colliding columns; pass-through wrappers in `account-form.tsx:44-50`; `lib/use-sidebar-store.ts` belongs in `hooks/`.

### 20. Fix lint signal-to-noise and commit hygiene `[architecture]`
`npm run lint` reports 112,773 problems, dominated by `.opencode/node_modules`, `.next`, and `scripts/*.mjs` no-undef noise — add `ignores` + a node-globals override for `scripts/` in `eslint.config.js` so real violations are visible. 7 of the last 30 commits ("updated", "selects", "new", "working", …) violate the Conventional Commits rule; commitlint + husky (or a CI check) would enforce it.
