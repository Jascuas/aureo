# Aureo Finance Platform - Development Roadmap

> **Last Updated**: March 30, 2026  
> **Project Status**: Sprint 2 in Progress (86% complete)

---

## 🚨 Critical Blockers (Sprint 1) ✅ COMPLETED

**All production blockers resolved**

### Transaction Type Selector (BLOCKER) ✅

- [x] **DB**: Create migration for `transaction_types` table + seed data (Income, Expense, Refund)
- [x] **API**: Add `GET /api/transaction-types` endpoint
- [x] **Hook**: Create `features/transaction-types/api/use-get-transaction-types.ts`
- [x] **UI**: Replace hardcoded `transactionTypeId: ""` with `<GenericSelect>` in `transaction-form.tsx:74`
- [x] **Fix**: Embedded seed data in migration (no separate script needed)
- [x] **Test**: Verified transaction creation works end-to-end

**Commit**: `dd883e7` - "feat: implement transaction type selector (BLOCKER fix)"  
**Files Changed**: 10 files (+417/-35)  
**Completed**: March 29, 2026

### Account Balance Initialization ✅

- [x] Set `balance: 0` as default in POST `/api/accounts` instead of NULL

**Commit**: `24ae014` - "fix: remove debug console.log and set default account balance to 0"  
**Completed**: March 29, 2026

### Category Parent Selector ✅

- [x] Add optional parent category selector to `CategoryForm`
- [x] Filter out self + descendants to prevent circular references
- [x] Display hierarchy in categories list (indent/tree view with `└─` character)

**Commit**: `89e27df` - "feat: add category parent selector with circular reference prevention"  
**Files Changed**: 5 files (+86/-4)  
**Completed**: March 29, 2026

### Cleanup ✅

- [x] Remove `console.log("TOPPPPP", top)` from production code

**Commit**: `24ae014`  
**Completed**: March 29, 2026

---

## 🔧 Technical Debt (Sprint 2-3)

**Refactoring to improve maintainability**  
**Progress**: 8/11 tasks completed (73%)

### Code Duplication

#### Date Parsing (5 instances) ✅

- [x] Extract to `lib/date-utils.ts` as `parseDateRange(from?, to?)`
- [x] Replace in: `transactions.ts`, `summary/overview.ts`, `summary/over-time.ts`, `summary/by-category.ts`

**Commit**: `20f3e8e` - "refactor: extract date parsing logic to reusable utility function"  
**Impact**: 5 endpoints → 1 utility (+31 lines, -31 duplicated)  
**Completed**: March 30, 2026

#### Auth Middleware (12 instances) ⏳

- [ ] Extract reusable auth wrapper to `lib/auth-middleware.ts`
- [ ] Replace in all endpoints: accounts (6), categories (6), transactions (7), summary (3)

**Pattern**: Same 4-layer auth repeated everywhere  
**Effort**: 1 day  
**Status**: Pending

#### SQL CASE Expressions (3 instances) ⏳

- [ ] Extract to Drizzle helper function in `db/helpers.ts`
- [ ] Replace in: `summary/overview.ts:47-66`, `summary/over-time.ts:47-66`, `summary/by-category.ts:45-51`

**Effort**: 1 day  
**Status**: Pending

### Zustand Store Boilerplate (6 identical stores) ⏳

- [ ] Create factory pattern in `lib/create-modal-store.ts`
- [ ] Generate: `createNewStore<T>(name)` and `createOpenStore<T>(name)`
- [ ] Replace 6 stores: accounts (2), categories (2), transactions (2)

**Impact**: Reduces 90 lines → 20 lines  
**Effort**: 4 hours  
**Status**: Pending

### Consistency ✅

#### Type vs Interface (4 files) ✅

- [x] Convert all `interface` declarations to `type` for consistency
- [x] Fixed: `components/chart.tsx`, `components/ui/sheet.tsx`, `components/data-table.tsx`, `components/ui/generic-select.tsx`

**Commit**: `f069eb9` - "refactor: improve type consistency and query invalidation patterns"  
**Impact**: 4 files converted  
**Completed**: March 30, 2026

#### z.infer vs z.input ✅

- [x] Reviewed usage: `z.input` is correct for transaction form (uses coercion)
- [x] Decision: Keep `z.input` where coercion happens (date, amount), use `z.infer` elsewhere

**Status**: Verified correct, no changes needed  
**Completed**: March 30, 2026

### File Structure ✅

#### Columns in Wrong Location ✅

- [x] Move `app/(dashboard)/transactions/columns.tsx` → `features/transactions/components/`
- [x] Move `app/(dashboard)/accounts/columns.tsx` → `features/accounts/components/`
- [x] Move `app/(dashboard)/categories/columns.tsx` → `features/categories/components/`
- [x] Update imports in page files

**Commit**: `2363182` - "refactor: move column definitions from app/ to features/"  
**Files Changed**: 6 files (+9/-11)  
**Completed**: March 30, 2026

### Query Invalidation Patterns ✅

- [x] Fix `use-create-account.ts:21` to invalidate `["transactions"]`, `["summary"]`
- [x] Fix `use-create-category.ts` (same issue)
- [x] Note: `use-edit-account.ts` and `use-edit-category.ts` already correct

**Commit**: `f069eb9` - "refactor: improve type consistency and query invalidation patterns"  
**Files Changed**: 2 files  
**Completed**: March 30, 2026

---

## 🏗️ Architecture Improvements (Sprint 4-5)

**Structural enhancements for scalability**

### Error Handling

- [ ] Add error boundaries at layout level (`app/(dashboard)/layout.tsx`)
- [ ] Add error boundaries at page level (transactions, accounts, categories)
- [ ] Add error boundaries at sheet/modal level

