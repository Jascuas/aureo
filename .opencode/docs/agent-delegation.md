# Legacy OpenCode Role Guide

This file describes compatibility roles for older local OpenCode tooling. It
does not define coding or delivery policy. `AGENTS.md` is the sole normative
agent contract, and the installed `plane-ticket-routing` skill is the
executable Plane/Hermes runbook.

## Shared rules

- Plane project `aureo` is the work-item ledger.
- Use `AUR-*` identifiers in plans, worktrees, commits, and handoffs.
- Read current Plane state before proposing a transition.
- Only one implementation ticket may be active globally across Aureo and
  Axion.
- Plane mutations require explicit authorization in the current task.
- Merge, push, deployment, destructive data changes, and `Done` remain human
  gates.
- Resolve lifecycle, labels, IDs, and MCP behavior live through the installed
  `plane-ticket-routing` skill.

## Roles

### `@aureo-dev`

- Implements approved code changes.
- Handles clear, isolated work directly.
- Requests an architecture plan for cross-cutting, ambiguous, or high-risk
  work.
- Verifies the affected behavior and records pre-existing failures separately.
- Produces a handoff with the Plane identifier and evidence.
- Does not mutate Plane, merge, push, deploy, or mark work complete.

### `@aureo-architect`

- Investigates and plans non-trivial work.
- Identifies affected modules, interfaces, data, risks, alternatives, and
  verification requirements.
- Remains read-only and returns a plan for human approval.
- Does not implement code or mutate Plane.

### `@aureo-pm`

- Reads and maintains the Plane ledger after explicit authorization.
- Checks for duplicate work before creating a new item.
- Processes handoffs and proposes lifecycle transitions.
- Updates project documentation when implemented behavior changes.
- Does not write application code, merge, push, deploy, or mark unshipped work
  `Done`.

## Workflows

### Clear isolated implementation

```text
Todo AUR-N
  -> authorized claim
  -> In Progress
  -> @aureo-dev implementation
  -> Agent Review
  -> Automated QA when browser evidence is required
  -> Human Approval
  -> Ready to Merge after explicit approval
  -> explicit integration
  -> Done
```

### Complex or high-risk implementation

```text
Todo AUR-N
  -> @aureo-architect investigation and plan
  -> human approval
  -> In Progress
  -> @aureo-dev implementation
  -> Agent Review
  -> Automated QA when user-facing
  -> Human Approval
  -> Ready to Merge after explicit approval
  -> explicit integration
  -> Done
```

### Rejected or interrupted work

Return the same ticket to `In Progress` and resume its registered worktree.
Preserve prior run artifacts as earlier attempts. Do not create a replacement
ticket or send the work through `Todo` again.

### Discovered follow-up work

The implementation handoff describes the finding. `@aureo-pm` searches Plane
for an equivalent item, then proposes creating or updating one. No work item is
created without authorization.

## Implementation handoff

```markdown
**Aureo handoff**

- Plane: AUR-N — current state
- Worktree/commit: reference
- Scope: requested outcome
- Files: changed paths
- Verification: command and result
- Unrelated failures: none or explicit list
- Follow-up work: none or explicit list
- Human review required: yes/no and reason
```

## Success criteria

- Plane and the repository tell the same story.
- No duplicate ledger exists.
- Every transition has current-state evidence.
- Verification failures are not hidden or attributed to the wrong change.
- Humans retain control of integration and irreversible actions.
