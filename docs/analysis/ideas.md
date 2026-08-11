# Ideas

27 product/feature opportunities merged from 9 audit agents, ranked by impact and fit. The most important is #1: first-class transfers — three separate agents (transactions, transaction-types, accounts) independently flagged that the Transfer type exists in the schema, docs, and trigger (`ELSE 0` balance-neutral branch) but nothing in the product creates the paired debit/credit rows, leaving multi-account tracking unable to balance. #2 (indexes) and #3 (import rollback) are the highest-leverage operational wins.

## High impact

### 1. First-class transfers between accounts `[transactions]` `[transaction-types]` `[accounts]`
The `Transfer` type is documented and the trigger deliberately treats it as balance-neutral (`0002_fix_balance_trigger.sql:66`), but no UI creates the paired rows. A transfer flow creating a linked pair (out of A, into B) finishes the half-built concept and makes multi-account tracking actually balance. Prerequisite: resolve the Transfer-vs-Refund seeding contradiction (bugs.md #8).

### 2. Index migration set `[performance]`
One migration adding `transactions(account_id, date DESC, id DESC)`, `transactions(category_id)`, `transactions(transaction_type_id)`, `transactions(date)`, `accounts(user_id)`, `categories(user_id)`, and `CREATE INDEX ... USING gin (payee gin_trgm_ops)` — the trgm index alone turns csv-import fuzzy matching from O(table) sequential scans to index-assisted. Directly addresses bugs.md #9.

### 3. Import history with one-click rollback `[csv-import]`
Tag each bulk insert with an `importBatchId` column; since the balance trigger handles deletes correctly, "Undo this import" is a single `DELETE ... WHERE import_batch_id = ?` — the natural safety net for every import bug found in this audit.

### 4. Payee/notes text search on the transactions list `[transactions]`
The GET already composes optional filters (`transactions.ts:62-78`); an `ilike` on payee is a small addition and the single highest-leverage UX feature for a finance ledger.

### 5. Show balances on the accounts page `[accounts]`
GET `/api/accounts` returns only `{ id, name }` (`accounts.ts:20-23`); the trigger-maintained `balance` is the domain's most valuable datum and is never surfaced here. Add it to the select, convert at the boundary, render a sorted balance column.

### 6. Category budgets with progress bars `[summary]`
`ProgressVariant` (`components/charts/category-chart/variants/progress-variant.tsx`) is already a budget-style bar list; per-category monthly targets would reuse it directly.

### 7. Net-worth-over-time chart `[summary]`
The over-time endpoint already reconstructs a daily balance series; extending it per-account (stacked by the by-account palette) is a natural, high-value addition.

### 8. Reparent-or-reassign flow on category delete `[categories]`
When deleting a parent, offer "move children to grandparent" or "delete subtree", and optionally reassign the category's transactions instead of SET NULL — also the product-level fix for the delete-500 (bugs.md #16).

## Medium impact

### 9. Balance reconciliation as a product feature `[accounts]`
Given the corruption history (`scripts/diagnose-balance-corruption.mjs`, migrations 0002/0003), a per-account "Reconcile" action that recomputes the balance from transaction history, shows the drift, and lets the user accept a correction turns the diagnostic script into a feature.

### 10. Rate limiting on AI and bulk endpoints `[security]`
No rate limiting exists; `/analyze`, `/categorize`, `/import`, `/detect-duplicates` trigger AI calls and heavy `similarity()` queries — an authenticated user can drive cost/DoS. Per-user limits (e.g. Upstash) on those routes.

### 11. Pre-analysis parse preview `[csv-import]`
Between mapping and analysis, show a few rows rendered through the chosen date/amount formats (parsed date + formatted amount beside the raw cell) so misdetected formats (bugs.md #6) are visible before anything hits the server.

### 12. Separate Debit/Credit column support `[csv-import]`
`column-detection-heuristics.ts:22-33` already recognizes `debit`/`credit` headers but both map to the single Amount type — banks exporting two amount columns currently cannot be imported at all. Map both and synthesize signed amounts.

### 13. Bulk edit (recategorize/retype selected rows) `[transactions]`
Row-selection infrastructure exists (`columns.tsx:29-49`) and only feeds bulk-delete; a bulk-edit endpoint mirroring the bulk-delete CTE makes post-import cleanup far faster.

### 14. Duplicate-transaction detection on create/bulk-create and within a file `[transactions]` `[csv-import]` `[security]`
Flag inserts matching (accountId, date, amount, payee) to protect against double imports; `detectDuplicates` never compares CSV rows against each other, so an intra-file duplicate imports twice. Accepting an idempotency key on `/import` closes the replayed-request hole too.

### 15. Category merge `[categories]`
"Merge X into Y" (repoint transactions and children, delete X) is a standard finance-app operation and neutralizes duplicate categories created via CSV import.

### 16. Roll subcategories up into parents in summaries `[categories]` `[summary]`
`categories.parentId` is completely ignored by `by-category.ts`; a `rollup=true` option grouping children under parents makes the breakdown match the hierarchy model — `use-category-tree.ts` is 80% of the work.

### 17. Archive/soft-delete accounts `[accounts]`
Deleting an account cascade-destroys its whole transaction history behind a generic confirm; an `archivedAt` column with an "Archived" filter preserves history while removing the account from pickers.

### 18. Resurrect the payee insights card `[summary]`
The `by-payee` endpoint, hook, and `PayeeChart` all exist but are unwired (refactors.md #5); normalizing names via the existing `normalizePayeeName` (`lib/utils.ts:68`) before grouping makes it genuinely useful ("Amazon #123" vs "AMAZON").

### 19. Period-comparison overlay `[summary]`
The overview endpoint already computes last-period aggregates; exposing a last-period daily series enables a ghosted "vs last period" line on the time-series chart.

### 20. Auto-learn import templates `[csv-import]`
After a successful import with no template, offer (or silently upsert) the used mapping/formats as the account's template — the one-template-per-account unique constraint (`db/schema.ts:96`) already fits.

### 21. OFX/QIF/XLSX ingestion `[csv-import]`
The pipeline after `parseCSVFile` is format-agnostic (`headers` + `rows`); an OFX parser at the upload boundary sidesteps the entire date/amount-format ambiguity class for banks that offer it.

### 22. Server-side prefetch + hydration for the dashboard `[performance]`
`app/(dashboard)/page.tsx` is a pure client-fetch waterfall; prefetching overview/over-time/by-account in the RSC with `HydrationBoundary` removes a full round trip from perceived load.

### 23. Batch Neon queries `[performance]`
The neon-http driver supports batched statements; grouping the overview/balance queries into one HTTP request cuts Edge→DB round trips with no schema changes.

### 24. Account metadata: type and currency `[accounts]`
`accounts` is just `id/name/userId/balance`; type (checking/savings/credit/cash) and currency unlock grouping in pickers and correct formatting (and resolve the `$`-input/EUR-display mismatch) with minimal surface change.

## Low impact

### 25. Transaction-type quality-of-life `[transaction-types]`
Default `transactionTypeId` from the amount sign when omitted (positive = income convention, reusing the shared type-resolution helper); surface the existing Refund type in the form select; add `icon`/`color` columns for per-type visual identity in tables and selects.

### 26. Savings-rate KPI card `[summary]`
`(income − expenses) / income` from data the overview endpoint already returns — a fourth DataCard with near-zero backend work.

### 27. Guardrail tooling `[architecture]` `[performance]`
ESLint boundary rules (`no-restricted-imports` forbidding `@/app/*` inside `features/**`) to catch dependency inversions at commit time; row virtualization (`@tanstack/react-virtual`) for the transactions table if page size grows; depth limit or full `A / B / C` path display for category hierarchies; bulk reparenting ("Set parent…" on selected category rows).
