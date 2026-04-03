# Technical Debt

> **Purpose**: Code quality improvements and refactoring tasks  
> **Last Updated**: April 3, 2026 (Reviewed and updated by @aureo-dev)

---

## 🏗️ Active Tech Debt

> **All active tech debt items have been moved to sprints**:
>
> - **Pagination Implementation** → Sprint 04 (HIGH priority)
> - **Error Boundaries** → Sprint 05 (MEDIUM priority)
> - **Loading States on Mutations** → Sprint 05 (LOW priority)
> - **Soft Delete Pattern** → Sprint 06 / Backlog (LOW priority)

**No active tech debt items at this time.**

---

## ✅ Completed Refactors

See `.project-management/done/sprint-03-completed.md` for:

- Component reorganization (purpose-based architecture)
- Import path standardization (`./` → `@/`)
- Chart organization by domain cohesion

---

## 📝 Future Refactoring Ideas

> **All future ideas have been evaluated and documented in Sprint 06**

See `.project-management/sprints/sprint-06-future-ideas.md` for detailed analysis of:

| Idea                          | Status        | Decision                           |
| ----------------------------- | ------------- | ---------------------------------- |
| Chart Factory Pattern         | ⏸️ Skip       | Over-abstraction, no clear benefit |
| Consolidate Summary Endpoints | ✅ Keep as-is | Current structure is correct       |
| OpenAPI Documentation         | ⏸️ Defer      | Low priority for small teams       |
| Split Large Forms             | ✅ Keep as-is | Forms are not too large            |
| Drizzle Query Patterns        | ✅ Keep as-is | Already following best practices   |

**Result**: All ideas evaluated. **NONE require implementation** at this time.

---
