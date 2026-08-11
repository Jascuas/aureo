# Bugs

55 confirmed defects merged from 9 audit agents (6 domain, 3 cross-cutting), ranked by severity and blast radius. The single most important item is #1: `POST /api/transactions`, `POST /bulk-create`, and `PATCH /:id` never verify that the target `accountId` belongs to the caller, so any authenticated user can write transactions into — or move transactions into — another user's account, and the balance trigger then mutates the victim's balance. Close behind it is a cluster of money-integrity defects (#2–#8): the trigger's sign convention contradicts the stored-amount convention, the trigger migrations aren't in the Drizzle journal so fresh databases never get the trigger, cents are destroyed on every display/edit round-trip, and the dashboard never refreshes after mutations because the summary query keys don't match what mutations invalidate.

## High severity

### 1. Cross-tenant transaction writes: create/bulk-create/PATCH never verify account ownership `[security]` `[transactions]`
`app/api/[[...route]]/transactions.ts:135-158` (POST), `:203-224` (bulk-create), `:247-265` (PATCH). `_userId` is read and discarded; `values.accountId` is inserted/applied as-is. An authenticated user who obtains another user's account id can insert transactions into it, and PATCH allows re-pointing an owned transaction into a victim's account — in both cases the balance trigger mutates the victim's balance. Every other write path (DELETE, bulk-delete) does the `innerJoin(accounts, eq(accounts.userId, ...))` ownership CTE; these three skip it.

### 2. Trigger sign convention conflicts with the signed-amount storage convention — expenses can increase balances `[accounts]` `[transactions]`
`drizzle/0003_fix_trigger_case_sensitivity.sql:39-40` (`WHEN LOWER(tt.name) = 'expense' THEN -NEW.amount`) vs AGENTS.md ("negative = expense"), `features/transactions/components/transaction-form.tsx:69-78` and `features/csv-import/lib/transaction-mapper.ts:37` (both store the raw signed value), and `components/inputs/amount-input.tsx:29-34` (encourages signed entry). The trigger assumes expense amounts are positive magnitudes and negates them: an expense stored as `-25000` yields `-(-25000) = +25000` — the balance goes up. This is the same double-sign corruption family the 0002/0003 migrations were written to fix, reintroduced at the form/import boundary. The trigger and the sign convention cannot both be true; one must change.

### 3. Balance-trigger migrations are outside the Drizzle journal — fresh databases never get the trigger `[accounts]`
`drizzle/0002_fix_balance_trigger.sql` and `drizzle/0003_fix_trigger_case_sensitivity.sql` share sequence numbers with unrelated generated migrations and are absent from `drizzle/meta/_journal.json` (which lists only `0000_milky_spencer_smythe`, `0001_gorgeous_red_hulk`, `0002_sturdy_quasar`, `0003_left_the_hood`). On any new environment `npm run db:migrate` installs no trigger, and since app code correctly never touches `accounts.balance`, every balance silently stays at its insert value forever.

### 4. `convertAmountFromMilliunits` destroys cents; edit round-trip persists the corruption `[transactions]` `[summary]` `[csv-import]`
`lib/utils.ts:18-20` is `Math.round(amount / 1000)` — 12990 milliunits (€12.99) renders as €13 everywhere (overview cards, over-time chart, by-account, recent transactions, transaction table). Worse, `features/transactions/components/edit-transaction-sheet.tsx:104` seeds the form with the rounded value, so opening a €12.99 transaction and saving rewrites it as €13.00 in the database. `features/csv-import/components/use-preview-columns.tsx:73` already works around the helper with a bare `/ 1000`. Should be `amount / 1000` with no rounding.

### 5. Summary query keys don't match the `["summary"]` invalidation — dashboard is stale after every mutation `[performance]` `[summary]` `[architecture]`
`features/summary/api/use-get-overview.ts:13` (`["overview"]`), `use-get-over-time.ts:12`, `use-get-category-summary.ts:25`, `use-get-payee-summary.ts:25`, `use-get-account-summary.ts:14` — none start with `"summary"`, yet all ~15 mutation hooks invalidate `queryKey: ["summary"]` per the documented matrix. The invalidation is a silent no-op: after any create/edit/delete/import, the KPI cards, time-series chart, category chart, and accounts card show stale numbers until the 60s staleTime plus a refocus. Cheapest fix: nest the keys (`["summary", "overview", {…}]`) so prefix matching works.

