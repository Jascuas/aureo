# Project Management System

> **Aureo Finance Platform**  
> **Agile Folder-Based Organization**  
> **Created**: March 30, 2026

---

## 📁 Folder Structure

```
.project-management/
├── sprints/              # Active sprint files
│   ├── sprint-03.md     # Next sprint (pending)
│   └── sprint-04.md     # Future sprint
├── backlog/              # Future work
│   └── features.md       # Feature backlog
├── fixes/                # Quality improvements
│   ├── bugs.md          # Active bugs tracker
│   └── tech-debt.md     # Technical debt backlog
└── done/                 # Completed sprints (archive)
    ├── sprint-01-completed.md
    └── sprint-02-completed.md
```

---

## 🎯 How to Use This System

### 1. Source of Truth

**The active sprint file in `sprints/` is our ONLY source of truth for current work.**

- Check `sprints/sprint-XX.md` for today's tasks
- Use checkboxes `- [ ]` to track progress
- Move completed sprints to `done/` when finished

### 2. Sprint Workflow

```
1. Start Sprint: Create sprints/sprint-XX.md
2. Work: Check off tasks as you complete them
3. Review: Ensure Definition of Done is met
4. Complete: Move sprint to done/sprint-XX-completed.md
5. Next: Create next sprint file
```

### 3. Backlog Management

- **New Feature Idea?** → Add to `backlog/features.md`
- **Found a Bug?** → Add to `fixes/bugs.md`
- **Fixed a Bug?** → Remove from `fixes/bugs.md` and document in sprint completion
- **Code Smells?** → Add to `fixes/tech-debt.md`

### 4. Sprint Planning

When planning a new sprint:

1. Review `backlog/features.md` for priorities
2. Check `fixes/bugs.md` for critical issues
3. Consider `fixes/tech-debt.md` for quality improvements
4. Create `sprints/sprint-XX.md` with selected tasks

---

## 📋 Task Format

Use Markdown checkboxes for all tasks:

```markdown
- [ ] Task description
- [x] Completed task
```

---

## 🎯 Current Status

**Active Sprints**: None (Sprint 03 ready to start)  
**Completed Sprints**: 2 (Sprint 01 & 02)  
**Active Bugs**: 0  
**Backlog Features**: 11  
**Tech Debt Items**: 4

---

## ✅ Definition of Done (Sprint Level)

A sprint is complete when:

- [ ] All tasks checked off
- [ ] All commits follow conventional commits
- [ ] No TypeScript errors
- [ ] Manual testing passed
- [ ] Sprint file moved to `done/`

---

## 📝 Conventions

### Commit Messages

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `chore:` - Maintenance
- `docs:` - Documentation

### Priority Levels

- 🔴 **Critical** - Blocks production
- 🟡 **High** - Important but not blocking
- 🟢 **Medium** - Should be done soon
- 🔵 **Low** - Nice to have

### Status Indicators

- 🚧 In Progress
- ⏸️ Paused
- ✅ Complete
- ⚠️ Blocked

---

## 📊 Archive Policy

### Completed Sprints

When a sprint is completed, move it to `done/sprint-XX-completed.md` with:

- Final status (✅ Completed)
- Completion date
- Summary of achievements
- Bugs fixed (if any)
- Commits and files changed

### Fixed Bugs

When a bug is fixed:

1. Remove it from `fixes/bugs.md`
2. Document it in the sprint completion file where it was fixed

---

## 🚀 Getting Started

Ready to code? Start here:

1. Open `sprints/sprint-03.md` (next sprint)
2. Pick the highest priority unchecked task
3. Work on it
4. Check it off when done
5. Commit with conventional commit message
6. Move to next task

**Let's ship! 🚢**
