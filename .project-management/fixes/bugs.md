# Known Bugs

> **Purpose**: Track active bugs and their fixes  
> **Last Updated**: April 3, 2026

---

## 🐛 Active Bugs

### 🔥 CRITICAL: Balance Trigger Corruption (Sprint 07)

**Severity**: 🔴 **CRITICAL**  
**Status**: 🚀 Sprint 07 in progress  
**Discovered**: April 3, 2026

**Description**: Database trigger `update_account_balance()` corrupts account balances by always adding amounts regardless of transaction type, causing expenses to incorrectly increase balance.

**Impact**:

- All accounts with expense transactions have inflated balances
- Error formula: +2 × amount per expense transaction
- Example: $50 expense creates $100 error ($950 expected → $1,050 actual)

**Files Affected**:

- Database trigger: `update_account_balance()` on `transactions` table
- Migration needed: `drizzle/XXXX_fix_balance_trigger.sql`

**Priority**: P0 - CRITICAL  
**Effort**: 2-3 days

**Sprint**: See `.project-management/sprints/sprint-07.md` for full fix plan  
**Detailed Report**: See `.project-management/fixes/balance-trigger-bug.md`

---

---

## 📝 Bug Report Template

When adding a new bug, use this format:

```markdown
### [Bug Title]

**Severity**: 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

**Description**:
Brief description of the bug

**Steps to Reproduce**:

1. Step one
2. Step two
3. Expected vs actual behavior

**Impact**:

- Who is affected
- What functionality is broken

**Root Cause** (if known):
Technical explanation

**Proposed Fix**:

- [ ] Task 1
- [ ] Task 2

**Files Affected**:

- `path/to/file.tsx:line`

**Priority**: HIGH | MEDIUM | LOW
**Effort**: X hours/days
```

---

## ℹ️ Note

When a bug is fixed, remove it from this list and document it in the corresponding sprint file in `done/sprint-XX-completed.md`.
