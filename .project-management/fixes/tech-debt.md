# Technical Debt

> **Purpose**: Code quality improvements and refactoring tasks  
> **Last Updated**: April 3, 2026 (Sprint 07 created, debt cleared by @aureo-dev)

---

## 🏗️ Active Tech Debt

> **All tech debt items have been moved to sprints or evaluated**:
>
> - **Pagination Implementation** → Sprint 04 ✅ COMPLETED
> - **Error Boundaries** → Sprint 05 ✅ COMPLETED
> - **Loading States on Mutations** → Sprint 05 ✅ COMPLETED
> - **Database Triggers for Balance** → Sprint 07 🚀 READY TO START
> - **Soft Delete Pattern** → Backlog (LOW priority, defer until requested)

**No untracked tech debt items at this time.**

---

## ✅ Completed Refactors

See `.project-management/done/sprint-03-completed.md` for:

- Component reorganization (purpose-based architecture)
- Import path standardization (`./` → `@/`)
- Chart organization by domain cohesion

---

## 📝 Future Refactoring Ideas

> ✅ **SECTION CLEARED** - All ideas evaluated in Sprint 06

**Status**: All refactoring ideas have been evaluated and documented.

**Result**: All ideas evaluated. **NONE require implementation** at this time.

**Reference**: See `.project-management/done/sprint-06-completed.md` for full analysis:

| Idea                          | Status        | Decision                           |
| ----------------------------- | ------------- | ---------------------------------- |
| Chart Factory Pattern         | ⏸️ Skip       | Over-abstraction, no clear benefit |
| Consolidate Summary Endpoints | ✅ Keep as-is | Current structure is correct       |
| OpenAPI Documentation         | ⏸️ Defer      | Low priority for small teams       |
| Split Large Forms             | ✅ Keep as-is | Forms are not too large            |
| Drizzle Query Patterns        | ✅ Keep as-is | Already following best practices   |

---
