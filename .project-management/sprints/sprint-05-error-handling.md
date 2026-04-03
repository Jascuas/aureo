# Sprint 05: Error Handling & UX Polish

> **Status**: 🚧 In Progress  
> **Start Date**: April 10, 2026  
> **End Date**: April 13, 2026  
> **Duration**: 3 days  
> **Priority**: MEDIUM

---

## 🎯 Goals

1. **Primary**: Implement error boundaries to prevent full page crashes
2. **Secondary**: Polish loading states in form submit buttons

---

## 📋 Tasks

### Task 1: Error Boundaries (2 days)

#### Create Error Boundary Component

- [ ] Create `components/error-boundary.tsx` with React Error Boundary
  - User-friendly error messages
  - "Try Again" button to reset error state
  - Optional error reporting (log to console/Sentry)
  - Different variants: layout-level vs component-level

#### Add Error Boundaries to Layout

- [ ] Add error boundary to `app/(dashboard)/layout.tsx`
  - Catches errors across all dashboard pages
  - Prevents full app crash
  - Shows fallback UI

#### Add Error Boundaries to Pages

- [ ] Add error boundary to transactions page
- [ ] Add error boundary to accounts page
- [ ] Add error boundary to categories page

#### Add Error Boundaries to Components

- [ ] Add error boundary to sheets/modals (optional, component-level)
- [ ] Add error boundary to charts (optional, prevents chart errors from breaking page)

#### Design Error Messages

- [ ] Design user-friendly error messages:
  - "Something went wrong loading your transactions"
  - "Unable to load this chart. Try refreshing the page."
  - "An error occurred. Please try again."
- [ ] Add error icons/illustrations (optional)

**Files**:

- `components/error-boundary.tsx` (new)
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/transactions/page.tsx`
- `app/(dashboard)/accounts/page.tsx`
- `app/(dashboard)/categories/page.tsx`

---

### Task 2: Loading States Polish (1 hour)

#### Add Loading Spinners to Submit Buttons

- [ ] Update `AccountForm` submit button
  - Add `<Loader2>` icon when `isPending`
  - Change text: "Create account" → "Creating..."
  - **File**: `features/accounts/components/account-form.tsx`

- [ ] Update `CategoryForm` submit button
  - Add `<Loader2>` icon when `isPending`
  - Change text: "Create category" → "Creating..."
  - **File**: `features/categories/components/category-form.tsx`

- [ ] Update `TransactionForm` submit button
  - Add `<Loader2>` icon when `isPending`
  - Change text: "Create transaction" → "Creating..."
  - **File**: `features/transactions/components/transaction-form.tsx`

**Pattern**:

```tsx
<Button className="w-full" disabled={isPending}>
  {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
  {isPending ? "Creating..." : "Create account"}
</Button>
```

---

## 📦 Deliverables

- [ ] Reusable ErrorBoundary component
- [ ] Error boundaries in layout + 3 pages
- [ ] User-friendly error messages
- [ ] Loading spinners in all form submit buttons

---

## 🚀 Success Criteria

### Error Boundaries

- ✅ Throwing error in chart doesn't crash entire page
- ✅ Error boundary shows user-friendly message
- ✅ "Try Again" button resets error state
- ✅ Layout-level boundary catches all page errors

### Loading States

- ✅ Submit buttons show spinner when pending
- ✅ Button text changes during mutation
- ✅ User gets clear visual feedback during form submission

---

## 🔧 Technical Details

### Error Boundary Example

```tsx
// components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <AlertTriangle className="text-muted-foreground size-8" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## 📝 Notes

- **Why Error Boundaries?** Prevents entire app crash when one component fails
- **Why Loader2 in buttons?** Clear visual feedback improves perceived performance
- **Future**: Consider adding error reporting service (Sentry, LogRocket)

---

## 🐛 Risks

- **Error boundaries are client-only**: Must use `"use client"` directive
- **Server errors**: Error boundaries don't catch server component errors (need separate handling)
- **Over-engineering**: Don't add error boundaries to every component (focus on critical paths)

---

## 🔗 Related

- **Tech Debt**: Error Boundaries (MEDIUM priority), Loading States (LOW priority)
- **Files**: Multiple component files across `components/`, `features/`, `app/`
