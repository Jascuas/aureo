# AGENTS.md

## What this is

Aureo is a personal-finance application built with Next.js 16 App Router and
React 19. It uses Hono for typed HTTP routes, Clerk for authentication, Neon
Postgres with Drizzle ORM, React Query for server state, Zustand for local UI
state, and Tailwind CSS v4 for styling.

This file is the repository's single instruction source for coding agents. It
defines the target architecture, placement rules, domain invariants, delivery
gates, and verification expectations. New work must follow it while older code
is migrated incrementally.

Do not add `CLAUDE.md` or another repository-level agent instruction file.

## Authority and evidence

- `AGENTS.md` is normative for code and agent behavior.
- Live Plane state is authoritative for work-item status and ownership.
- `.opencode/docs/` contains supporting technical and operational references.
  It does not override this file.
- `docs/analysis/` contains dated audit evidence and remediation backlogs. It
  describes observed code, not the intended architecture, and may become stale.
- Source code, generated migrations, and live infrastructure must be inspected
  before making claims about current behavior.

Use the most specific verified evidence available. Distinguish confirmed facts,
inferences, and recommendations in audits and handoffs.

## Commands

Use pnpm for this repository.

```bash
pnpm dev                                      # Development server on port 4000
pnpm build                                    # Production build
pnpm start                                    # Serve the production build
pnpm lint                                     # ESLint; must finish without warnings
pnpm exec tsc --noEmit --incremental false    # Standalone TypeScript check
pnpm db:generate                              # Generate a Drizzle migration
pnpm db:migrate                               # Apply pending migrations; mutating
pnpm db:studio                                # Drizzle Studio on port 5000
pnpm db:up                                    # Upgrade Drizzle metadata; mutating
```

Database commands operate on configured infrastructure. Inspect their target
and obtain explicit approval before running a mutating command. Never read or
print `.env` files merely to discover configuration.

## Target architecture

Aureo is organized by route ownership at the UI edge and domain ownership below
it.

```text
app/                              # routes, layouts, and HTTP adapters
app/.../page.tsx                  # route composition
app/api/[[...route]]/             # Hono route adapters
features/<domain>/api/            # React Query client hooks
features/<domain>/components/     # domain UI
features/<domain>/hooks/          # domain-specific UI state and behavior
features/<domain>/lib/            # pure domain rules and transformations
features/<domain>/server/         # persistence and server orchestration when needed
features/<domain>/types/          # shared types owned by that domain
components/ui/                    # generic visual primitives
components/<domain>/              # UI shared by multiple views in one domain
hooks/                            # genuinely cross-domain React hooks
lib/                              # cross-domain helpers and infrastructure adapters
lib/ai/                           # typed AI provider adapters
db/                               # Drizzle schema and database connection
drizzle/                          # generated and reviewed SQL migrations
providers/                        # application-level React providers
scripts/                          # explicit diagnostics and maintenance operations
```

Existing domains include `accounts`, `categories`, `transactions`,
`transaction-types`, `csv-import`, and `summary`.

Multi-file domain modules expose a small stable interface and keep implementation
details local. Add a module, hook, or seam only when it hides meaningful
complexity or supports a real alternative adapter. Pass-through wrappers and
global dumping grounds are prohibited.

## Layer invariants

### Pages, layouts, and components

- Pages resolve route input and compose views. They do not own persistence,
  business rules, or complex data transformations.
- Keep a Client Component at the smallest boundary that needs browser state,
  effects, event handlers, or browser APIs.
- A component has one rendering or interaction responsibility.
- Route-only UI stays with its route. Reusable domain UI belongs to the owning
  feature or `components/<domain>/`; generic primitives belong in
  `components/ui/`.
- Extract a hook when related state, effects, subscriptions, or lifecycle
  coordination are non-trivial. Simple local state stays in the component.

### Hono route adapters

- `app/api/[[...route]]/route.ts` mounts the Hono application at `/api` and
  exports `AppType` for client inference.
- Route handlers authenticate, validate untrusted input, call an owning domain
  operation, and translate its result into an HTTP response.