### 6. CSV import hardcodes EU date/amount formats; the real detector is dead code and the format-correction UI is a no-op `[csv-import]`
`features/csv-import/hooks/use-column-detection.ts:88-89` always emits `DD/MM/YYYY` + comma-decimal; the actual detector (`features/csv-import/lib/column-detector.ts`, with AI fallback) is unreferenced; and `mapping-step.tsx:37` passes `onFormatChange={() => {}}` so the FormatDetector selects change nothing. A US amount `"1,234.56"` parsed comma-decimal becomes `1.23456` → 1235 milliunits instead of 1234560 (silent ~1000x corruption), and `MM/DD/YYYY` dates get day/month swapped. There is currently no working path to import a US-format CSV correctly.

### 7. Overview balance math contradicts the trigger's sign logic `[summary]`
`lib/balance-utils.ts:57-67, 80-91` reconstruct historical balances as `currentBalance − SUM(amount)` raw, with no CASE on transaction type, while the trigger applies `+amount` for income/refund and `−amount` for expense. Any window containing an expense moves the reconstructed balance the wrong direction, so the Balance card's amount, changeAmount, and changePtc (`app/api/[[...route]]/summary/overview.ts:90-100`) are all wrong. `over-time.ts` uses the ABS-based helpers that do match the trigger — the two endpoints disagree with each other.

### 8. Seeded transaction-type IDs contradict the docs and `scripts/seed.ts`; "Transfer" is never seeded `[transaction-types]`
`drizzle/0001_gorgeous_red_hulk.sql:7-11` seeds ids `'income'`/`'expense'`/`'refund'`, but `.opencode/docs/database-schema.md:49-52` documents cuid-style ids and `scripts/seed.ts:97-98` hardcodes those cuids — seeding a migration-provisioned database fails on the FK. The documented third type is Transfer; the seeded one is Refund; the trigger handles `'refund'` but not `'transfer'`, while `db/helpers.ts:49-55`'s `ELSE ABS(amount)` counts any unknown type as spending — balances and reports diverge for the same row.

### 9. `transactions` table has zero indexes `[performance]`
`db/schema.ts:40-57` defines no indexes (confirmed against all migrations; only `import_templates` has any). Every query filters/joins/orders on this table: cursor pagination needs `(account_id, date DESC, id DESC)`, summaries need `(date)`, `(category_id)`, `(transaction_type_id)`, auth scoping needs `accounts(user_id)`/`categories(user_id)`, and `drizzle/0004_enable_pg_trgm.sql` enables pg_trgm but never creates the GIN index on `payee`, so every csv-import `similarity()` call is a full sequential scan. All endpoints degrade linearly with transaction count.

### 10. CSV `/analyze` is an N+1 storm: up to ~4,000 sequential Neon round trips per call `[performance]` `[csv-import]`
`features/csv-import/lib/duplicate-matcher.ts:18-51, 60-127` (one exact + one fuzzy query per row, 1000-row batch), run in parallel with `payee-category-matcher.ts:113-119` (two queries per payee) via `analyzer.ts:22-38`; `transaction-categorizer.ts:44-57, 105` adds per-row few-shot queries and re-queries the fixed 3-row `transaction_types` table per row. On the Neon HTTP driver each query is a full HTTPS round trip (~20-80ms) — a 1,000-row CSV means 40-160+ seconds, past Edge timeouts.

### 11. Cursor pagination tie-break goes the wrong direction — pages repeat or loop forever `[transactions]`
`app/api/[[...route]]/transactions.ts:69-80`: ordering is `desc(date), desc(id)` but the same-date filter is `gt(transactions.id, cursor.id)`; under descending id order the next rows have smaller ids, so page 2 re-returns served rows or loops on same-timestamp sets — exactly what CSV imports produce (many rows sharing one midnight timestamp). Must be `lt(...)`.

### 12. Fuzzy duplicate detection never fires for expenses — inverted range for negative amounts `[csv-import]`
`features/csv-import/lib/duplicate-matcher.ts:73-81`: `amountMin = floor(amount * 0.99)` / `amountMax = ceil(amount * 1.01)` invert for negatives — for `-10000`, `between(-9900, -10100)` is an empty range. Since expenses are negative by convention, fuzzy dedup is silently dead for the majority of imported rows. Needs `Math.min`/`Math.max` of the bounds.