**Effort**: 2 days

### Performance

- [ ] Implement cursor-based pagination in transactions API
- [ ] Add pagination to DataTable component
- [ ] Add loading states with spinners on mutation buttons

**File**: `app/(dashboard)/transactions/page.tsx:132`  
**Impact**: Loads all transactions client-side  
**Effort**: 1 week

### Data Integrity

- [ ] Implement soft delete pattern (add `deleted_at` timestamp)
- [ ] Add database triggers for automatic balance updates
- [ ] Affects: accounts, categories, transactions

**Effort**: 2 weeks

### Import Flow

- [ ] Add default transaction type handling in CSV import
- [ ] Fix FK constraint issue in `import-card.tsx:54-103`

**Effort**: 1 day

---

## ✨ New Features (Backlog)

**Future enhancements by priority**

### High Priority

#### Account Transfers

- [ ] Design: New `transaction_pairs` table (link debit/credit)
- [ ] Migration: Add "Transfer" transaction type
- [ ] API: `POST /api/transactions/transfer` (atomic DB transaction)
- [ ] UI: Form with fromAccount/toAccount selectors + AmountInput

**Effort**: 1-2 weeks

### Medium Priority

#### Plaid Integration (Bank Connections)

- [ ] Plaid Link component
- [ ] Webhook handler for transaction sync
- [ ] Account sync background job

**Effort**: 3-4 weeks

#### Lemon Squeezy Billing

- [ ] Subscription plans definition
- [ ] Webhook handler for payments
- [ ] Premium feature gates

**Effort**: 2-3 weeks

#### Recurring Transactions

- [ ] Cron job / scheduled task setup
- [ ] Recurrence pattern UI (daily, weekly, monthly)
- [ ] Next execution date calculation

**Effort**: 1 week

#### Budgets & Alerts

- [ ] Budget entity (category + amount + period)
- [ ] Real-time budget vs actual comparison
- [ ] Email/push notifications for overspending

**Effort**: 2-3 weeks

### Low Priority

#### Reports Export

- [ ] Server-side PDF generation
- [ ] Excel export functionality
- [ ] Custom date range reports

**Effort**: 1 week

#### Multi-Currency Support

- [ ] Add currency field to accounts
- [ ] Exchange rate API integration
- [ ] Conversion logic in summaries

**Current**: Hardcoded EUR (`lib/utils.ts:27-32`)  
**Effort**: 3-4 weeks

#### AI Auto-Categorization

- [ ] ML model training on user data
- [ ] Payee → Category suggestions
- [ ] Confidence scores

**Effort**: 4-6 weeks

#### Mobile App (React Native)

- [ ] Complete mobile rewrite

**Effort**: 6+ months

---

## 📊 Sprint Planning

### Sprint 1 (Week 1) - Critical Blockers ✅ COMPLETED

- ✅ Transaction type selector (full implementation)
- ✅ Account balance NULL fix
- ✅ Category parent selector
- ✅ Console.log cleanup

**Goal**: Unblock transaction creation  
**Status**: 100% complete (4/4 tasks)  
**Duration**: March 29, 2026

### Sprint 2 (Week 2) - Quick Wins 🚧 IN PROGRESS

- ✅ Type consistency fixes
- ✅ Query invalidation fixes
- ✅ Date parsing extraction
- ✅ Move columns to features/
- ⏳ Auth middleware extraction
- ⏳ Zustand factory pattern
- ⏳ SQL CASE extraction

**Goal**: Reduce code duplication by 40%  
**Status**: 73% complete (8/11 tasks)  
**Started**: March 30, 2026

### Sprint 3 (Week 3) - Architecture

- Import CSV transaction type fixes
- Remaining refactors from Sprint 2

**Goal**: Clean architecture adherence

### Sprint 4 (Week 4) - Resilience

- Error boundaries
- Loading states
- Soft delete pattern

**Goal**: Production-ready error handling

### Sprint 5+ (Month 2) - Features

- Account transfers
- Pagination
- Database triggers
- Plaid / Lemon Squeezy integration

**Goal**: Core feature completion

---

## 🎯 Definition of Done

**For each task**:

- [x] Code implemented following `.opencode/docs/rules.md`
- [x] No console.log statements
- [x] Conventional commit message
- [x] Verified in dev environment
- [x] No TypeScript errors
- [x] Follows project conventions (kebab-case, type over interface)

**For blockers**:

- [x] End-to-end manual test passed
- [x] Related features still work (regression check)

---

## 📈 Progress Tracking

**Overall Progress**: 15 / 60 tasks completed (25%)

### By Sprint

- **Sprint 1 (Blockers)**: ✅ 4/4 (100%)
- **Sprint 2 (Quick Wins)**: 🚧 8/11 (73%)
- **Sprint 3 (Structure)**: ⏳ 0/3 (0%)
- **Sprint 4 (Resilience)**: ⏳ 0/4 (0%)
- **Sprint 5+ (Features)**: ⏳ 0/38 (0%)

### Recent Commits (Last 5)

1. `6af62dd` - docs: update README with comprehensive project overview
2. `2363182` - refactor: move column definitions from app/ to features/
3. `20f3e8e` - refactor: extract date parsing logic to reusable utility function
4. `f069eb9` - refactor: improve type consistency and query invalidation patterns
5. `89e27df` - feat: add category parent selector with circular reference prevention

**Last Sprint Completed**: Sprint 1 (March 29, 2026)  
**Current Sprint**: Sprint 2 (73% complete)  
**Next Sprint**: Sprint 3 (Architecture)

**Blocked**: None  
**In Progress**: Auth middleware, Zustand factory, SQL CASE extraction