- New or materially changed handlers must not accumulate business rules or
  duplicate persistence logic. Move that responsibility to the owning domain's
  `lib/` or `server/` module.
- Use `zValidator` with explicit Zod schemas at the HTTP boundary.
- Use `requireAuth` and read the trusted `userId` from Hono context.
- Every user-owned read and write is scoped to that user. Foreign identifiers
  such as `accountId`, `categoryId`, and template IDs must be ownership-checked
  before use; authentication alone is insufficient.
- Return shared responses from `lib/api-errors.ts`. Do not invent near-duplicate
  error constants or assume names that are not present.

### Domain and infrastructure modules

- A domain rule, calculation, query contract, or transformation has one
  canonical implementation.
- `features/<domain>/lib/` owns pure domain behavior. Server-only persistence and
  orchestration belong in `features/<domain>/server/` when extraction creates a
  meaningful interface.
- `lib/` is reserved for genuinely cross-domain helpers and infrastructure
  adapters. Keep feature-specific logic with its feature until there are at
  least two real consumers of the same responsibility.
- Translate third-party payloads into Aureo-owned validated types at the adapter
  boundary before they enter domain logic.
- Never silently replace an unexpected infrastructure failure with default
  data. Expected outcomes and infrastructure errors must remain distinguishable.

## TypeScript and type ownership

- Do not introduce explicit `any`, `as any`, or `any[]`.
- Use `unknown`, narrowing, validation, or a typed adapter for uncertain external
  data.
- Persistent row and insert types derive from `db/schema.ts`; do not redeclare
  schema-owned literal unions or object shapes.
- A type belongs to the smallest module that owns its meaning. Shared domain
  types are exported by that domain; one-component props may stay local.
- UI props and hook results should expose the narrowest contract their consumer
  needs.
- `Pick` and `Omit` change static types; they do not project runtime database
  columns. Drizzle reads must still use explicit `select({ ... })` projections.
- Prefer explicit result types for domain operations, especially when expected
  error modes exist.

## Imports, naming, and constants

- Use `kebab-case` filenames.
- Use the `@/` alias outside the current module's immediate folder. Relative
  imports are limited to nearby siblings; do not add multi-level `../../../`
  chains.
- Let `eslint-plugin-simple-import-sort` own import ordering.
- Import statuses, query keys, event names, storage keys, and discriminators from
  their canonical owner instead of redeclaring them.
- Extract behavior-driving values such as limits, thresholds, protocol values,
  and stable keys. Keep domain constants in their domain.
- A feature with several tunable values may centralize them in `lib/config.ts`
  with an `as const` object. Do not create a constants file for incidental copy.
- Comments should explain a non-obvious constraint or decision, not narrate the
  code. Remove stale comments when behavior changes.

## Client state and query contracts

- React Query owns server state. Zustand owns only ephemeral client workflow or
  UI state; it must not duplicate server records.
- Query keys are contracts. Define stable keys, include every input that changes
  the result, and invalidate the exact prefixes used by readers.
- React Query hook input types must match the Hono endpoint contract. Do not
  widen a request merely to satisfy a UI union.
- Treat immutable reference data explicitly. For example, transaction types use
  `staleTime: Infinity`; invalidation is required only if a future mutation path
  is intentionally introduced.
- Do not add optimistic updates casually. A mutation must define rollback and
  reconciliation behavior before using them.

## Database and money invariants

- Monetary amounts and account balances are stored as integer milliunits
  (`value * 1000`). Convert only at UI or external-system boundaries with
  `convertAmountToMilliunits` and `convertAmountFromMilliunits` from
  `lib/utils.ts`.
- `accounts.balance` is maintained by the PostgreSQL
  `update_account_balance()` trigger. Application code must not calculate or
  mutate balances independently.
- The current trigger, forms, and import path have a documented unresolved sign
  convention conflict in `docs/analysis/bugs.md`. Do not encode a new
  positive/negative convention, repair production balances, or change the
  trigger without an approved data plan that covers forms, imports, migrations,
  existing rows, rollback, and verification.
