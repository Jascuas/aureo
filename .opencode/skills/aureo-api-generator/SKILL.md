# Aureo API Generator

Generates CRUD API endpoints with Hono.js following Aureo patterns.

## When to Use This Skill

✅ **USE when**:

- Creating new API resource with CRUD operations (GET list/single, POST, PATCH, DELETE)
- Adding bulk-delete to existing resource
- Generating endpoint requiring Clerk authentication (user-owned resources)
- Implementing Zod validation in endpoints
- Creating API following pattern: Hono + clerkMiddleware + zValidator + Drizzle

❌ **DON'T USE when**:

- You only need one endpoint (not full CRUD) → write directly without skill
- Public API without authentication → this skill assumes Clerk auth
- Complex business logic beyond CRUD → implement manually

## Output

### 1. API Endpoint

```typescript
// app/api/[[...route]]/[resource].ts
import { Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { [resource], insert[Resource]Schema } from "@/db/schema";

const app = new Hono()
  .get("/", /* list pattern */)
  .get("/:id", /* single pattern */)
  .post("/", /* create pattern */)
  .patch("/:id", /* update pattern */)
  .delete("/:id", /* delete pattern */)
  .post("/bulk-delete", /* bulk pattern */);

export default app;
```

See complete patterns in `.opencode/docs/api-patterns.md`

### 2. React Query Hooks

```typescript
// features/[resource]/api/
export const useGet[Resource]s = () => useQuery({ queryKey: ["[resource]s"], ... });
export const useGet[Resource] = (id) => useQuery({ enabled: !!id, queryKey: ["[resource]", { id }], ... });
export const useCreate[Resource] = () => useMutation({ onSuccess: invalidate["[resource]s"], ... });
export const useEdit[Resource] = (id) => useMutation({ onSuccess: invalidate all related, ... });
export const useDelete[Resource] = (id) => useMutation({ ... });
export const useBulkDelete[Resource]s = () => useMutation({ ... });
```

See complete patterns in `.opencode/docs/state-management.md`

## Customizations

### Non-User-Owned (auth via JOIN)

```typescript
.innerJoin(accounts, eq([resource].accountId, accounts.id))
.where(eq(accounts.userId, auth.userId))
```

### Custom Validation

```typescript
zValidator(
  "query",
  z.object({
    type: z.enum(["Income", "Expense"]).default("Expense"),
    from: z.string().optional(),
  }),
);
```

### With Joins

```typescript
.select({
  id: [resource].id,
  parentName: parent[Resource].name,
})
.leftJoin(parent[Resource], eq([resource].parentId, parent[Resource].id))
```

## Checklist

- [ ] Endpoint in `app/api/[[...route]]/[resource].ts`
- [ ] Import in `route.ts`: `.route("/[resource]s", [resource])`
- [ ] Hooks in `features/[resource]/api/`
- [ ] 100% Zod validation
- [ ] Auth 4 layers (see api-patterns.md)
- [ ] Specific select
- [ ] Error handling (400, 401, 404)
- [ ] Toast notifications
- [ ] Correct invalidation
