# Pending Features - Aureo

## 🚧 Transaction Type Selector

**Status**: Schema OK, UI NO

- Table `transactionTypes`: "Income", "Expense", "Refund"
- Form hardcodes `transactionTypeId: ""`
- **TODO**: GET endpoint + hook + `<GenericSelect>` in form

**Location**: `features/transactions/components/transaction-form.tsx:66`

## 🚧 Category Parent Selector

**Status**: Schema supports hierarchy, UI NO

- `categories.parentId` allows parent-child
- Form only accepts `name`
- **TODO**: Hook tree structure + optional selector + hierarchy UI

**Location**: `features/categories/components/category-form.tsx`

## 🚧 Account Transfers

**Status**: NOT implemented

**Design**:

1. New table `transaction_pairs` (link debit/credit transactions)
2. New transaction type "Transfer"
3. Endpoint `POST /api/transactions/transfer` (atomic DB transaction)
4. Form: fromAccount/toAccount selectors + positive AmountInput

**Impact**: DB migration + new endpoint + new form

## 🚧 Plaid Integration

Connect real banks, auto-import transactions.
**Priority**: Low

## 🚧 Lemon Squeezy Integration

Monetization, subscriptions, billing.
**Priority**: Medium

## 🐛 Known Issues

1. **Balance Initialization**: NULL when creating account (not critical)
2. **Transaction Type Hardcoded**: FK constraint fails
3. **Cascade Delete**: Soft delete? Archive?

## ✨ Future Ideas

- Recurring transactions (cron job)
- Budgets per category + alerts
- Multi-currency + conversions
- PDF + Excel export reports
- Mobile app (React Native)
- AI categorization (payee → category)
