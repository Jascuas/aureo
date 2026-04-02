# Known Bugs

> **Purpose**: Track active bugs and their fixes  
> **Last Updated**: April 2, 2026

---

## 🐛 Active Bugs

### Balance % Incorrect in Overview Card

**Severity**: 🟡 High

**Description**: The percentage change in the Balance card is calculating incorrectly on the dashboard overview.

**Root Cause** (suspected): Order of parameters in `calculatePercentageChange()` may be inverted in the overview endpoint.

**Files Affected**:

- `app/api/[[...route]]/summary/overview.ts:96-99`
- `lib/balance-utils.ts`
- `lib/utils.ts:34-40`

**Priority**: HIGH  
**Effort**: 1-2 hours

---

### Category Chart Shows NaN in Percentages

**Severity**: 🟡 High

**Description**: In the categories chart (RadialVariant component), `NaN%` appears instead of correct percentages when hovering over chart sections.

**Root Cause** (suspected): Broken during `@types/react` update, or the endpoint returns incorrect data structure that RadialVariant doesn't handle properly.

**Files Affected**:

- `components/radial-variant.tsx`
- `app/api/[[...route]]/summary/by-category.ts`

**Priority**: HIGH  
**Effort**: 2-3 hours

---

### Cards Broken in Mobile

**Severity**: 🟢 Medium

**Description**: Dashboard cards don't display properly on mobile devices. Layout issues affect user experience on smaller screens.

**Impact**:

- Poor mobile UX
- Cards may overlap or have incorrect sizing
- Affects all dashboard views

**Files Affected**:

- `components/data-card.tsx`
- `app/(dashboard)/page.tsx`

**Priority**: MEDIUM  
**Effort**: 3-4 hours

---

### Dialog Accessibility Issues (Missing DialogTitle)

**Severity**: 🟢 Medium

**Description**: Multiple dialog components are missing required `DialogTitle` and `Description` for screen reader accessibility

**Browser Warning**:

```
`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.

If you want to hide the `DialogTitle`, you can wrap it with our VisuallyHidden component.

Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

**Root Cause**: Sheet/Dialog components not following Radix UI accessibility requirements

**Proposed Fix**:

- Add `DialogTitle` to all dialog components (or wrap with `VisuallyHidden` if title should be hidden visually)
- Add `DialogDescription` or `aria-describedby={undefined}` to dialogs without descriptions

**Files Affected**:

- All `*-sheet.tsx` components in `features/*/components/`
- Any component using `Dialog` or `Sheet` from `@/components/ui/`

**Reference**: https://radix-ui.com/primitives/docs/components/dialog

**Priority**: MEDIUM (accessibility compliance)  
**Effort**: 2-3 hours

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
