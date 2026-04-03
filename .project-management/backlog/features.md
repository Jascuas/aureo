# Feature Backlog

> **Purpose**: Future enhancements and integrations on hold  
> **Last Updated**: April 3, 2026 (Added refactoring ideas and soft delete from tech-debt)

---

## 🔥 High Priority Features

### CSV Import with AI 🚀 CRITICAL

**Status**: 🎯 **TOP PRIORITY** - Biggest project task

**Description**: Import transactions from CSV files using AI to parse and auto-categorize transactions intelligently.

**Requirements**:

- [ ] Design upload UI component (drag-and-drop + file picker)
- [ ] Implement CSV parsing logic (handle multiple formats: bank exports, manual exports)
- [ ] Integrate Claude API for AI categorization
- [ ] Build preview/review UI (show parsed transactions before import)
- [ ] Create `POST /api/transactions/import` endpoint
- [ ] Implement backend validation (duplicate detection, amount parsing)
- [ ] Handle negative amounts (some banks use negatives for expenses)
- [ ] Add import history tracking
- [ ] Design error handling for malformed CSV files
- [ ] Implement API rate limiting for Claude calls
- [ ] Optimize memory usage for large CSV files (1000+ transactions)

**Technical Challenges**:

- Different CSV formats across banks
- Duplicate transaction detection
- Negative amount handling (varies by bank)
- Claude API rate limiting
- Large CSV memory optimization

**Effort**: 3-4 weeks  
**Priority**: CRITICAL  
**Blocked By**: None

---

### Investments Dashboard (Arfin-style) 💎

**Status**: 🔥 **HIGH PRIORITY**

**Description**: Unified investments visualization dashboard with percentage change indicators (up/down) for crypto and stocks.

**Requirements**:

- [ ] Create `/investments` page route
- [ ] Design investments data model (consider integration with transactions)
- [ ] Integrate external APIs:
  - CoinGecko API for crypto prices
  - Yahoo Finance API for stock prices
- [ ] Build investment overview dashboard card
- [ ] Implement real-time price updates
- [ ] Add % change visualization (green/red indicators)
- [ ] Create portfolio allocation chart
- [ ] Add manual investment entry form

**Files**:

- `app/(dashboard)/investments/page.tsx` (new)
- `features/investments/` (new feature directory)
- `app/api/[[...route]]/investments.ts` (new)
- `components/investment-card.tsx` (new)

**Effort**: 2-3 weeks  
**Priority**: HIGH  
**Blocked By**: None

---

### Account Transfers

**Status**: 🎯 **MOVED TO SPRINT 02**

**Description**: Enable transferring funds between accounts

**Requirements**:

- [ ] Design `transaction_pairs` table to link debit/credit transactions
- [ ] Add "Transfer" transaction type to database
- [ ] Create `POST /api/transactions/transfer` endpoint (atomic DB transaction)
- [ ] Build transfer form UI with fromAccount/toAccount selectors
- [ ] Implement amount validation (can't exceed source account balance)
- [ ] Add transfer visualization in transaction list

**Effort**: 2 weeks  
**Priority**: HIGH  
**Blocked By**: None

**Note**: This feature has been moved to Sprint 02 for active development. See `.project-management/sprints/sprint-02.md` for detailed implementation plan.

---

### Database Triggers for Balance

**Status**: 🔥 **CRITICAL BUG FOUND - SPRINT 07**

**Description**: Fix critical bug in existing balance trigger that corrupts account balances

**Requirements**:

- [ ] Diagnose balance corruption (trigger ignores transaction type)
- [ ] Create migration to recalculate all corrupted balances
- [ ] Fix trigger to respect transaction types (income/expense/refund)
- [ ] Test INSERT, UPDATE, DELETE operations
- [ ] Create admin balance verification endpoint
- [ ] Document trigger behavior in architecture docs

**Effort**: 2-3 days  
**Priority**: P0 - CRITICAL  
**Blocked By**: None

**Critical Issue**: Existing trigger always adds amount (ignores transaction type), causing expenses to incorrectly increase balance instead of decreasing it. This creates +2× error per expense transaction.

**Note**: This is now a CRITICAL BUG FIX sprint. See `.project-management/sprints/sprint-07.md` for detailed fix plan.

---

## 📊 Medium Priority Features

### Category Filtering in Statistics

**Description**: Add ability to filter statistics and charts by specific category.

**Requirements**:

- [ ] Add category dropdown filter to SpendingPie component
- [ ] Update `by-category` endpoint with optional `categoryId` query parameter
- [ ] Implement filter state management
- [ ] Update chart data based on selected category
- [ ] Add "All Categories" option to reset filter
- [ ] Persist filter selection in URL params

**Files**:

- `components/spending-pie.tsx`
- `app/api/[[...route]]/summary/by-category.ts`

**Effort**: 1 week  
**Priority**: MEDIUM  
**Blocked By**: None

---

### Investment % Change in Overview

**Description**: Show investment percentage change in the main dashboard overview card.

**Requirements**:

- [ ] Calculate investment % change for selected time period
- [ ] Add new "Investments" card to dashboard
- [ ] Integrate with current asset prices (crypto/stocks)
- [ ] Display green/red indicator based on performance
- [ ] Add click-through to investments page

**Files**:

- `app/api/[[...route]]/summary/overview.ts`
- `app/(dashboard)/page.tsx`
- `components/data-card.tsx`

**Effort**: 1 week  
**Priority**: MEDIUM  
**Blocked By**: Feature "Investments Dashboard (Arfin-style)" must be completed first

---

### Recurring Transactions

**Description**: Automate recurring income/expenses

**Requirements**:

- [ ] Design `recurring_transactions` table (pattern, next_date, etc.)
- [ ] Add cron job or scheduled task infrastructure
- [ ] Build recurrence pattern UI (daily, weekly, monthly, yearly)
- [ ] Implement next execution date calculation
- [ ] Add enable/disable toggle
- [ ] Show upcoming recurring transactions on dashboard

**Effort**: 1 week  
**Priority**: MEDIUM

---

### Budgets & Alerts

**Description**: Set spending limits and get notifications

**Requirements**:

- [ ] Design `budgets` table (category, amount, period)
- [ ] Create budget CRUD API endpoints
- [ ] Build budget creation/editing UI
- [ ] Implement real-time budget vs actual comparison
- [ ] Add email/push notification system
- [ ] Create budget overview dashboard widget
- [ ] Add overspending alerts

**Effort**: 2-3 weeks  
**Priority**: MEDIUM

---

### Multi-Currency Support

**Description**: Support multiple currencies with real-time exchange rates

**Requirements**:

- [ ] Add `currency` field to accounts table
- [ ] Integrate exchange rate API (e.g., exchangerate-api.com)
- [ ] Update amount display logic to show currency symbols
- [ ] Add currency conversion in summary calculations
- [ ] Build currency selector in account form
- [ ] Add base currency setting in user preferences

**Current State**: Hardcoded EUR in `lib/utils.ts:27-32`

**Effort**: 3-4 weeks  
**Priority**: MEDIUM

---

## 🔌 Integration Features

### Plaid Integration (Bank Connections)

**Description**: Connect real bank accounts for automatic transaction sync

**Requirements**:

- [ ] Set up Plaid developer account
- [ ] Implement Plaid Link component
- [ ] Create webhook handler for transaction sync
- [ ] Build account sync background job
- [ ] Add bank connection management UI
- [ ] Handle duplicate transaction detection
- [ ] Implement manual review flow for auto-imported transactions

**Effort**: 3-4 weeks  
**Priority**: MEDIUM  
**Status**: ⏸️ PAUSED (waiting for MVP completion)

---

### Lemon Squeezy Billing

**Description**: Monetize with subscription plans

**Requirements**:

- [ ] Set up Lemon Squeezy account
- [ ] Define subscription plans (Free, Pro, Premium)
- [ ] Create webhook handler for payment events
- [ ] Implement premium feature gates
- [ ] Build subscription management UI
- [ ] Add billing portal link
- [ ] Design upgrade prompts for free users

**Effort**: 2-3 weeks  
**Priority**: MEDIUM  
**Status**: ⏸️ PAUSED (waiting for user base growth)

---

## 📈 Low Priority Features

### Soft Delete Pattern

**Status**: 💡 **DEFERRED** (implement if user requests data recovery)

**Description**: Implement soft delete pattern for transactions/accounts/categories (mark as deleted instead of hard delete).

**Requirements**:

- [ ] Add `deletedAt` timestamp field to transactions, accounts, categories tables
- [ ] Create migration with partial indexes for performance
- [ ] Create helper utilities (`notDeleted()`, `softDeleteNow()`, `restoreSoftDeleted()`)
- [ ] Update all queries to filter `WHERE deletedAt IS NULL`
- [ ] Update delete endpoints to use soft delete
- [ ] (Optional) Create "Trash" UI for restoring deleted items

**Benefits**:

- Data recovery for accidental deletions
- Audit trail for compliance
- No foreign key issues

**Trade-offs**:

- Adds complexity to all queries
- Database grows continuously (mitigable with archiving)

**Effort**: 1-2 weeks  
**Priority**: LOW (no user requests yet)

---

### Refactoring Ideas (Evaluated in Sprint 06)

**Status**: ✅ **EVALUATED** - No implementation needed

All refactoring ideas were analyzed in Sprint 06. **Result**: None require implementation at this time.

| Idea                          | Status        | Decision                           |
| ----------------------------- | ------------- | ---------------------------------- |
| Chart Factory Pattern         | ⏸️ Skip       | Over-abstraction, no clear benefit |
| Consolidate Summary Endpoints | ✅ Keep as-is | Current structure is correct       |
| OpenAPI Documentation         | ⏸️ Defer      | Low priority for small teams       |
| Split Large Forms             | ✅ Keep as-is | Forms are not too large            |
| Drizzle Query Patterns        | ✅ Keep as-is | Already following best practices   |

**Reference**: See `.project-management/done/sprint-06-completed.md` for full analysis.

---

### Additional Feature Ideas (Brainstorming)

**Status**: 💡 **EXPLORATION PHASE**

**Description**: Collection of potential features to explore and prioritize in future sprints.

**Ideas**:

- [ ] **Tags for Transactions**: Add multi-tag support (e.g., "business", "tax-deductible", "vacation")
- [ ] **Goals/Savings Tracker**: Set financial goals and track progress
- [ ] **Merchant Insights**: Analyze spending by merchant/vendor
- [ ] **Split Transactions**: One transaction → multiple categories with percentages
- [ ] **Scheduled Transactions**: Plan future transactions and get reminders
- [ ] **Export/Backup**: Export data to JSON/CSV for backup or migration
- [ ] **Tax Report Generator**: Generate tax-ready reports by category
- [ ] **Receipt Attachments**: Upload receipt images to transactions
- [ ] **Transaction Notes**: Add detailed notes/descriptions to transactions
- [ ] **Multi-user Support**: Share accounts/budgets with family members

**Priority**: LOW (needs user feedback to prioritize)  
**Status**: Pending user research and feedback

---

### Reports Export

**Description**: Generate downloadable financial reports

**Requirements**:

- [ ] Implement server-side PDF generation
- [ ] Add Excel export functionality
- [ ] Create custom date range report builder
- [ ] Design report templates (monthly, yearly, tax)
- [ ] Add scheduled report emails

**Effort**: 1 week  
**Priority**: LOW

---

### AI Auto-Categorization

**Description**: ML-powered transaction categorization

**Requirements**:

- [ ] Collect training data from user transactions
- [ ] Train ML model on payee → category patterns
- [ ] Implement prediction API
- [ ] Add confidence scores to suggestions
- [ ] Build review/approve UI for suggestions
- [ ] Add model retraining on user feedback

**Effort**: 4-6 weeks  
**Priority**: LOW

---

### Mobile App (React Native)

**Description**: Native mobile experience

**Requirements**:

- [ ] Set up React Native project
- [ ] Design mobile-optimized UI
- [ ] Implement offline-first architecture
- [ ] Add biometric authentication
- [ ] Build quick transaction entry widget
- [ ] Implement push notifications
- [ ] Add camera for receipt scanning

**Effort**: 6+ months  
**Priority**: LOW  
**Status**: ⏸️ PAUSED (web-first strategy)

---

## 📝 Notes

- Features are ordered by priority within each section
- Move to active sprint when ready to implement
- Update effort estimates as we learn more
- Mark as ⏸️ PAUSED if explicitly postponed