- Drizzle schemas in `db/schema.ts` are the persistent type authority. Generate
  migrations with `pnpm db:generate` and review SQL before applying it.
- A migration file existing in `drizzle/` does not prove it was journaled or
  applied to a live database. Verify each layer separately.
- Use explicit selected columns in Drizzle queries; do not use broad `select *`
  semantics for user data.

## Authentication and secrets

- Clerk middleware lives in `proxy.ts`, not `middleware.ts`.
- The current route matcher is not a universal authorization backstop. API
  routes must keep explicit `requireAuth` and row-level ownership checks.
- Authorization is a domain invariant: verify that every referenced row belongs
  to the authenticated user before reading, mutating, or using it in a trigger.
- Secrets remain in the process environment or the approved credential store.
  Never commit keys or copy them into JSON, TOML, YAML, Markdown, source files,
  logs, Plane tickets, or Hermes artifacts.
- Do not inspect `.env` or credential values unless the user explicitly approves
  it and the task requires it.

## Styling and accessibility

- Use Tailwind utilities and semantic tokens from `app/globals.css`.
- Do not add hardcoded hexadecimal, RGB, or HSL values in TS/TSX when a semantic
  token can own the meaning.
- Reuse `components/ui/` primitives without adding Aureo business behavior to
  them.
- Preserve keyboard access, visible focus, responsive behavior, meaningful
  labels, load-bearing contrast, and reduced-motion behavior.
- Similar-looking UI is not automatically one abstraction. Share it only when
  consumers need the same responsibility and interface.

## Plane and Hermes workflow

- Plane workspace `walle`, project `aureo`, prefix `AUR`, is the shared work
  ledger. See `.opencode/docs/plane-workflow.md` for current IDs and MCP details.
- Read live Plane state before reporting whether a work item is untouched,
  active, blocked, or complete.
- This Plane deployment does not support PQL or structured server filters. List
  work items first and filter them client-side using live state IDs.
- Only one implementation ticket may be active globally across Aureo and Axion.
- Every Plane mutation requires explicit user authorization in the current task.
- Reference the Plane identifier in commits and handoffs when work belongs to a
  ticket.
- Hermes may prepare a plan, branch, worktree, implementation, and verification
  evidence. It never merges, pushes, deploys, or marks a ticket `Done`
  automatically.
- Human review is required before integration. `Done` means integrated and
  shipped, not merely coded or locally verified.
- Preserve existing user changes and Hermes worktrees. Do not delete or rewrite
  them during cleanup without explicit approval.

## Git and scope discipline

- Inspect the complete worktree before editing. Existing changes belong to the
  user unless proven otherwise.
- Keep changes scoped to the approved task. A touched module may be improved to
  satisfy this contract; unrelated repository-wide refactoring needs separate
  authorization.
- Use Conventional Commits. Keep coherent concerns in separate commits.
- Never discard changes with destructive Git commands. Do not rewrite a shared
  branch without confirming it is unpublished and obtaining the required
  approval.
- A local commit is not publication. Verify the remote branch after pushing.

## Verification contract

Match verification to risk and report exactly what ran:

- Documentation only: `git diff --check` and verify every referenced path,
  command, and invariant against the repository.
- Code: `pnpm lint` and `pnpm exec tsc --noEmit --incremental false`.
- Cross-cutting, routing, configuration, dependency, or release-sensitive work:
  also run `pnpm build`.
- Pure logic: run the narrowest existing deterministic script or check that
  exercises the changed interface. The repository currently has no formal test
  command; do not claim a test suite ran when it did not.
- Database changes: run `pnpm db:generate`, review the migration, and obtain
  explicit approval before applying it to any configured database.
- UI changes: verify the affected flow, keyboard operation, responsive behavior,
  contrast, and reduced motion in proportion to the change.

Treat build and standalone TypeScript as separate signals. Report pre-existing
or unrelated failures separately, and never describe an unrun or failing check
as successful.
