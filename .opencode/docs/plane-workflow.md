# Plane Workflow

Plane is Aureo's shared work-item ledger.

## Project

- Workspace: `walle`
- Project: `aureo`
- Project ID: `88fe464f-3ecf-4314-8cc7-390021b70629`
- Ticket prefix: `AUR`

The configured MCP clients obtain `PLANE_API_HOST`, `PLANE_API_PORT`, and
`PLANE_API_KEY` from the active runtime environment. Credential values must
never be stored in repository files, tickets, logs, or documentation.

## Read-first workflow

1. Confirm the repository and Plane project.
2. List current states, work-item types, labels, and relevant work items.
3. Resolve names to current Plane IDs at runtime.
4. Check for an existing equivalent work item before creating another.
5. Treat every mutation as a separate operation requiring explicit user
   authorization in the current task.

This Plane edition does not support PQL or structured server filters. Call
`list_work_items` without `pql` or `filters`, then filter the returned items in
the client using the state IDs from `list_states`.

## Lifecycle

`Backlog -> Todo -> In Progress -> Review -> Manual Testing -> Ready to Merge -> Done`

- `Backlog`: captured but not ready.
- `Todo`: ready for selection.
- `In Progress`: one implementation is active.
- `Review`: automated checks completed and human diff review is required.
- `Manual Testing`: user-facing acceptance is being checked.
- `Ready to Merge`: review and manual testing passed.
- `Done`: integrated and shipped.

Only one implementation ticket may be active globally across Aureo and Axion.
Hermes never merges, pushes, deploys, or marks a ticket `Done` automatically.

## Classification

Classify each work item independently by:

- priority: `P0` to `P3`;
- complexity: `C0` to `C3`;
- risk: `R0` to `R3`;
- readiness: `A0` to `A2`;
- change mode: `read-only`, `code`, `data`, `migration`, `integration`, or
  `production`.

Priority orders the queue; it does not lower risk. Database, migration,
authentication, payments, security, production, destructive data, secrets,
permissions, external integrations, performance, and breaking changes require
stronger planning or human gates.

## Work-item operations

- Resolve work-item types with `resolve_work_item_type`.
- Resolve states with `list_states`.
- Resolve labels with `list_labels`.
- List before creating to avoid duplicates.
- Reference the Plane identifier, such as `AUR-2`, in hand-offs and commits.
- Do not transition, create, edit, assign, label, comment on, or delete a work
  item without explicit authorization.

## Handoff evidence

Every implementation handoff records:

- Plane identifier and observed state;
- commit or worktree reference;
- changed files and scope;
- verification commands and results;
- pre-existing or unrelated failures;
- discovered follow-up work;
- exact next human decision.
