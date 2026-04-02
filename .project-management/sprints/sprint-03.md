# Sprint 03 - Bug Fixes

> **Status**: 🚧 In Progress  
> **Start Date**: April 2, 2026  
> **End Date**: April 9, 2026  
> **Duration**: 1 week  
> **Goal**: Fix all critical bugs and accessibility issues

---

## 🎯 Sprint Goal

Fix all critical bugs and accessibility issues affecting user experience across the dashboard.

---

## 📋 Sprint Tasks

### 1. Balance % Incorrect in Overview Card 🟡 HIGH

**Description**: Fix percentage change calculation in Balance card

**Tasks**:

- [ ] Investigate parameter order in `calculatePercentageChange()` calls
- [ ] Review balance calculation logic in `overview.ts:96-99`
- [ ] Test with multiple date ranges to verify correct behavior
- [ ] Add unit tests for percentage calculation

**Files**:

- `app/api/[[...route]]/summary/overview.ts:96-99`
- `lib/balance-utils.ts`
- `lib/utils.ts:34-40`

**Priority**: HIGH  
**Effort**: 1-2 hours  
**Assignee**: TBD

---

### 2. Category Chart Shows NaN in Percentages 🟡 HIGH

**Description**: Fix NaN% appearing in RadialVariant chart component

**Tasks**:

- [ ] Debug data structure returned by `by-category` endpoint
- [ ] Check RadialVariant percentage calculation logic
- [ ] Verify data transformation in chart component
- [ ] Add null/undefined guards for percentage calculations
- [ ] Test with various category data scenarios

**Files**:

- `components/radial-variant.tsx`
- `app/api/[[...route]]/summary/by-category.ts`

**Priority**: HIGH  
**Effort**: 2-3 hours  
**Assignee**: TBD

---

### 3. Cards Broken in Mobile 🟢 MEDIUM

**Description**: Fix dashboard card display issues on mobile devices

**Tasks**:

- [ ] Audit DataCard component responsive styles
- [ ] Test on various mobile breakpoints (320px, 375px, 414px)
- [ ] Fix card spacing/sizing issues
- [ ] Verify grid layout on mobile
- [ ] Test on real devices (iOS Safari, Chrome Android)

**Files**:

- `components/data-card.tsx`
- `app/(dashboard)/page.tsx`

**Priority**: MEDIUM  
**Effort**: 3-4 hours  
**Assignee**: TBD

---

### 4. Dialog Accessibility Issues (Missing DialogTitle) 🟢 MEDIUM

**Description**: Fix accessibility issues in dialog components (missing DialogTitle and Description)

**Tasks**:

- [ ] Audit all `*-sheet.tsx` components in `features/*/components/`
- [ ] Add `DialogTitle` to all dialogs (or wrap with `VisuallyHidden`)
- [ ] Add `DialogDescription` or `aria-describedby={undefined}` where needed
- [ ] Test with screen reader to verify accessibility
- [ ] Verify no browser warnings remain

**Files**:

- All `*-sheet.tsx` components in `features/*/components/`
- Any component using `Dialog` or `Sheet` from `@/components/ui/`

**Reference**: https://radix-ui.com/primitives/docs/components/dialog

**Priority**: MEDIUM  
**Effort**: 2-3 hours  
**Assignee**: TBD

---

## 📊 Sprint Progress

**Status**: 0% complete (0/4 tasks)  
**Required Tasks**: 4  
**Optional Tasks**: 0

### Task Completion Checklist

- [ ] Task 1: Balance % fix
- [ ] Task 2: Category NaN fix
- [ ] Task 3: Mobile cards fix
- [ ] Task 4: Dialog accessibility fix

---

## 🎯 Success Criteria

- ✅ All 4 bugs fixed and tested
- ✅ Dashboard displays correctly on mobile devices
- ✅ Percentage calculations show correct values
- ✅ All dialogs meet accessibility standards (no browser warnings)

---

## 🚀 Next Sprint Preview

**Sprint 04 Focus**: Begin CSV Import implementation (frontend + AI integration)

**Planned Tasks**:

- Build CSV upload UI component
- Implement CSV parsing logic
- Integrate Claude API for categorization
- Create preview/review interface
