# Improvements

35 non-breaking quality issues merged from 9 audit agents, ranked by impact. The most important item is #1: transaction mutations never invalidate `["accounts"]` even though every transaction write changes an account balance via the trigger — so even after the summary-key bug (bugs.md #5) is fixed, balances shown anywhere from the accounts cache stay stale for up to 60s after every transaction CRUD.

## Medium impact

### 1. Transaction mutations never invalidate `["accounts"]` despite the trigger changing balances `[transactions]` `[architecture]` `[performance]`
`features/transactions/api/use-create-transaction.ts:23-26` and its edit/delete/bulk siblings invalidate only `transactions` + `summary`; only `use-bulk-import-transactions.ts:35` invalidates `["accounts"]`. The invalidation matrix in `.opencode/docs/state-management.md:129-131` should be extended and all five hooks updated together.

### 2. CSV `/import` leaks raw Postgres error details and uses inline error strings `[security]` `[csv-import]` `[architecture]`
`app/api/[[...route]]/csv-import.ts:571-620` returns `detail`, `constraint`, and `code` from the raw PG error (schema/constraint enumeration aid); inline strings at `:268`, `:377`, `:587`, `:603`, `:614` and `catch (error: any)` at `:370`, `:419`, `:554` violate the `lib/api-errors.ts` rule and give responses inconsistent shapes the client can't rely on.

### 3. Financial PII logged in plaintext on Edge routes `[security]` `[csv-import]` `[performance]`
`csv-import.ts:519-540` prints every payee/amount/date/note plus `userId` (~8 lines × up to 500 transactions, synchronously in the request path) on each import; `:238` logs userId + first transaction on categorize. Retained Vercel logs end up holding financial PII; the logging also adds real latency. Remove the debug scaffolding.

### 4. Summary routes have zero error handling and never use `API_ERRORS` `[summary]`
All five files in `app/api/[[...route]]/summary/` — no try/catch anywhere; DB failures leak raw 500s, breaking the shared error contract.

### 5. Overview endpoint runs 5–6 DB round trips serially `[performance]` `[summary]`
`summary/overview.ts:72-95` awaits current period, then last period, then `calculateCurrentBalanceChange` (itself 3 serial queries in `lib/balance-utils.ts:35-105`). On Edge + Neon HTTP, latency dominates; `Promise.all` (or one query with conditional aggregates over both periods) cuts dashboard load time ~60-70%.

### 6. Empty/whitespace names are accepted everywhere; the transaction form validates nothing `[accounts]` `[categories]` `[transactions]`
`db/schema.ts:18,38` — `createInsertSchema` yields bare `z.string()` for account and category names (blank rows, empty select options); `transaction-form.tsx:25-33` — `payee: z.string()` accepts empty, `amount: z.string()` accepts garbage (`parseFloat("") → NaN` sent to the API, rejected with only a generic toast). Add `.min(1)`/numeric refinements so errors surface inline via `FormMessage`.

### 7. Invalid FK ids return 500 instead of 400 `[transaction-types]`
`app/api/[[...route]]/transactions.ts:141,238` — `transactionTypeId` (and `categoryId`) are unconstrained strings; a nonexistent id hits the FK and comes back as `INTERNAL_ERROR` rather than `API_ERRORS.INVALID_REQUEST`. Constrain to the known set or catch the FK error.

