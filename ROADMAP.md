# Aureo Finance Platform - Development Roadmap

> **Last Updated**: March 29, 2026  
> **Project Status**: Active Development

---

## 🚨 Critical Blockers (Sprint 1)

**Must be fixed before production deployment**

### Transaction Type Selector (BLOCKER)

- [ ] **DB**: Create migration for `transaction_types` table + seed data (Income, Expense, Refund)
- [ ] **API**: Add `GET /api/transaction-types` endpoint
- [ ] **Hook**: Create `features/transaction-types/api/use-get-transaction-types.ts`
- [ ] **UI**: Replace hardcoded `transactionTypeId: ""` with `<GenericSelect>` in `transaction-form.tsx:74`
- [ ] **Fix**: Update seed script to use real transaction type IDs (`scripts/seed.ts:96`)
- [ ] **Test**: Verify transaction creation works end-to-end

**File**: `features/transactions/components/transaction-form.tsx:74`  
**Impact**: FK constraint fails, cannot create transactions  
**Effort**: 2-3 days

### Account Balance Initialization

- [ ] Set `balance: 0` as default in POST `/api/accounts` instead of NULL

**File**: `app/api/[[...route]]/accounts.ts:82-89`  
**Impact**: Summary calculations may break  
**Effort**: 1 hour

### Category Parent Selector

- [ ] Add optional parent category selector to `CategoryForm`
- [ ] Filter out self + descendants to prevent circular references
- [ ] Display hierarchy in categories list (indent/tree view)

**File**: `features/categories/components/category-form.tsx:18-20`  
**Impact**: Cannot use category hierarchy feature  
**Effort**: 1-2 days

### Cleanup

- [ ] Remove `console.log("TOPPPPP", top)` from production code

**File**: `app/api/[[...route]]/summary/by-category.ts:35`  
**Effort**: 5 minutes

---

## 🔧 Technical Debt (Sprint 2-3)

**Refactoring to improve maintainability**

### Code Duplication

#### Auth Middleware (12 instances)

- [ ] Extract reusable auth wrapper to `lib/auth-middleware.ts`
- [ ] Replace in all endpoints: accounts (6), categories (6), transactions (7), summary (3)

**Pattern**: Same 4-layer auth repeated everywhere  
**Effort**: 1 day

#### Date Parsing (5 instances)

- [ ] Extract to `lib/date-utils.ts` as `parseDateRange(from?, to?)`
- [ ] Replace in: `transactions.ts`, `summary/overview.ts`, `summary/over-time.ts`, `summary/by-category.ts`

**Effort**: 2 hours

#### SQL CASE Expressions (3 instances)

- [ ] Extract to Drizzle helper function in `db/helpers.ts`
- [ ] Replace in: `summary/overview.ts:47-66`, `summary/over-time.ts:47-66`, `summary/by-category.ts:45-51`

**Effort**: 1 day

### Zustand Store Boilerplate (6 identical stores)

- [ ] Create factory pattern in `lib/create-modal-store.ts`
- [ ] Generate: `createNewStore<T>(name)` and `createOpenStore<T>(name)`
- [ ] Replace 6 stores: accounts (2), categories (2), transactions (2)

**Impact**: Reduces 90 lines → 20 lines  
**Effort**: 4 hours

### Consistency

#### Type vs Interface (6 interfaces should be types)

- [ ] Convert all `interface` declarations to `type` for consistency
- [ ] Affected: `components/ui/generic-select.tsx:17` + 5 others

**Standard**: Project uses `type` 97% of the time  
**Effort**: 1 hour

#### z.infer vs z.input

- [ ] Standardize on `z.infer` (or document when to use `z.input`)
- [ ] Fix: `features/transactions/components/transaction-form.tsx:36-37`

**Effort**: 30 minutes

### File Structure

#### Columns in Wrong Location

- [ ] Move `app/(dashboard)/transactions/columns.tsx` → `features/transactions/components/`
- [ ] Move `app/(dashboard)/accounts/columns.tsx` → `features/accounts/components/`
- [ ] Move `app/(dashboard)/categories/columns.tsx` → `features/categories/components/`
- [ ] Update imports in page files

**Effort**: 4 hours

### Query Invalidation Patterns

- [ ] Fix `use-create-account.ts:21` to invalidate `["transactions"]`, `["summary"]`
- [ ] Fix `use-edit-account.ts` (same issue)
- [ ] Fix `use-create-category.ts` (same issue)
- [ ] Fix `use-edit-category.ts` (same issue)

**Reference**: `state-management.md:119-136`  
**Effort**: 1 hour

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

### Sprint 1 (Week 1) - Critical Blockers

- Transaction type selector (full implementation)
- Account balance NULL fix
- Category parent selector
- Console.log cleanup

**Goal**: Unblock transaction creation

### Sprint 2 (Week 2) - Quick Wins

- Auth middleware extraction
- Date parsing extraction
- Zustand factory pattern
- Type consistency fixes
- Query invalidation fixes

**Goal**: Reduce code duplication by 40%

### Sprint 3 (Week 3) - Structure

- Move columns to features/
- SQL CASE extraction
- Import CSV fixes

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

- [ ] Code implemented following `.opencode/docs/rules.md`
- [ ] No console.log statements
- [ ] Conventional commit message
- [ ] Verified in dev environment
- [ ] No TypeScript errors
- [ ] Follows project conventions (kebab-case, type over interface)

**For blockers**:

- [ ] End-to-end manual test passed
- [ ] Related features still work (regression check)

---

## 📈 Progress Tracking

**Completed**: 0 / 60 tasks  
**In Progress**: Transaction type selector  
**Blocked**: None

**Last Sprint**: N/A  
**Next Sprint**: Sprint 1 (Critical Blockers)
