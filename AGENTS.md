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

## Documentation authority

- `AGENTS.md` is normative for code and agent behavior.
- `docs/PRODUCT.md` governs users, product purpose, product behavior, regional
  context, AI boundaries, safety, and product anti-patterns.
- `docs/DESIGN.md` governs visual language, tokens, components, responsive
  behavior, accessibility, charts, and motion.
- `docs/EXCEPTIONS.md` contains the only approved scoped overrides to these
  contracts. Adding or expanding an exception requires explicit approval.
- `docs/CURRENT_REFACTORS.md` records active migration toward compliance. It is
  not a backlog and never overrides a contract.
- This file describes the target architecture, not a claim that every existing
  file already complies with it. Existing code does not override the contract.
- When current code violates this contract, preserve the target rule, report the
  gap, and track remediation separately. Do not weaken the rule merely to match
  the checkout.
- Live Plane state is authoritative for work-item status and ownership.
- Plane work-management procedures and current MCP capabilities belong to the
  installed `plane-work-management` skill and live systems. Do not duplicate
  mutable operational metadata in repository documentation.
- `.opencode/docs/` contains legacy research and compatibility references for
  older local tooling. It is non-normative, may be stale, and must be verified
  against this file, the current code, and live systems before use.
- `docs/analysis/` contains dated audit evidence and remediation backlogs. It
  describes observed code, not the intended architecture, grants no exception,
  and may become stale.
- Source code, generated migrations, and live infrastructure must be inspected
  before making claims about current behavior.