### 8. Edit account sheet renders an empty editable form on query error `[accounts]`
`edit-account-sheet.tsx:52-60,88-96` — only `isLoading` is handled; on error the `{ name: "" }` fallback populates the form and (with #6) saving overwrites the real account name with an empty string.

### 9. AI SDKs are bundled into the single Edge function serving every API route `[performance]`
`app/api/[[...route]]/route.ts:13` (one edge function for all domains) → `csv-import.ts:19` → `lib/ai/index.ts` pulls in `@google/generative-ai` and `@openrouter/sdk`; every cold start (even `GET /api/accounts`) pays their init cost. Lazy `await import()` in the categorize handler, or split csv-import out.

### 10. GET /transactions list omits `transactionTypeId` `[transactions]`
`transactions.ts:48-58` — the table can only infer income/expense from the amount's sign, which is unreliable given the sign-convention conflict (bugs.md #2). Return the type (or name) so the UI displays truthfully.

### 11. `parseAmount` accepts/rejects the wrong things at the import boundary `[csv-import]`
`lib/utils.ts:26-50` — no parenthesized negatives `(123.45)` (which `column-detection-heuristics.ts:83` explicitly accepts), throws on currency symbols (`"€12.34"`), `parseFloat` accepts garbage suffixes (`"12.34abc"` → 12.34), and `replace(',', '.')` only replaces the first comma; the thrown exception escapes uncaught into the analyzer's generic catch.

### 12. No per-row error reporting from `/import` `[csv-import]`
`csv-import.ts:536-546` is all-or-nothing (one bad FK fails all 500 rows) and returns `errors: []`; the client maps failures to `row: 0` (`use-transaction-import.ts:88-90`), so `ImportSummary` can only ever say "Row 0".

## Low impact

### 13. Templates POST doesn't verify `accountId` ownership `[csv-import]` `[security]`
`csv-import.ts:326-341` inserts any `accountId` string (no ownership check, and `db/schema.ts:86` has no FK) — templates can point at other users' accounts or garbage.

### 14. `isNegativeExpense` is detected, stored, and never applied `[csv-import]`
`types/import-types.ts:39`, toggled in `format-detector.tsx:137-150`, persisted in templates — but `prepareTransactionsForAnalysis` never flips signs; banks exporting expenses as positive numbers get everything classified as income.

### 15. No encoding handling in the CSV parser `[csv-import]`
`csv-parser.ts:15-40` uses Papa defaults (UTF-8); Latin-1/Windows-1252 bank exports (common for Spanish banks, per the `fecha`/`importe` header patterns) mojibake payees, poisoning payee matching and AI categorization. Papa's `encoding` option is one line.

### 16. `lib/api-errors.ts` names and response shape have drifted from the docs `[architecture]` `[accounts]`
`lib/api-errors.ts:1-10` defines `INTERNAL_SERVER_ERROR`, `BAD_REQUEST`, `DUPLICATE_TEMPLATE_NAME`, `MISSING_ID`; AGENTS.md and `api-patterns.md:123-129` reference `INTERNAL_ERROR`, `INVALID_REQUEST`, `DUPLICATE_TEMPLATE`. Docs also show `c.json({ error: API_ERRORS.X })` while constants already wrap `{error}`. Update the docs to match the code. Related doc drift: AGENTS.md names `middleware.ts` (actual file: `proxy.ts`), and `.opencode/docs/database-schema.md:65` claims the type selector is "NOT implemented" (it exists at `transaction-form.tsx:157-167`).

### 17. The no-comments rule is widely violated in newer code `[architecture]` `[summary]` `[transactions]` `[categories]`
`lib/balance-utils.ts:14-27,114-125` (Spanish JSDoc), `use-get-paginated-transactions.ts:7-11`, `use-category-tree.ts:13-124` (throughout), `app/api/[[...route]]/transactions.ts:41-87`, `csv-import` store files, commented-out dead code in `proxy.ts:2,8,13` (delete regardless). Either enforce the rule or amend it.

### 18. `interface` used where the convention requires `type` (~24 declarations) `[architecture]`
E.g. `features/csv-import/components/ai-import-step-actions.tsx:26`, `use-transaction-analyzer.ts:33,45,55`, `use-import-orchestrator.ts:34`, `lib/utils.ts:199`. Mechanical fix.

### 19. Import ordering violates simple-import-sort in ~20 files `[architecture]`
E.g. `db/schema.ts:1`, `components/dashboard/accounts-card.tsx:3`, `app/(import)/transactions/upload/page.tsx:3`, most of `features/csv-import/**`. `npx eslint --fix` resolves all.

### 20. Currency presentation is inconsistent: `$` input vs EUR display `[transactions]`
`components/inputs/amount-input.tsx:63` hardcodes prefix `"$"` while `lib/utils.ts:52-56` formats everything as `es-ES` EUR.

### 21. Column-header sort only sorts the loaded page `[transactions]`
`features/transactions/components/columns.tsx:49-56` — with server-side cursor pagination, `toggleSorting` reorders just 50 visible rows, misleading users. Wire sort into the API or drop the affordance.

### 22. Sheets snap back open while a mutation is pending `[transactions]`
`new-transaction-sheet.tsx:88`, `edit-transaction-sheet.tsx:138` — `open={isOpen || isPending}` fights `onOpenChange`; ESC/overlay close flips state but the sheet reopens until the mutation settles. Disable closing explicitly instead.

### 23. No ORDER BY on categories and transaction-types lists `[categories]` `[transaction-types]`
`categories.ts:22-31`, `transaction-types.ts:16-21` — row order shifts arbitrarily (Postgres heap order), affecting tables and dropdowns.

### 24. Static transaction-types refetched on the default 60s staleTime `[transaction-types]` `[performance]`
`use-get-transaction-types.ts:6-17` — fixed reference data; `staleTime: Infinity` eliminates recurring refetches.

### 25. `by-category` fetches all rows and slices `top` in JS `[performance]`
`summary/by-category.ts:66-77` — unbounded transfer; `by-payee.ts` already applies `.limit(top)`. Compute "Other" server-side.

### 26. `over-time` groups by raw timestamps then re-buckets per day in JS `[performance]`
`summary/over-time.ts` `.groupBy(transactions.date)` returns potentially one row per transaction; `GROUP BY date_trunc('day', date)` returns one per day and lets `fillMissingDays` (`lib/utils.ts:88-145`) drop its accumulate branch.

### 27. `admin/verify-balances` runs one aggregate query per account `[performance]`
`admin.ts:29-58` — `Promise.all(userAccounts.map(...))` where one `GROUP BY account_id` suffices.

### 28. `TimeSeriesChart` recomputes filtering + grouping on every render `[performance]`
`time-series-chart.tsx:31-46` — per-item `parseISO` and `groupByPeriod` run on each render including unrelated state changes; wrap in `useMemo`.

### 29. Zero-balance accounts disappear from the Accounts card `[summary]`
`accounts-card.tsx:84` filters `r.value !== 0` — a legitimately emptied account vanishes rather than showing €0.00.

### 30. SYNC time renders "--:--" and never updates `[summary]`
`accounts-card.tsx:73-80` writes to a `useRef` in `useEffect` (no re-render). Use `useState`.

### 31. Sort header lacks accessible state `[accounts]`
`features/accounts/components/columns.tsx:39-49` — static `ArrowUpDown` icon, no `aria-sort`; screen readers get no sort feedback.

### 32. `accounts.balance` is a nullable 32-bit integer holding milliunits `[accounts]`
`db/schema.ts:11` — caps balances at ~±2.147M currency units (overflow in the trigger aborts the transaction insert); the API already inserts `balance: 0`, so `notNull().default(0)` (or `bigint`) matches reality.

### 33. Bare `.returning()` on writes echoes full rows including `userId`/`balance` `[accounts]` `[categories]` `[transactions]` `[performance]`
`accounts.ts:81,138`, `categories.ts:89,150`, `transactions.ts:155,220,265`, `csv-import.ts:367,412` — the write-side equivalent of `select *`; bulk-create echoes up to 500 full rows nobody reads. Return `{ id }` like the delete paths.

### 34. Misc UX/consistency nits `[accounts]` `[categories]` `[summary]` `[csv-import]` `[transaction-types]`
"Are u sure?" typo in `app/(dashboard)/accounts/actions.tsx:23` (vs "Are you sure?" in `edit-account-sheet.tsx:31`); deleted account's detail query invalidated instead of `removeQueries` (`use-delete-account.ts:24`); create-account needlessly invalidates `["transactions"]` (`use-create-account.ts:22`); flat parent-picker labels hide duplicate names when `use-category-tree.ts:62,93` already computes paths (`edit-category-sheet.tsx:59-64`); `top` default mismatch (hook 5 vs API 3, `use-get-category-summary.ts:16` / `by-category.ts:32`); chart title says "Transactions" in Balance mode (`time-series-chart.tsx:51-53`); generic `new Error("Failed")` in `use-get-category-summary.ts:31`; Escape resolves as Skip in the duplicate dialog (`use-resolution-keyboard.ts:19-32`); progress label uses magic `30` and the wrong denominator (`analysis-section.tsx:57-63`); unused `_userId` in `transaction-types.ts:14`; `["transactions", "recent"]` key shape undocumented (`use-get-recent-transactions.ts:14`).

### 35. Summary `accountId` query param is unvalidated free text `[summary]`
All summary routes accept `z.string().optional()`; a cuid2 shape check would match validation rigor elsewhere.
