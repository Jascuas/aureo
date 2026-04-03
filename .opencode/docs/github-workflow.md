# GitHub Workflow

> **Purpose**: Guide for using GitHub Issues + Projects for task management
> **Last Updated**: April 3, 2026

---

## 🎯 Overview

This project uses **GitHub Issues** for task tracking and **GitHub Projects** (v2) for sprint planning. All project management is centralized in GitHub instead of local markdown files.

**Project URL**: https://github.com/users/Jascuas/projects/1

---

## 📊 Project Board Structure

### Fields

- **Title**: Issue title
- **Status**: Todo / In Progress / Done
- **Priority**: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
- **Sprint**: Text field (e.g., "Sprint 07")
- **Labels**: Type, priority, component tags
- **Assignees**: Who's working on it

### Views

- **Board View**: Kanban-style (Todo → In Progress → Done)
- **Table View**: Spreadsheet-style for bulk editing
- **Priority View**: Sorted by priority field

---

## 🏷️ Label System

### Type Labels

- `type: feature` — New feature or enhancement
- `type: bug` — Bug fix
- `type: refactor` — Code refactoring
- `type: chore` — Maintenance tasks
- `type: spike` — Research or investigation

### Priority Labels

- `priority: critical` — P0, blocks other work
- `priority: high` — P1, important
- `priority: medium` — P2, normal priority
- `priority: low` — P3, nice-to-have

### Component Labels

- `component: frontend` — Frontend work (UI, React)
- `component: backend` — Backend work (API, Hono)
- `component: database` — Database changes (migrations, schema)
- `component: api` — API endpoints

---

## 📝 Creating Issues

### Using GitHub CLI

```bash
# Create feature issue
gh issue create \
  --title "Feature Name" \
  --label "type: feature,priority: high,component: backend" \
  --body "Description and requirements"

# Add to project
gh project item-add 1 --owner Jascuas --url <issue-url>
```

### Using GitHub Web UI

1. Navigate to repository → Issues → New Issue
2. Add title and description
3. Add appropriate labels (type, priority, component)
4. Assign to milestone/sprint if applicable
5. Click "Create issue"
6. Add to project board from sidebar

---

## 🔄 Workflow

### For @aureo-dev (Implementation Agent)

When completing a task:

1. ✅ Mark issue as "In Progress" when starting work
2. 🔨 Implement feature/fix with commits
3. ✅ Mark issue as "Done" when completed
4. 📝 Trigger `/handoff` to generate hand-off report
5. 🔗 Include issue number in hand-off (e.g., "Closes #4")

### For @aureo-pm (Project Manager Agent)

Responsibilities:

1. 📊 Update project board status
2. 🐛 Create new issues for discovered bugs
3. 📋 Organize backlog and prioritize issues
4. 🎯 Plan sprints by assigning Sprint field
5. ✅ Close completed issues
6. 📈 Generate progress reports

### For @aureo-architect (Architect Agent)

Responsibilities:

1. 🧠 Plan complex features (creates detailed specs)
2. 📝 Update architecture documentation
3. 🏗️ Design database schema changes
4. ⚠️ Identify technical risks and blockers

---

## 🚀 Sprint Planning

### Creating a Sprint

1. Filter issues by priority and effort
2. Select issues for sprint scope
3. Set Sprint field (e.g., "Sprint 08")
4. Move to "Todo" status
5. Assign to team members

### Sprint Views

Filter project board by Sprint field:

```bash
# List issues in current sprint
gh project item-list 1 --owner Jascuas --format json | \
  jq '.items[] | select(.sprint == "Sprint 07")'
```

---

## 🔍 Finding Issues

### Using GitHub CLI

```bash
# List all open issues
gh issue list --repo Jascuas/aureo

# Filter by label
gh issue list --label "priority: critical"

# Filter by status
gh issue list --state open

# View specific issue
gh issue view 4
```

### Using GitHub Search

```
# In GitHub search bar
is:issue is:open label:"type: bug"
is:issue is:closed label:"priority: critical"
```

---

## 📦 Issue Templates

### Feature Request

```markdown
## Description

Brief description of the feature.

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Files

- `path/to/file.ts` (new/modified)

## Effort

X weeks/days
```

### Bug Report

```markdown
## Problem

Description of the bug.

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3

## Fix Plan

- [ ] Task 1
- [ ] Task 2
```

---

## 🛠️ GitHub CLI Commands Reference

### Issues

```bash
# Create issue
gh issue create --title "Title" --body "Body" --label "type: feature"

# List issues
gh issue list

# View issue
gh issue view 4

# Close issue
gh issue close 4

# Reopen issue
gh issue reopen 4
```

### Projects

```bash
# Add item to project
gh project item-add 1 --owner Jascuas --url <issue-url>

# List project items
gh project item-list 1 --owner Jascuas

# View project
gh project view 1 --owner Jascuas
```

### Labels

```bash
# Create label
gh label create "name" --color "hex" --description "desc"

# List labels
gh label list

# Add label to issue
gh issue edit 4 --add-label "priority: critical"
```

---

## 📈 Reporting

### Generate Sprint Report

```bash
# Get all issues in Sprint 07
gh project item-list 1 --owner Jascuas --format json | \
  jq '.items[] | select(.sprint == "Sprint 07")'
```

### Track Progress

```bash
# Count issues by status
gh project item-list 1 --owner Jascuas --format json | \
  jq -r '.items | group_by(.status) | .[] | "\(.[0].status): \(length)"'
```

---

## ⚠️ Migration Notes

### From Local Files to GitHub Issues

**Completed**: April 3, 2026

- ✅ Created GitHub Project board
- ✅ Migrated all features from `.project-management/backlog/features.md`
- ✅ Migrated Sprint 07 critical bug
- ✅ Created 8 issues (3 critical/high, 1 bug, 4 medium features)
- ✅ Configured labels and custom fields

**Next Steps**:

- Update @aureo-pm agent to use GitHub CLI
- Delete `.project-management/` folder
- Update all agent workflows to reference GitHub Issues

---

## 📚 Resources

- **GitHub Projects Docs**: https://docs.github.com/en/issues/planning-and-tracking-with-projects
- **GitHub CLI Docs**: https://cli.github.com/manual/
- **GraphQL API**: https://docs.github.com/en/graphql

---

## 🔗 Related Documentation

- [Architecture](./architecture.md) — Technical architecture
- [Rules](./rules.md) — Development rules and patterns
- [Database Schema](./database-schema.md) — Database structure
