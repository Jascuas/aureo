# Agent Delegation Guide

> **Purpose**: Define how @aureo-dev, @aureo-pm, and @aureo-architect work together using GitHub Issues
> **Last Updated**: April 3, 2026

---

## 🎯 Agent Roles

### @aureo-dev (Implementation Agent)

**Primary Role**: Execute tasks and implement code

**Capabilities**:

- ✅ Read `.opencode/docs/rules.md` (critical)
- ✅ Read `.opencode/docs/architecture.md` (on-demand)
- ✅ Implement features/fixes (<3 files directly, >3 files after plan)
- ✅ Create GitHub commits
- ✅ Generate hand-off reports
- ❌ NEVER touches project management files
- ❌ NEVER updates documentation (except code comments)
- ❌ NEVER creates sprints or assigns tasks

**Skills**:

- `/implement-small` — Bug fix, styling (1-3 files)
- `/implement-feature` — New feature (>3 files, architectural)
- `/implement-api` — Create API endpoint
- `/implement-migration` — Database schema change
- `/handoff` — Generate hand-off report

---

### @aureo-pm (Project Manager Agent)

**Primary Role**: Manage GitHub Issues and Projects

**Capabilities**:

- ✅ Create/update/close GitHub Issues
- ✅ Update project board status (Todo/In Progress/Done)
- ✅ Organize backlog and prioritize tasks
- ✅ Plan sprints (assign Sprint field)
- ✅ Create bug issues from hand-offs
- ✅ Update documentation in `.opencode/docs/`
- ✅ Generate progress reports
- ❌ NEVER writes code
- ❌ NEVER creates migrations
- ❌ NEVER touches source files (except docs)

**Workflow**:

1. Receive hand-off from @aureo-dev
2. Update issue status to "Done"
3. Create new issues for bugs/tasks
4. Update architecture/rules docs if needed
5. Respond with summary

---

### @aureo-architect (Architect Agent)

**Primary Role**: Plan complex features and design architecture

**Capabilities**:

- ✅ Analyze feature requirements
- ✅ Design database schema
- ✅ Create implementation plans
- ✅ Identify technical risks
- ✅ Propose solutions with trade-offs
- ✅ Update `.opencode/docs/architecture.md`
- ❌ NEVER implements code
- ❌ NEVER creates issues (returns plan to @aureo-dev)
- ❌ Read-only exploration only

**Workflow**:

1. Receive feature request from @aureo-dev
2. Analyze requirements and edge cases
3. Design solution with detailed plan
4. Return plan to @aureo-dev for approval
5. @aureo-dev implements after user approval

---

## 🔄 Delegation Workflow

### Scenario 1: Small Fix (<3 Files)

**User Request**: "Fix the button alignment on the dashboard"

**Flow**:

```
User → @aureo-dev
  ↓
@aureo-dev executes directly (no delegation)
  ↓
@aureo-dev creates commit
  ↓
@aureo-dev generates /handoff
  ↓
User invokes @aureo-pm
  ↓
@aureo-pm updates issue #X to "Done"
```

**No GitHub Issue needed** (trivial fix)

---

### Scenario 2: New Feature (>3 Files)