### 13. Imports of 501–1000 rows always fail wholesale `[csv-import]`
`features/csv-import/hooks/use-transaction-import.ts:72-81` sends all rows in one `mutateAsync`, but the `/import` validator caps at `BATCH_LIMITS.BULK_IMPORT = 500` (`lib/config.ts:29`) while `/analyze` accepts 1000 and the UI advertises "Maximum 1,000 transactions" (`file-upload-section.tsx:141`). A 600-row CSV survives every step, then the final import 400s with only "Failed to import transactions". The client never chunks.

### 14. `/analyze` failures are silently swallowed — the analysis step hangs forever `[csv-import]`
`features/csv-import/hooks/use-import-orchestrator.ts:110` (`onError: () => {}`) plus `use-transaction-analyzer.ts:180-189` (catch never calls `setError("analyze", ...)`). On a 500/network failure the UI shows "Preparing analysis..." indefinitely and `didFireRef` in `analysis-step.tsx:57-70` blocks any re-trigger.

### 15. `POST /categories` silently discards `parentId` — subcategory creation is broken `[categories]`
`app/api/[[...route]]/categories.ts:74` validates with `insertCategorySchema.pick({ name: true })` while `new-category-sheet.tsx:17-22, 54-58` renders a Parent Category select and submits `{ name, parentId }`; Zod strips `parentId`, so every new category is created as a root with no error.

### 16. Deleting a category that has children returns an unhandled 500 `[categories]`
`drizzle/0000_milky_spencer_smythe.sql:24` (`ON DELETE no action` on the self-FK) with `app/api/[[...route]]/categories.ts:159-187` (DELETE) and `:94-122` (bulk-delete) — no try/catch and no `app.onError`, so deleting any parent category violates the FK and surfaces as a generic 500 / unexplained "Failed to delete category." toast. There is no UI path to succeed except manually deleting children first.

### 17. Category `parentId` accepts any value: cycles, nonexistent ids, and other users' categories (cross-tenant name leak) `[categories]` `[security]`
`app/api/[[...route]]/categories.ts:134-150` applies `parentId` verbatim: (a) self/descendant ids create cycles (the client-side guard in `edit-category-sheet.tsx:42-65` is bypassable via the API); (b) another user's category id is accepted, and the GET join at `categories.ts:30` doesn't filter `parentCategory.userId`, so the other tenant's category name is returned as `parentName`; (c) a nonexistent id is an unhandled FK 500.

### 18. Duplicate dialog and tooltip display raw milliunits as currency (1000x too large) `[csv-import]`
`features/csv-import/components/duplicate-comparison.tsx:106,135` and `duplicate-indicator/duplicate-tooltip-content.tsx:39` call `formatCurrency` on milliunit values without dividing — a €12.34 duplicate shows as €12,340.00, making the skip/import decision actively misleading.

### 19. Mutation hooks never check `response.ok` — failed writes show success toasts in every domain `[accounts]` `[categories]` `[transactions]`
All 13+ mutation hooks (`features/accounts/api/use-create-account.ts:15-17`, `use-edit-account.ts:19-24`, `use-delete-account.ts:16-20`, `use-bulk-delete-accounts.ts:19-22`; `features/categories/api/use-edit-category.ts:18-25`, `use-delete-category.ts:15-21`, `use-create-category.ts:14-18`, `use-bulk-delete-categories.ts:18-23`; `features/transactions/api/use-create-transaction.ts:18-21` and its four siblings) return `response.json()` regardless of status. A 401/404/500 flows into `onSuccess`: "Account updated." / "Transaction created." toasts fire, sheets close, nothing was persisted. The query hooks in the same folders do check `ok`.

### 20. Refunds inflate instead of reduce Expense totals in category/payee breakdowns `[summary]`
`app/api/[[...route]]/summary/by-category.ts:50` and `by-payee.ts:41` compute `SUM(ABS(amount))` while including Refund rows in the Expense filter (`by-category.ts:43-44`, `by-payee.ts:36`) — a €100 purchase + €100 refund shows €200 of spend, contradicting the UI's own promise ("Expense includes refunds (subtracted)", `category-chart-filter-dialog.tsx:113`).

## Medium severity