Use the most specific applicable authority. An undocumented deviation is not an
exception. Use the most specific verified evidence available and distinguish
confirmed facts, inferences, and recommendations in audits and handoffs.

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
app/.../_components/              # UI owned by one route subtree
app/.../_hooks/                   # React behavior owned by one route subtree
app/.../_lib/                     # pure logic/data assembly owned by one route
app/api/[[...route]]/             # Hono route adapters
features/<domain>/api/            # typed client adapters, query keys, and hooks
features/<domain>/components/     # domain UI
features/<domain>/hooks/          # domain-specific UI state and behavior
features/<domain>/lib/            # pure domain rules and transformations
features/<domain>/server/         # domain operations, persistence, transactions
features/<domain>/types.ts|types/ # cohesive shared contracts when needed
components/ui/                    # generic visual primitives
components/<capability>/          # explicitly cross-domain application UI
hooks/                            # genuinely cross-domain React hooks
lib/                              # cross-domain helpers and infrastructure adapters
lib/ai/                           # typed AI provider adapters
db/                               # Drizzle schema and database connection
drizzle/                          # generated and reviewed SQL migrations
providers/                        # application-level React providers
scripts/                          # explicit diagnostics and maintenance operations
```

The current domain set includes `accounts`, `categories`, `transactions`,
`transaction-types`, `csv-import`, and `summary`. Inspect the repository before
assuming that list is complete or still current.

Choose the smallest correct owner in this order: route-only, one domain,
cross-domain application code, then generic infrastructure or UI. Promote code
outward only after real reuse or a stable shared responsibility exists.

Multi-file domain modules expose a small stable interface and keep implementation
details local. Use a local `index.ts` as that interface only when several files
form one cohesive module with external callers; do not create barrel files by
default. Add a module, hook, or seam only when it hides meaningful complexity or
supports a real alternative adapter. Pass-through wrappers and global dumping
grounds are prohibited.

## Layer invariants

### Pages, layouts, and components

- Pages resolve route input and compose views. They do not own persistence,
  business rules, or complex data transformations.
- Route-only rendering belongs in `_components/`; route-only React behavior in
  `_hooks/`; and route-only pure derivation or data assembly in `_lib/`.
- Keep a Client Component at the smallest boundary that needs browser state,
  effects, event handlers, or browser APIs.
- A component has one rendering or interaction responsibility.
- Reusable domain UI belongs to `features/<domain>/components/`. Root
  `components/<capability>/` is only for application UI genuinely reused across
  domains; generic primitives belong in `components/ui/`.
- Extract a hook when related state, effects, subscriptions, or lifecycle
  coordination are non-trivial. Simple local state stays in the component.
- Extract pure calculations and transformations from rendering code into the
  nearest owning `_lib/` or `features/<domain>/lib/` module. Split files when
  responsibilities diverge, not solely because a file is long.

### Hono route adapters

- `app/api/[[...route]]/route.ts` mounts the Hono application at `/api` and
  exports `AppType` for client inference.
- Route handlers authenticate, validate untrusted input, call an owning domain
  operation, and translate its result into an HTTP response.
- New or materially changed handlers do not import Drizzle, issue persistence
  queries, implement business rules, or coordinate transactions directly.
- Persistence, ownership enforcement, transactions, and server orchestration
  belong to `features/<domain>/server/`. Pure rules used by those operations
  belong to the domain's `lib/`.
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
- `features/<domain>/lib/` owns pure domain behavior. `server/` owns domain
  operations that use persistence, authenticated ownership, transactions, or
  server-only integrations. A domain without server behavior needs no empty
  `server/` directory.
- A server operation must hide meaningful behavior behind a small interface. Do
  not replace direct handler persistence with one-query pass-through wrappers;
  group the validation, ownership, transaction, and result contract that callers
  should not need to reimplement.
- Accept dependencies at internal seams when behavior genuinely varies or a
  deterministic test needs an adapter. Do not add hypothetical repository
  interfaces when only one implementation exists and no variation is required.
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
- Persistence types describe storage. Do not make a full database row the
  default interface for UI, HTTP responses, or unrelated domain callers.
- A type belongs to the smallest module that owns its meaning. Shared domain
  types are exported by that domain; operation input/result types stay beside
  the operation; and one-component props may stay local.
- A domain-level `types.ts` or `types/` directory must contain a cohesive shared
  contract. It is not a destination for unrelated declarations.
- UI props and hook results should expose the narrowest contract their consumer
  needs.
- `Pick` and `Omit` change static types; they do not project runtime database
  columns. Drizzle reads must still use explicit `select({ ... })` projections.
- Prefer explicit result types for domain operations, especially when expected
  error modes exist.
- Before data crosses from a Server Component to a Client Component, explicitly
  project sensitive, large, or non-serializable fields. Do not add a redundant
  projection when an Aureo-owned operation already returns the correct narrow
  contract.

## Imports, naming, and constants

- Use `kebab-case` filenames.
- React hooks use the `use-<name>.ts` or `use-<name>.tsx` filename convention and
  a `use<Name>` export. Components and types use descriptive domain language,
  not implementation placeholders such as `data`, `item`, or `helper` when a
  precise name exists.
- Use the `@/` alias outside the current module's immediate folder. Relative
  imports are limited to siblings within the same cohesive module. Do not cross
  a route, feature, or layer with `../`, and never add multi-level `../../..`
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

## Routes and URL contracts

- Next.js route groups organize code and do not appear in public URLs. Public
  path segments use lowercase `kebab-case`; dynamic parameters use descriptive
  names rather than positional or generic identifiers.
- `app/api/[[...route]]/route.ts` is the only Hono mount. Domain route modules
  expose relative Hono paths and are mounted once; do not create a second API
  base path or parallel untyped route tree.
- Browser code calls Aureo endpoints through the typed Hono client in
  `lib/hono.ts`. Do not duplicate internal endpoint strings in ad hoc `fetch`
  calls when the typed client can express the request.
- Internal navigation uses application paths such as `/accounts`, never a
  hardcoded deployment origin. Extract a route or external URL to its canonical
  owner when it is reused or drives behavior; incidental one-off links do not
  justify a global routes registry.
- Never construct authorization or ownership from a URL alone. Parse and
  validate route input at the adapter, then enforce ownership in the called
  domain operation.

## Client state and query contracts

- React Query owns server state. Zustand owns only ephemeral client workflow or
  UI state; it must not duplicate server records.
- Query keys are contracts. Each domain with multiple readers or mutations owns
  a query-key factory in its `api/` module. Include every input that changes the
  result and invalidate the exact key or prefix returned by that owner; do not
  redeclare raw key arrays across hooks.
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
- Never treat the `proxy.ts` matcher as an authorization guarantee. Every API
  entry keeps explicit `requireAuth`, and every called domain operation enforces
  row-level ownership independently of route reachability.
- Authorization is a domain invariant: verify that every referenced row belongs
  to the authenticated user before reading, mutating, or using it in a trigger.
- Secrets remain in the process environment or the approved credential store.
  Never commit keys or copy them into JSON, TOML, YAML, Markdown, source files,
  logs, tickets, or external automation artifacts.
- Do not inspect `.env` or credential values unless the user explicitly approves
  it and the task requires it.

## Styling and accessibility

- Read `docs/PRODUCT.md` and `docs/DESIGN.md` before user-facing work.
- Use Tailwind utilities and semantic tokens from `app/globals.css`.
- Do not add hardcoded hexadecimal, RGB, or HSL values in TS/TSX when a semantic
  token can own the meaning.
- Reuse `components/ui/` primitives without adding Aureo business behavior to
  them.
- Preserve keyboard access, visible focus, responsive behavior, meaningful
  labels, load-bearing contrast, and reduced-motion behavior.
- Similar-looking UI is not automatically one abstraction. Share it only when
  consumers need the same responsibility and interface.
- A temporary visual or accessibility deviation requires an approved scoped
  entry in `docs/EXCEPTIONS.md`. Current non-compliance is not an exception.

## Error handling and observability

- Never use an empty `catch` block or silently replace an unexpected failure
  with default data.
- Domain operations expose expected outcomes separately from infrastructure
  failures. Hono adapters translate them into shared HTTP responses.
- Logs contain actionable operation context and stable identifiers, but never
  credentials, tokens, raw financial imports, or unnecessary personal data.
- Partial failures in imports or external integrations must be explicit in the
  result contract. Do not report an operation as successful when only part of it
  completed.

## Plane work management

- Plane workspace `walle`, project `aureo`, prefix `AUR`, is the shared work
  ledger.
- Use the installed `plane-work-management` skill to read, audit, select,
  propose, create, refine, comment on, or update Plane work items.
- Read live Plane state before reporting status or ownership. Resolve states,
  labels, types, IDs, relations, and current MCP capabilities live; do not rely
  on copied UUIDs, ports, filters, or stale ticket data.
- Inspect existing work items before proposing or creating one. Avoid duplicates
  and make overlaps, ownership boundaries, parent/child roles, dependencies, and
  blockers explicit.
- A ready ticket states verified evidence, bounded scope and non-goals,
  observable acceptance criteria, dependencies, risks, and verification. Keep
  unresolved product decisions as proposals.
- Plane reads are allowed when relevant to the task. Every mutation requires
  explicit user authorization in the current task and a re-read of the exact
  target immediately beforehand.
- When asked what to work on next, propose the exact candidate using live
  priority, readiness, dependencies, and current ownership. Do not claim,
  assign, or move it automatically.
- Reference the Plane identifier in commits and handoffs when work belongs to a
  ticket.
- External routing or automation policy is outside this repository contract and
  must not be inferred from this section.

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
- When a formal test runner is introduced, deterministic module tests live
  beside the owning module as `*.test.ts` or `*.test.tsx` unless that runner
  defines a dedicated location. Files named `scripts/test-*` are diagnostic
  scripts, not a formal suite.
- Database changes: run `pnpm db:generate`, review the migration, and obtain
  explicit approval before applying it to any configured database.
- UI changes: verify the affected flow, keyboard operation, responsive behavior,
  `docs/PRODUCT.md`, `docs/DESIGN.md`, contrast, and reduced motion in proportion
  to the change.

Treat build and standalone TypeScript as separate signals. Report pre-existing
or unrelated failures separately, and never describe an unrun or failing check
as successful.

Automated checks do not prove authorization, ownership, query invalidation,
money semantics, migration completeness, or accessibility. Review those
invariants explicitly whenever the changed interface can affect them.
