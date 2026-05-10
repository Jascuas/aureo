# Future Features

A backlog of post-MVP ideas. In-scope items have a full spec; the backlog has a brief sketch.

---

## Roadmap (In Scope)

| #   | Feature                                                                  | Effort | Status                   |
| --- | ------------------------------------------------------------------------ | ------ | ------------------------ |
| 1   | [Smart Categorization](#1-smart-categorization)                          | Small  | Up next                  |
| 2   | [Calendar Heatmap + DrillDownSheet](#2-calendar-heatmap--drilldownsheet) | Medium | Planned                  |
| 3   | [Cashflow Forecast](#3-cashflow-forecast)                                | Medium | Planned                  |
| 4   | [Budgets](#4-budgets-module)                                             | Large  | Planned                  |
| 5   | [Mobile Polish](#5-mobile-polish)                                        | Medium | After above              |
| 6   | [Net Worth Over Time](#6-net-worth-over-time)                            | Medium | Deferred (arch decision) |

---

## 1. Smart Categorization

**Goal:** When a user manually assigns a category to a transaction, offer to create a rule so future transactions from the same payee are auto-categorized. Rules are also applied on new transaction creation and CSV import.

### DB

New table `categorization_rules`:

```sql
categorization_rules (
  id          text PRIMARY KEY,
  userId      text NOT NULL,
  payee       text NOT NULL,   -- normalized (normalizePayeeName) match
  categoryId  text REFERENCES categories(id) ON DELETE CASCADE,
  priority    integer DEFAULT 0,
  createdAt   timestamp DEFAULT now()
)
-- UNIQUE index on (userId, payee) — one rule per payee per user
```

### API (Hono `/api/categorization-rules`)

| Method   | Path                              | Description                                        |
| -------- | --------------------------------- | -------------------------------------------------- |
| `GET`    | `/api/categorization-rules`       | List all rules for the current user                |
| `POST`   | `/api/categorization-rules`       | Create `{ payee, categoryId }`                     |
| `DELETE` | `/api/categorization-rules/:id`   | Delete a rule                                      |
| `POST`   | `/api/categorization-rules/apply` | Bulk-apply all rules to uncategorized transactions |

### Flow

1. User opens `EditTransactionSheet`, changes category, saves.
2. Mutation succeeds → check if a rule for `normalizePayeeName(payee)` already exists.
3. If **no existing rule**: show `useConfirm`-style dialog: _"Apply '[Category]' to all future '[Payee]' transactions?"_
4. Confirm → `POST /api/categorization-rules` with `{ payee: normalizePayeeName(tx.payee), categoryId }`.
5. On server `PATCH /api/transactions/:id` and `POST /api/transactions`: after saving, look up a matching rule and auto-set `categoryId` if the field was not explicitly provided.
6. Categories page: add **"Rules" tab** listing all rules as a table (payee → category, delete button).

### Key decisions

- Match on `normalizePayeeName(payee)` — existing util in `lib/utils.ts`.
- Rules are user-scoped. One rule per normalized payee (unique constraint).
- No ML in Phase 1 — exact text match only.
- Bulk apply endpoint for one-time backfill of existing uncategorized transactions.

---

## 2. Calendar Heatmap + DrillDownSheet

**Goal:** Visualize daily spend intensity on a calendar grid. Click any cell to see that day's transactions in a side sheet.

### DrillDownSheet (standalone, reusable first)

- `components/sheets/drill-down-sheet.tsx` — shadcn `<Sheet>` accepting `{ open, onClose, from: Date, to: Date, accountId?, categoryId?, payee? }`.
- Renders a read-only transactions table (reuses `DataTable` + existing columns).
- Wire from: calendar heatmap cell click (here), category chart slice click (later), payee bar click (later).

### Calendar Heatmap

- New card in `OverviewCharts` below the Payees / Accounts row.
- Data source: `useGetOverTime` (already has per-day expenses). No new endpoint.
- Layout: 7-row div grid (Mon–Sun) × N columns (weeks in selected range). `overflow-x-auto` for mobile.
- Cell color: 5-step CSS-variable scale `bg-muted` (zero) → `bg-rose-600` (max).
- Hover: shadcn `<Tooltip>` showing date + `formatCurrency(expenses)` + tx count.
- Click: opens `DrillDownSheet` with `{ from: cellDate, to: cellDate }`.

---

## 3. Cashflow Forecast

**Goal:** Project income and expenses forward N days based on trailing 30-day rolling averages, rendered as dashed lines on the time-series chart.

### New chart type option

Add `"forecast"` to the `ChartType` type and time-series controls.

### `ForecastVariant` component

- recharts `<ComposedChart>`.
- Solid `<Line>` for actual income / expenses (past data).
- Dashed `<Line strokeDasharray>` for projected income / expenses.
- Transparent `<Area>` for ±20% confidence band.
- Legend distinguishes Actual vs Projected.

### `useForecast(data, horizon)` hook

- Pure function: takes over-time data + `horizon` (days ahead), returns combined actual + projected array (each point has `{ ..., projected: boolean }`).
- Always computes trailing average from the last 90 days of actual data (independent of the active filter range).

### Controls

- New "Forecast horizon" select (7d / 14d / 30d / 60d) in the time-series card header, visible only when `chartType === "forecast"`.
- Applies regardless of whether the user selected a custom date range or a relative range.

---

## 4. Budgets Module

**Goal:** Set spend caps per category, track actual vs budget per period, surface over-budget alerts on the dashboard.

### DB

New table `budgets`:

```sql
budgets (
  id          text PRIMARY KEY,
  userId      text NOT NULL,
  categoryId  text REFERENCES categories(id) ON DELETE CASCADE,  -- any depth
  name        text NOT NULL,
  amount      integer NOT NULL,   -- milliunits
  period      text NOT NULL,      -- 'monthly' | 'weekly' | 'custom'
  startDate   date,               -- for 'custom' period
  endDate     date,               -- for 'custom' period
  rollover    boolean DEFAULT false,
  createdAt   timestamp DEFAULT now()
)
```

Supports **all categories** (any depth in the tree, not just root-level).

### API (Hono `/api/budgets`)

| Method   | Path                            | Description                                                  |
| -------- | ------------------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/budgets`                  | List user budgets                                            |
| `POST`   | `/api/budgets`                  | Create                                                       |
| `PATCH`  | `/api/budgets/:id`              | Update                                                       |
| `DELETE` | `/api/budgets/:id`              | Delete                                                       |
| `GET`    | `/api/budgets/progress?from&to` | Returns each budget with `{ spent, remaining, percentUsed }` |

### UI

**`/budgets` page:**

- Header + "Add budget" button → `NewBudgetSheet` (Sheet + Zustand pattern).
- Grid of `BudgetCard`: category name, period, progress bar, `spent / budgeted`, over-budget badge.
- Edit/delete via `EditBudgetSheet`.

**Dashboard mini widget:**

- `BudgetSummaryWidget` below the DataGrid (or as a 4th row in OverviewCharts).
- Shows top 3–5 budgets by `percentUsed` as compact horizontal cards.
- Collapses to accordion on mobile. Click → `/budgets`.

**Categories page integration:**

- Add a "Budget" column to the categories table showing current month budget amount (or `—`). Click → inline popover to create/edit that category's budget.

---

## 5. Mobile Polish

Audit and fix after all other features ship.

**Targets:**

- Chart cards < 400px: legend overflow, select wrap.
- `DrillDownSheet` transaction table: horizontal scroll on mobile.
- `NewTransactionSheet` / `EditTransactionSheet`: test at 375px.
- Calendar heatmap: `overflow-x-auto` wrapper + min cell size.
- Budgets widget: collapse to accordion on `sm`.
- Navigation: touch targets ≥ 44px, active state highlighting.

**Pattern:** Add `sm:` breakpoint variants where missing. Prefer `<Sheet>` over `<Dialog>` for anything that needs vertical space on mobile.

---

## 6. Net Worth Over Time

**Status: Deferred.** The `accounts.balance` column is live-only — no historical snapshots exist.

**Pre-work (zero-cost insurance):** Add a `balance_snapshots(id, accountId, date, balance integer)` table (no UI) to start accumulating daily data going forward. Architecture decision on sourcing historical data required before full spec.

---

## Backlog

Lower-priority items to revisit after the roadmap above ships.

| #   | Feature                          | One-liner                                                  |
| --- | -------------------------------- | ---------------------------------------------------------- |
| B1  | Cashflow composed chart          | Grouped income/expense bars + net line in one chart        |
| B2  | Recurring transaction detector   | Auto-detect subscriptions; alert on missing/late payments  |
| B3  | Savings goals                    | Targets with amount + deadline, circular progress ring     |
| B4  | Export / report generation       | CSV download + monthly PDF via `@react-pdf/renderer`       |
| B5  | Multi-currency support           | Per-account currency + FX rate table for normalized totals |
| B6  | Per-category trend mini-charts   | Sparkline + % vs prior period in category list             |
| B7  | Goals & alerts engine            | Custom rules: "alert me if Restaurants > €200 this month"  |
| B8  | Comparisons (period over period) | Prior period dashed overlay on all charts                  |
| B9  | Smart categorization Phase 2     | Embedding-based suggestions for novel payees               |