### 21. `db/helpers.ts` compares type names case-sensitively — the exact failure class that corrupted 83% of balances `[transaction-types]`
`db/helpers.ts:8,18,20,30,32,42,51-52` use `= 'Income'` / `= 'Expense'` / `= 'Refund'` while the trigger was deliberately fixed to `LOWER(tt.name)` (`0003_fix_trigger_case_sensitivity.sql:39`). Re-casing a type name keeps balances correct but silently zeroes income/expense in every summary endpoint.

### 22. Refund/Transfer classification is inconsistent across trigger, helpers, and endpoints `[transaction-types]` `[accounts]` `[summary]`
The trigger treats refund as balance-positive and Transfer (`ELSE 0`) as neutral (`0003:39`); `overview.ts:48-49` treats refunds as negative expenses while `over-time.ts:53` treats them as income — the chart's income series won't match the Income card for the same period; and Transfers never move any balance, so money "leaving" via Transfer leaves both accounts untouched.

### 23. Bulk-delete hooks skip the `["transactions"]` invalidation required by the matrix `[accounts]` `[categories]` `[performance]` `[architecture]`
`features/accounts/api/use-bulk-delete-accounts.ts:26-27` (cascade-deletes transactions) and `features/categories/api/use-bulk-delete-categories.ts:26-27` (SET NULLs `categoryId`) invalidate only their own key + `["summary"]` — the transactions table keeps showing deleted rows / stale category names for up to 60s; the single-delete variants do it correctly.

### 24. Integer division truncates category/payee values before ROUND `[summary]`
`by-category.ts:50`, `by-payee.ts:41` — `SUM(ABS(amount)) / 1000` on integer columns is Postgres integer division; 1999 milliunits → 1, not 2. Should be `/ 1000.0`.

### 25. by-category sorts by a different metric than it displays `[summary]`
`by-category.ts:71` orders by `SUM(categoryAmountSql)` (net, refunds negative) while the displayed `value` (line 50) is the ABS sum — the top-N cut and the "Other" bucket (`:73-79`) can promote/demote the wrong categories relative to the numbers shown.

### 26. Percent-change math breaks on zero/negative baselines `[summary]`
`lib/utils.ts:60-66` — `previous === 0` with a negative current returns `+100%` (rendered green); a negative previous inverts the sign (−100 → −50 reports −50% despite improving). Affects all three overview cards.

### 27. Balance-change window is off by one day vs. the income/expense window `[summary]`
`lib/balance-utils.ts:77` uses `dayAfterSinceDate` (start-day transactions included in "balance at start") while `overview.ts:61` includes `startDate` in income/expenses (`gte`) — the Balance card's changeAmount won't reconcile with Income − Expenses for the same period.

### 28. Future-dated transactions skew the entire over-time balance line `[summary]`
`app/api/[[...route]]/summary/over-time.ts:87` — `balanceAtStart = currentBalance − (periodIncome − periodExpenses)`, but the trigger-maintained `currentBalance` includes future-dated transactions excluded from the period totals (`:67`); one scheduled transaction offsets every point on the chart.

### 29. Uncategorized transactions vanish from the category breakdown `[summary]`
`by-category.ts:56` `innerJoin(categories, ...)` drops `categoryId = NULL` rows (common after SET NULL category deletes), silently under-reporting spend with no "Uncategorized" bucket.

### 30. Client-supplied cursor is `JSON.parse`d unvalidated → unhandled 500 `[transactions]` `[security]`
`app/api/[[...route]]/transactions.ts:42-44` — `?cursor=garbage` throws; a bad shape yields `Invalid Date` fed into SQL. Should be zod-validated or try/caught → 400 `API_ERRORS.INVALID_REQUEST`.

### 31. Date-range params are unvalidated and the `to` boundary drops same-day transactions `[summary]` `[transactions]`
`lib/date-utils.ts:17-19` — `?from=abc` yields `Invalid Date` passed into SQL (unstructured 500 across overview/over-time/by-category/by-payee), `from > to` is unchecked (corrupts last-period comparison in `overview.ts:37-39`), and `parse(to)` yields local midnight so `lte(transactions.date, endDate)` excludes any transaction on the `to` day with a time component. Needs validation + `endOfDay`.