**User Request**: "Implement CSV import with AI categorization" (GitHub Issue #1)

**Flow**:

```
User → @aureo-dev (references #1)
  ↓
@aureo-dev invokes @aureo-architect
  ↓
@aureo-architect analyzes requirements
  ↓
@aureo-architect returns detailed plan
  ↓
@aureo-dev asks user approval
  ↓
User approves
  ↓
@aureo-dev implements code
  ↓
@aureo-dev creates commits
  ↓
@aureo-dev generates /handoff (references "Closes #1")
  ↓
User invokes @aureo-pm
  ↓
@aureo-pm closes issue #1
  ↓
@aureo-pm creates new issues for discovered bugs
```

---

### Scenario 3: Critical Bug (Issue #4)

**User Request**: "Fix the database trigger balance bug" (GitHub Issue #4)

**Flow**:

```
User → @aureo-dev (references #4)
  ↓
@aureo-dev reads issue #4 for context
  ↓
@aureo-dev implements fix directly (knows the bug)
  ↓
@aureo-dev creates migration + tests
  ↓
@aureo-dev creates commits
  ↓
@aureo-dev generates /handoff (references "Closes #4")
  ↓
User invokes @aureo-pm
  ↓
@aureo-pm closes issue #4
  ↓
@aureo-pm updates architecture.md with trigger docs
```

---

### Scenario 4: Sprint Planning

**User Request**: "Plan Sprint 08"

**Flow**:

```
User → @aureo-pm
  ↓
@aureo-pm lists open issues with priority
  ↓
@aureo-pm proposes sprint scope (based on effort)
  ↓
User approves
  ↓
@aureo-pm assigns Sprint field ("Sprint 08")
  ↓
@aureo-pm moves issues to "Todo" status
  ↓
@aureo-pm generates sprint summary
```

---

### Scenario 5: Architectural Change

**User Request**: "Design a multi-tenant architecture"

**Flow**:

```
User → @aureo-architect
  ↓
@aureo-architect analyzes requirements
  ↓
@aureo-architect proposes 2-3 solutions with trade-offs
  ↓
User selects solution
  ↓
@aureo-architect creates detailed implementation plan
  ↓
@aureo-architect updates architecture.md
  ↓
User invokes @aureo-pm to create issues
  ↓
@aureo-pm breaks plan into GitHub Issues
  ↓
User invokes @aureo-dev to implement
```

---

## 📊 Decision Matrix

| Scenario                  | Agent            | Delegates To          | Creates Issue?    |
| ------------------------- | ---------------- | --------------------- | ----------------- |
| Small fix (<3 files)      | @aureo-dev       | None                  | No                |
| Feature (>3 files)        | @aureo-dev       | @aureo-architect      | User creates      |
| Critical bug              | @aureo-dev       | None                  | User creates      |
| Sprint planning           | @aureo-pm        | None                  | N/A               |
| Architectural design      | @aureo-architect | Returns to @aureo-dev | @aureo-pm creates |
| Documentation update      | @aureo-pm        | None                  | No                |
| Database migration        | @aureo-dev       | None (uses skill)     | User creates      |
| Bug discovered during dev | @aureo-dev       | @aureo-pm (handoff)   | @aureo-pm creates |

---

## 🚦 Communication Format

### @aureo-dev Hand-off Report

```markdown
**[HAND-OFF PARA AUREO PM]**

- **Issue**: Closes #4 (Database Trigger Bug)
- **Commit**: abc1234
- **Files**: drizzle/migrations/0012_fix_balance_trigger.sql, scripts/test-trigger.mjs
- **Result**: Trigger fixed, all balances recalculated
- **New Bugs**: None
- **Architecture Changes**: Added "Balance Management" section to architecture.md
```

### @aureo-pm Response

```markdown
✅ **Issue #4 closed**: Database Trigger Bug fixed

**Actions taken**:

- Closed #4 (verified fix in commits)
- Updated architecture.md with trigger documentation
- No new issues created

**Project status**:

- Sprint 07: ✅ Complete
- Next priority: Issue #1 (CSV Import)
```

### @aureo-architect Plan

```markdown
## Feature Plan: CSV Import with AI (#1)

**Approach**: Multi-step upload with AI categorization

**Database Schema**:

- Add `import_history` table (track CSV imports)
- Add `transaction_draft` table (staging before commit)

**API Endpoints**:

- POST /api/imports/upload (parse CSV)
- POST /api/imports/categorize (AI processing)
- POST /api/imports/commit (save to transactions)

**Flow**:

1. User uploads CSV → parse → validate
2. Send to Claude API → get category suggestions
3. Show preview UI → user reviews
4. User confirms → atomic commit to DB

**Technical Risks**:

- CSV format variations (mitigate: flexible parser)
- Claude API rate limits (mitigate: batch processing)
- Large file memory (mitigate: streaming parser)

**Effort**: 3-4 weeks (split into 3 sub-issues)

**Recommendation**: Create sub-issues for:

- Issue #1.1: CSV Upload & Parsing
- Issue #1.2: AI Categorization
- Issue #1.3: Preview & Commit UI
```

---

## 🔗 GitHub CLI Usage

### For @aureo-dev

```bash
# Read issue details
gh issue view 4

# List issues assigned to sprint
gh project item-list 1 --owner Jascuas --format json | \
  jq '.items[] | select(.sprint == "Sprint 07")'

# Check issue status
gh issue list --label "priority: critical" --state open
```

### For @aureo-pm

```bash
# Create bug issue
gh issue create \
  --title "Bug: Balance calculation off" \
  --label "type: bug,priority: high,component: backend" \
  --body "Discovered during #1 implementation..."

# Close completed issue
gh issue close 4 --comment "Fixed in commit abc1234"

# Update project status (via GraphQL)
gh api graphql -f query='mutation { ... }'
```

---

## ⚠️ Critical Rules

### For @aureo-dev

1. ✅ ALWAYS delegate to @aureo-architect for >3 file changes
2. ✅ ALWAYS generate /handoff when task completes
3. ✅ ALWAYS reference issue number in hand-off ("Closes #4")
4. ❌ NEVER close issues directly (only @aureo-pm)
5. ❌ NEVER update project board (only @aureo-pm)
6. ❌ NEVER touch `.project-management/` (deprecated)

### For @aureo-pm

1. ✅ ALWAYS update issue status after hand-off
2. ✅ ALWAYS create issues for bugs found in hand-offs
3. ✅ ALWAYS update documentation when architecture changes
4. ❌ NEVER write code or migrations
5. ❌ NEVER commit code changes
6. ❌ NEVER execute implementation tasks

### For @aureo-architect

1. ✅ ALWAYS return detailed plans to @aureo-dev
2. ✅ ALWAYS analyze trade-offs and risks
3. ✅ ALWAYS propose 2-3 solutions when possible
4. ❌ NEVER implement code
5. ❌ NEVER create issues (returns plan only)
6. ❌ Read-only exploration only

---

## 📈 Success Metrics

**Good Delegation**:

- ✅ @aureo-dev finishes tasks without user hand-holding
- ✅ @aureo-pm keeps project board in sync with code
- ✅ @aureo-architect prevents technical debt with upfront planning
- ✅ Zero context switching for user (agents handle coordination)

**Bad Delegation**:

- ❌ @aureo-dev implements complex features without architect plan
- ❌ @aureo-pm writes code or migrations
- ❌ @aureo-architect implements instead of planning
- ❌ User has to manually update issues/boards

---

## 🔗 Related Documentation

- [GitHub Workflow](./github-workflow.md) — Using GitHub Issues + Projects
- [Architecture](./architecture.md) — Technical architecture
- [Rules](./rules.md) — Development rules and patterns
