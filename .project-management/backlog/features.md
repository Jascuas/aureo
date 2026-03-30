# Feature Backlog

> **Purpose**: Future enhancements and integrations on hold  
> **Last Updated**: March 30, 2026

---

## 🔥 High Priority Features

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

**Description**: Auto-update account balances via DB triggers instead of manual calculations

**Requirements**:

- [ ] Create trigger for INSERT on transactions table
- [ ] Create trigger for UPDATE on transactions table
- [ ] Create trigger for DELETE on transactions table
- [ ] Remove manual balance update logic from API
- [ ] Test race condition scenarios
- [ ] Document trigger behavior in schema docs

**Effort**: 1 week  
**Priority**: HIGH  
**Blocked By**: None

---

## 📊 Medium Priority Features

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