### 32. CSV `/import` accepts client-supplied `categoryId` without ownership scoping `[security]`
`app/api/[[...route]]/csv-import.ts:462-517` — the account is ownership-verified (`:494-502`) but each row's `categoryId` is inserted as-is; a user can attach transactions to another user's category (cross-tenant reference, plus category-existence probing via FK error messages).

### 33. Unparseable CSV dates fall back to the raw string and reach the DB `[csv-import]`
`features/csv-import/lib/transaction-mapper.ts:32` (`parsedDate?.toISOString().split("T")[0] || dateValue`) + the route's unrefined `z.string().transform((val) => new Date(val))` (`csv-import.ts:31,489`). `new Date("31/12/2024")` is `Invalid Date` → cryptic 500 for the whole batch; US-style strings parse with locale semantics that bypass the user's chosen format. No `.refine(d => !isNaN(d.getTime()))` anywhere in the route.

### 34. Malformed/short CSV rows silently become €0.00 transactions or abort the whole batch `[csv-import]`
`transaction-mapper.ts:19-23,39` + `lib/utils.ts:31` (`if (!value ...) return 0`) — a row with fewer cells than headers imports as a 0-amount transaction with no warning; a missing payee cell 400s the entire `/analyze` request with only a generic toast. No per-row validation between parse and import.

### 35. Format dropdown offers formats the parser cannot parse `[csv-import]`
`format-detector.tsx:12-20` lists `DD-MM-YYYY`, `YYYY/MM/DD` (and `types/import-types.ts:25-35` adds more), but `date-parser.ts` `DATE_PATTERNS` has no entries for them — `parseDate` returns `null` and every row falls into #33's raw-string fallback.

### 36. Date parsers accept impossible dates via rollover and misdetect ambiguous formats `[csv-import]`
`date-parser.ts:16-20` — `Date.UTC(2024, 1, 31)` silently rolls `31/02/2024` to March 2 (no range validation), inflating `detectDateFormat` confidence (`:96`); DD/MM is tried first with an early return at 0.8 (`:118`), so a US file whose sampled days are all ≤12 always detects as DD/MM.

### 37. Categorize-retry can duplicate every auto-resolved row `[csv-import]`
`use-categorize-retry.ts:66-68` — when `aiTransactions` is empty, retry categorizes ALL prepared transactions and `mergeAutoResolvedAndAi` concatenates them with `autoResolved`, producing two entries per `csvRowIndex` that render and import twice.

### 38. `skippedCount` is hardcoded to 0 on successful import `[csv-import]`
`use-transaction-import.ts:83-91` — should be `categorizations.length - rowsToImport.length`; the "Skipped (Duplicates)" line and "Total Processed" are wrong whenever any duplicate was skipped.

### 39. "Load template..." dropdown does nothing, and templates list is unscoped `[csv-import]`
`mapping-step.tsx:31-39` renders `ColumnMapping` without `onLoadTemplate`, so `template-controls.tsx:73`'s call is a no-op with no feedback; `template-controls.tsx:44` also calls `useGetTemplates()` with no `accountId`, listing all accounts' templates.

### 40. Duplicate `csvIndex` is the batch array position, not the row's `csvRowIndex` `[csv-import]`
`duplicate-matcher.ts:19,44` set `csvIndex: i` while the client compares against `cat.csvRowIndex` (`use-transaction-import.ts:55`, `review-step.tsx:47`). It works today only by coincidence of positional equality; any filtering/batching before `/analyze` would misalign resolutions — duplicates the user chose to skip would import.

### 41. File validation errors are silently dropped in the upload dropzone `[csv-import]`
`file-upload-section.tsx:43-49` — `validateFile`'s message (wrong extension, empty, >5MB) is discarded; `handleFile` just returns. Also `:27`'s `endsWith('.csv')` is case-sensitive, so `EXPORT.CSV` is rejected invisibly.

### 42. `RecentTransactionsCard` is rendered twice on the dashboard `[performance]` `[summary]`
`app/(dashboard)/page.tsx:15-17` and `components/charts/overview-charts.tsx:33-35` both mount it — the card appears twice, doubling render work (React Query dedupes the fetch).

