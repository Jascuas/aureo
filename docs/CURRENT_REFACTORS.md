# Current Architecture Refactors

## Purpose

This file records migrations that are actively moving existing code toward
`AGENTS.md`, `docs/PRODUCT.md`, and `docs/DESIGN.md`. It is a coordination
register, not a backlog and never an override.

A known bug, audit finding, idea, or desired cleanup belongs in Plane until work
is approved and active. Remove a refactor entry when the migration is complete
or no longer active; retain durable decisions in the governing document.

## Required entry format

### AUR-REF-NNN — Short title

- **Status:** Planned | Active | Paused | Complete
- **Plane:** `AUR-NNN`
- **Target authority:** Contract section being restored.
- **Scope:** Exact routes, modules, or data paths included.
- **Current gap:** Concise observed non-compliance with dated evidence.
- **Target state:** Observable compliant outcome.
- **Migration sequence:** Ordered safe stages.
- **Compatibility:** Temporary adapters or behavior that must be preserved.
- **Exit criteria:** Checks and human evidence required to remove the entry.
- **Owner:** Current human or agent owner.
- **Last reviewed:** YYYY-MM-DD.

## Reviewed child migration map

The final coordination pass reviewed the three child tickets against the
checkout on 2026-09-06. Their implementation ownership is not duplicated here:

| Plane | Scope owner | Reviewed result | Affected path or contract | Removal / closure criterion |
| --- | --- | --- | --- | --- |
| `AUR-20` | TypeScript, import, and client-state boundaries | Complete in Plane; one residual feature-to-route UI bridge remains explicitly tracked below rather than silently treated as compliant. | `features/{accounts,categories,transactions}/components/columns.tsx` | Move the five route-owned UI imports into their owning feature components and remove the bridge entry after lint, TypeScript, and build pass. |
| `AUR-21` | Deployment-relative typed Hono client | Complete and verified in `lib/hono.ts`; the client uses the relative `/` base. | `lib/hono.ts` | No `NEXT_PUBLIC_APP_URL!` or ad hoc origin construction remains in the typed client. |
| `AUR-22` | Residual demo and admin routes | Complete in the checkout; no `(spacing-demo)` route or product `/api/admin/verify-balances` mount remains. | `app/(spacing-demo)/`, `app/api/[[...route]]/admin/verify-balances.ts` | Route/file absence and a production build remain verified. |
| `AUR-19` | Final architecture coordination | Active while this audit and bounded adapter extraction are reviewed. | `app/api/[[...route]]/accounts.ts`, `app/api/[[...route]]/summary/by-account.ts`, and the audit documents | Adapters contain only HTTP concerns, the matrix has no unowned confirmed violation, and the remaining bridge has a named owner and exit criterion. |

## Active refactors

### AUR-REF-020 — Remove the residual feature-to-route UI bridge

- **Status:** Active
- **Plane:** `AUR-20`, coordinated by `AUR-19`
- **Target authority:** `AGENTS.md` — feature ownership and dependency direction.
- **Scope:** `features/accounts/components/columns.tsx`, `features/categories/components/columns.tsx`, `features/transactions/components/columns.tsx`, and the five imported UI modules under `app/(dashboard)/`.
- **Current gap:** Feature column components still import route-owned `Actions`, `AccountColumn`, and `CategoryColumn` components. This is a confirmed dependency inversion, not an approved exception.
- **Target state:** Reusable feature UI owns these components; `features/*` has no import from `app/`.
- **Migration sequence:** Move or recreate the narrow components under the owning feature; update column imports; remove the route-only copies; run lint, standalone TypeScript, and build; refresh this entry and the matrix.
- **Compatibility:** Preserve rendered behavior, mutation hooks, navigation callbacks, keyboard access, and existing API contracts while changing module ownership only.
- **Exit criteria:** `search_files` finds no `@/app/` import under `features/`; the affected files pass all repository checks; the entry is removed in the child implementation that owns the boundary.
- **Owner:** AUR-20 implementation owner; AUR-19 maintains the coordination record until the bridge is removed.
- **Last reviewed:** 2026-09-06.

No approved architecture or design exceptions exist. This active entry is a
time-bounded migration bridge, not an exception to `AGENTS.md`.