### 43. Global auth middleware only protects `/` — the documented layer-1 backstop is absent for every other route `[architecture]` `[security]`
`proxy.ts:4` — `createRouteMatcher(["/"])`; `app/(dashboard)/layout.tsx` performs no auth check, and `app/(import)/` and `app/(spacing-demo)/` have none. Data stays safe only because the API layer 401s, but one forgotten `requireAuth` on any future route becomes an unauthenticated leak with no backstop. (AGENTS.md also still calls the file `middleware.ts`.)

### 44. Transactions page index isn't reset when filters change or a fetch fails `[transactions]`
`use-get-paginated-transactions.ts:13-14, 29-33` — changing the date range while on page 3 leaves `pages[3]` undefined (empty table); `fetchNextPage().then(...)` increments `pageIndex` even when the fetch errored.

### 45. Cyclic category data crashes the edit sheet and hides rows from the tree `[categories]`
`edit-category-sheet.tsx:42-52` — `getDescendantIds` has no visited set (stack overflow on a cycle, creatable per #17); `use-category-tree.ts:103-124` only walks from null-parent roots, so cycle members silently vanish from the CSV-import category picker.

### 46. Typing a new value in the Parent Category select sets `parentId` to arbitrary text `[categories]`
`category-form.tsx:88-96` — the shared `CreatableSelect` (`components/inputs/select.tsx:5`) gets no `onCreate`, so the typed string (e.g. `"Groceries"`) becomes `parentId` and PATCH dies on the FK with a 500.

### 47. Clearing a category's parent is impossible from the UI `[categories]`
`components/inputs/select.tsx:8,24-26` + `category-form.tsx:92-93` — the select isn't `isClearable`, and `onChange(option?.value)` yields `undefined` (dropped from JSON, so `.set(values)` never nulls the column) rather than `null`. "Make this category a root again" is unachievable.

### 48. `useSelectAccount` remounts its dialog every render and can resolve `""` `[accounts]`
`features/accounts/hooks/use-select-account.tsx:58-86` — `ConfirmationDialog` is defined inside the hook body (new identity per render; the Select's state is wiped when `["accounts"]` refetches mid-dialog); `:39,49` — confirming without picking resolves `""`, and inline-created accounts are never selected (the new id is only known server-side).

### 49. Empty `transactionTypeId` passes form and API validation, then dies as a 500 `[transaction-types]`
`transaction-form.tsx:31` (`z.string()`, no `.min(1)`), `edit-transaction-sheet.tsx:120` (default `""`), `db/schema.ts:70` — `""` sails through zValidator and Postgres rejects the FK, surfacing as `INTERNAL_ERROR` instead of a 400.

## Low severity

### 50. Bulk endpoints accept empty or unbounded `ids` arrays `[accounts]` `[transactions]`
`app/api/[[...route]]/accounts.ts:90-95` and `transactions.ts:166-168` — `z.array(z.string())` without `.min(1)`/`.max(...)`; `inArray(..., [])` is a pointless query or runtime throw, and a 100k-id array builds a giant `IN` list on Edge. Bulk-create (`transactions.ts:207`) also has no size cap.

### 51. Template-save error messages never reach the user `[csv-import]`
`use-save-template.ts:30-33` (and `use-update-template.ts:33-36`) parse `errorData.error?.message`, but the server returns `{ error: string }` — the specific "A template already exists…" message is discarded for the generic fallback.

### 52. `MappingStep` dereferences `csvData!` unconditionally `[csv-import]`
`ai-import-step-content.tsx:60-62` — a rehydrated session with `currentStep: MAPPING` but null/corrupt `csvData` crashes the whole card instead of falling back to upload.

### 53. Balance view shows "No data" when the period simply has no transactions `[summary]`
`lib/utils.ts:97` — `fillMissingDays` returns `[]` for empty input, so `time-series-chart.tsx:73` renders the empty state even in Balance mode where a flat line is meaningful.

### 54. Date filter label is off by one day for non-UTC users `[summary]`
`components/filters/date-filter.tsx:33` — `new Date("yyyy-MM-dd")` parses UTC midnight then formats local; users west of UTC see the previous day. Related: `over-time.ts:33` uses server-local (UTC on Edge) "today", shifting period boundaries for non-UTC users.

### 55. Table indentation implies a hierarchy the row order doesn't provide `[categories]`
`features/categories/components/columns.tsx:53-61` — `└─` + `pl-8` on any row with a parent, but rows aren't grouped under parents (GET has no `orderBy`, `categories.ts:22-31`) and grandchildren get the same single indent.
