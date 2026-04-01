$ cat > /tmp/hono-rpc-type-inference-research.md << 'EOF'

# Hono RPC Type Inference Research

**Date:** April 1, 2026  
**Researcher:** AI Assistant  
**Context:** Finance Platform with 25+ endpoints using Hono RPC

---

## Executive Summary

This research addresses the critical question: **Can helper functions that return responses early maintain type inference for Hono RPC clients?**
**Key Finding:** ⚠️ **Helper functions that return `Response` objects break RPC type inference.** Hono's RPC system requires `ctx.json()` to be called directly in the route handler for proper type tracking.

---

## 1. How Hono's Type System Tracks `ctx.json()` Return Types

### Core Mechanism

Hono's RPC type inference works through **conditional type inference at the route handler level**:

```typescript
// When you write this in a handler:
app.get("/api/users", (c) => {
  return c.json({ users: ["alice", "bob"] }, 200);
});
// Hono infers:
type ResponseType = {
  200: { json: { users: string[] } };
};
```

### Type Flow Chain

1. **Handler Return Type Capture**: The route handler's return type is analyzed
2. **Status Code Tracking**: Explicit status codes (200, 404, 401, etc.) are tracked
3. **Response Shape Inference**: The JSON payload structure is captured
4. **RPC Client Generation**: `InferResponseType` extracts these types for the client

### Critical Requirements

```typescript
// ✅ WORKS - Direct return in handler
app.get("/posts/:id", async (c) => {
  const post = await getPost(c.req.param("id"));
  if (!post) {
    return c.json({ error: "not found" }, 404);
  }
  return c.json({ post }, 200);
});
// ❌ BREAKS TYPE INFERENCE - Helper returns Response
function checkAuth(c: Context): Response | null {
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  return null;
}
app.get("/posts", (c) => {
  const authError = checkAuth(c);
  if (authError) return authError; // Type info lost!
  return c.json({ posts });
});
```

---

## 2. Helper Functions and Type Preservation

### Current Pattern in Codebase

Your auth middleware uses a **discriminated union return type**:

```typescript
// lib/auth-middleware.ts
type AuthResult =
  | { success: true; userId: string }
  | { success: false; response: Response };
export function requireAuth(ctx: Context): AuthResult {
  const auth = getAuth(ctx);
  if (!auth?.userId) {
    return {
      success: false,
      response: ctx.json({ error: "Unauthorized." }, 401),
    };
  }
  return { success: true, userId: auth.userId };
}
```

### Why This Breaks Type Inference

```typescript
// In route handler:
const auth = requireAuth(ctx);
if (!auth.success) return auth.response; // ⚠️ Type is just Response
// Client side loses specific type info:
const res = await client.api.accounts.$get();
const data = await res.json(); // ❌ Type is unknown, not { error: string }
```

The `Response` object is opaque - TypeScript cannot extract the JSON structure or status code from it.

### What Hono Documentation Says

From the official RPC guide:

> "If you explicitly specify the status code, such as `200` or `404`, in `c.json()`, it will be added as a type for passing to the client."

## **Key insight**: The type must be **inline** in the handler, not wrapped in a helper's return value.

## 3. TypeScript Patterns for Hono RPC

### Pattern 1: Inline Auth Checks (Recommended)

```typescript
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401); // ✅ Type preserved
  }

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, auth.userId));

  return c.json({ data }, 200); // ✅ Type preserved
});
```

**Client-side result:**

```typescript
type Response =
  | { error: string } // 401
  | { data: Account[] }; // 200
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed correctly
}
```

### Pattern 2: Middleware with Context Extension

```typescript
import { createMiddleware } from "hono/factory";
type Env = {
  Variables: {
    userId: string;
  };
};
const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401); // ✅ Early return in middleware
  }
  c.set("userId", auth.userId);
  await next();
});
// Usage
app.get("/api/accounts", authMiddleware, async (c) => {
  const userId = c.var.userId; // ✅ Type-safe
  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return c.json({ data }, 200);
});
```

**Limitation**: Middleware early returns don't appear in the RPC type unless using `ApplyGlobalResponse`.

### Pattern 3: Global Error Response Types

```typescript
import type { ApplyGlobalResponse } from "hono/client";
const app = new Hono()
  .get("/api/users", (c) => c.json({ users: ["alice", "bob"] }, 200))
  .use("*", clerkMiddleware());
type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    401: { json: { error: string } };
    500: { json: { error: string } };
  }
>;
const client = hc<AppWithErrors>("http://localhost");
// Now all endpoints know about 401/500 responses
const res = await client.api.users.$get();
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed
}
```

### Pattern 4: Type Predicates (Limited Use)

```typescript
// ⚠️ Doesn't help with RPC type inference
function isAuthorized(auth: Auth | null): auth is { userId: string } {
  return !!auth?.userId;
}
// Still need inline return
if (!isAuthorized(auth)) {
  return c.json({ error: "Unauthorized" }, 401);
}
```

### Pattern 5: Branded Types (Not Applicable)

## Branded types don't solve this problem because the issue is structural (Response object opacity), not nominal typing.

## 4. Recommended Patterns for Auth Middleware

### Option A: Inline Checks (Current Best Practice)

```typescript
// Keep requireAuth as a simple checker
export function getAuthUserId(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// Use inline in handlers
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const userId = getAuthUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return c.json({ data }, 200);
});
```

### Option B: Hono Factory Pattern (More Scalable)

```typescript
// lib/factory.ts
import { createFactory } from "hono/factory";
type Env = {
  Variables: {
    userId: string;
  };
};
export const factory = createFactory<Env>({
  initApp: (app) => {
    app.use("*", clerkMiddleware());
  },
});
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", auth.userId);
  await next();
});
// In route files
const app = factory.createApp();
app.get("/accounts", authMiddleware, async (c) => {
  const userId = c.var.userId; // ✅ Type-safe
  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return c.json({ data }, 200);
});
```

### Option C: Global Response Augmentation (Best for DRY)

```typescript
// lib/hono-types.ts
import type { ApplyGlobalResponse } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";
export type AppWithGlobalErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: { error: string } };
    404: { json: { error: string } };
    500: { json: { error: string } };
  }
>;
// lib/hono.ts
export const client = hc<AppWithGlobalErrors>(process.env.NEXT_PUBLIC_APP_URL!);
// Now all hooks automatically know about error types
export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      if (response.status === 401) {
        const { error } = await response.json(); // ✅ Typed as { error: string }
        throw new Error(error);
      }

      if (!response.ok) throw new Error("Failed to fetch accounts");

      const { data } = await response.json();
      return data;
    },
  });
  return query;
};
```

---

## 5. Analysis of Current Codebase

### Current Pattern Usage

You're using **inline checks with discriminated unions**:

```typescript
// 25+ endpoints follow this pattern:
const auth = requireAuth(ctx);
if (!auth.success) return auth.response;
```

### Issues with Current Pattern

1. **Lost Type Information**: Client cannot infer `{ error: string }` from 401 responses
2. **Repetitive Code**: Every endpoint repeats the same check
3. **Inconsistent Error Messages**: String literals are scattered
4. **No Centralized Error Handling**: Each handler manages auth failures

### Impact Analysis

- **25+ endpoints** affected
- **Type safety**: Lost on error responses
- **Client-side handling**: Must rely on `response.ok` checks without specific error types
- **Maintenance**: Changes to error format require 25+ file updates

---

## 6. Recommended Migration Strategy

### Step 1: Define Global Error Types

```typescript
// lib/api-errors.ts
export const API_ERRORS = {
  UNAUTHORIZED: { error: "Unauthorized" },
  NOT_FOUND: { error: "Not found" },
  MISSING_ID: { error: "Missing id" },
} as const;
export type ApiErrorResponse = (typeof API_ERRORS)[keyof typeof API_ERRORS];
```

### Step 2: Apply Global Response Type

```typescript
// lib/hono.ts
import { hc } from "hono/client";
import type { ApplyGlobalResponse } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";
import type { ApiErrorResponse } from "./api-errors";
type AppWithErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: ApiErrorResponse };
    404: { json: ApiErrorResponse };
  }
>;
export const client = hc<AppWithErrors>(process.env.NEXT_PUBLIC_APP_URL!);
```

### Step 3: Refactor Auth Middleware

```typescript
// lib/auth-middleware.ts (Updated)
import { getAuth } from "@hono/clerk-auth";
import type { Context } from "hono";
export function getAuthUserId(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// Or keep requireAuth but simplify
export function requireAuth(ctx: Context): string | null {
  return getAuthUserId(ctx);
}
```

### Step 4: Update Route Handlers

```typescript
// Before
const auth = requireAuth(ctx);
if (!auth.success) return auth.response;
// After
const userId = requireAuth(ctx);
if (!userId) {
  return ctx.json({ error: "Unauthorized" }, 401);
}
```

### Step 5: Update Client-Side Hooks

```typescript
// features/accounts/api/use-get-accounts.ts
export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      // ✅ Now properly typed
      if (response.status === 401) {
        const { error } = await response.json(); // Type: { error: string }
        throw new Error(error);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const { data } = await response.json();
      return data;
    },
  });
  return query;
};
```

---

## 7. Performance & Trade-offs

### Type Compilation Performance

- **Current issue**: Large apps with many routes cause slow IDE performance
- **Mitigation**: Use project references and compile types ahead of time
- **Your codebase**: 25+ endpoints is moderate - unlikely to cause issues yet

### Developer Experience Trade-offs

| Pattern                 | Type Safety | DRY     | Simplicity |
| ----------------------- | ----------- | ------- | ---------- |
| Inline checks (current) | ⚠️ Partial  | ❌ Low  | ✅ High    |
| Factory pattern         | ✅ Full     | ✅ High | ⚠️ Medium  |
| Global errors           | ✅ Full     | ✅ High | ✅ High    |

## **Recommendation**: Use **Global Error Pattern** (Option C) for best balance.

## 8. Key Takeaways

### ✅ What Works

1. **Direct `ctx.json()` returns** in handlers
2. **Middleware with `c.set()` and `c.var`** for passing values
3. **`ApplyGlobalResponse`** for common error types
4. **Inline status codes** (200, 404, 401, etc.)

### ❌ What Doesn't Work

1. **Helper functions returning `Response`** objects
2. **Wrapped responses** in discriminated unions
3. **`c.notFound()`** without module augmentation
4. **Generic `Response` types** without status/JSON info

### 🎯 Best Practice for Your Codebase

```typescript
// 1. Define global errors
type AppWithErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: { error: string } };
    404: { json: { error: string } };
  }
>;
// 2. Simplify auth helper
export function requireAuth(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// 3. Inline error returns
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const userId = requireAuth(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return c.json({ data }, 200);
});
// 4. Client gets full types
const res = await client.api.accounts.$get();
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed!
}
```

---

## 9. References

### Official Documentation

- [Hono RPC Guide](https://hono.dev/docs/guides/rpc)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [Hono Context API](https://hono.dev/docs/api/context)
- [Hono Factory Helper](https://hono.dev/docs/helpers/factory)

### Key Concepts

- **Type Inference Chain**: Handler → Status Code → JSON Shape → RPC Client
- **Response Opacity**: `Response` objects don't expose type information
- **Global Response Types**: `ApplyGlobalResponse` for shared error schemas
- **Context Extension**: `c.set()` and `c.var` for type-safe middleware data passing

### Codebase Files

- `/lib/auth-middleware.ts` - Current auth helper
- `/lib/hono.ts` - RPC client setup
- `/lib/api-types.ts` - Response type inference examples
- `/app/api/[[...route]]/accounts.ts` - Route handler pattern
- `/features/accounts/api/use-get-accounts.ts` - Client-side hook

---

## 10. Action Items

1. **Immediate**: Review the Global Error Pattern (Option C)
2. **Short-term**: Test `ApplyGlobalResponse` with 1-2 endpoints
3. **Medium-term**: Refactor `requireAuth` to return `string | null`
4. **Long-term**: Migrate all 25+ endpoints to new pattern
5. **Documentation**: Update `/opencode/docs/api-patterns.md` with new pattern

---

**Conclusion**: Helper functions that return `Response` objects fundamentally break Hono's RPC type inference. The recommended solution is to use `ApplyGlobalResponse` for common error types and keep `ctx.json()` calls inline in handlers.
EOF
cat /tmp/hono-rpc-type-inference-research.md

# Hono RPC Type Inference Research

**Date:** April 1, 2026  
**Researcher:** AI Assistant  
**Context:** Finance Platform with 25+ endpoints using Hono RPC

---

## Executive Summary

This research addresses the critical question: **Can helper functions that return responses early maintain type inference for Hono RPC clients?**
**Key Finding:** ⚠️ **Helper functions that return `Response` objects break RPC type inference.** Hono's RPC system requires `ctx.json()` to be called directly in the route handler for proper type tracking.

---

## 1. How Hono's Type System Tracks `ctx.json()` Return Types

### Core Mechanism

Hono's RPC type inference works through **conditional type inference at the route handler level**:

```typescript
// When you write this in a handler:
app.get("/api/users", (c) => {
  return c.json({ users: ["alice", "bob"] }, 200);
});
// Hono infers:
type ResponseType = {
  200: { json: { users: string[] } };
};
```

### Type Flow Chain

1. **Handler Return Type Capture**: The route handler's return type is analyzed
2. **Status Code Tracking**: Explicit status codes (200, 404, 401, etc.) are tracked
3. **Response Shape Inference**: The JSON payload structure is captured
4. **RPC Client Generation**: `InferResponseType` extracts these types for the client

### Critical Requirements

```typescript
// ✅ WORKS - Direct return in handler
app.get("/posts/:id", async (c) => {
  const post = await getPost(c.req.param("id"));
  if (!post) {
    return c.json({ error: "not found" }, 404);
  }
  return c.json({ post }, 200);
});
// ❌ BREAKS TYPE INFERENCE - Helper returns Response
function checkAuth(c: Context): Response | null {
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  return null;
}
app.get("/posts", (c) => {
  const authError = checkAuth(c);
  if (authError) return authError; // Type info lost!
  return c.json({ posts });
});
```

---

## 2. Helper Functions and Type Preservation

### Current Pattern in Codebase

Your auth middleware uses a **discriminated union return type**:

```typescript
// lib/auth-middleware.ts
type AuthResult =
  | { success: true; userId: string }
  | { success: false; response: Response };
export function requireAuth(ctx: Context): AuthResult {
  const auth = getAuth(ctx);
  if (!auth?.userId) {
    return {
      success: false,
      response: ctx.json({ error: "Unauthorized." }, 401),
    };
  }
  return { success: true, userId: auth.userId };
}
```

### Why This Breaks Type Inference

```typescript
// In route handler:
const auth = requireAuth(ctx);
if (!auth.success) return auth.response; // ⚠️ Type is just Response
// Client side loses specific type info:
const res = await client.api.accounts.$get();
const data = await res.json(); // ❌ Type is unknown, not { error: string }
```

The `Response` object is opaque - TypeScript cannot extract the JSON structure or status code from it.

### What Hono Documentation Says

From the official RPC guide:

> "If you explicitly specify the status code, such as `200` or `404`, in `c.json()`, it will be added as a type for passing to the client."

## **Key insight**: The type must be **inline** in the handler, not wrapped in a helper's return value.

## 3. TypeScript Patterns for Hono RPC

### Pattern 1: Inline Auth Checks (Recommended)

```typescript
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401); // ✅ Type preserved
  }

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, auth.userId));

  return c.json({ data }, 200); // ✅ Type preserved
});
```

**Client-side result:**

```typescript
type Response =
  | { error: string } // 401
  | { data: Account[] }; // 200
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed correctly
}
```

### Pattern 2: Middleware with Context Extension

```typescript
import { createMiddleware } from "hono/factory";
type Env = {
  Variables: {
    userId: string;
  };
};
const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401); // ✅ Early return in middleware
  }
  c.set("userId", auth.userId);
  await next();
});
// Usage
app.get("/api/accounts", authMiddleware, async (c) => {
  const userId = c.var.userId; // ✅ Type-safe
  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return c.json({ data }, 200);
});
```

**Limitation**: Middleware early returns don't appear in the RPC type unless using `ApplyGlobalResponse`.

### Pattern 3: Global Error Response Types

```typescript
import type { ApplyGlobalResponse } from "hono/client";
const app = new Hono()
  .get("/api/users", (c) => c.json({ users: ["alice", "bob"] }, 200))
  .use("*", clerkMiddleware());
type AppWithErrors = ApplyGlobalResponse<
  typeof app,
  {
    401: { json: { error: string } };
    500: { json: { error: string } };
  }
>;
const client = hc<AppWithErrors>("http://localhost");
// Now all endpoints know about 401/500 responses
const res = await client.api.users.$get();
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed
}
```

### Pattern 4: Type Predicates (Limited Use)

```typescript
// ⚠️ Doesn't help with RPC type inference
function isAuthorized(auth: Auth | null): auth is { userId: string } {
  return !!auth?.userId;
}
// Still need inline return
if (!isAuthorized(auth)) {
  return c.json({ error: "Unauthorized" }, 401);
}
```

### Pattern 5: Branded Types (Not Applicable)

## Branded types don't solve this problem because the issue is structural (Response object opacity), not nominal typing.

## 4. Recommended Patterns for Auth Middleware

### Option A: Inline Checks (Current Best Practice)

```typescript
// Keep requireAuth as a simple checker
export function getAuthUserId(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// Use inline in handlers
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const userId = getAuthUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return c.json({ data }, 200);
});
```

### Option B: Hono Factory Pattern (More Scalable)

```typescript
// lib/factory.ts
import { createFactory } from "hono/factory";
type Env = {
  Variables: {
    userId: string;
  };
};
export const factory = createFactory<Env>({
  initApp: (app) => {
    app.use("*", clerkMiddleware());
  },
});
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", auth.userId);
  await next();
});
// In route files
const app = factory.createApp();
app.get("/accounts", authMiddleware, async (c) => {
  const userId = c.var.userId; // ✅ Type-safe
  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return c.json({ data }, 200);
});
```

### Option C: Global Response Augmentation (Best for DRY)

```typescript
// lib/hono-types.ts
import type { ApplyGlobalResponse } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";
export type AppWithGlobalErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: { error: string } };
    404: { json: { error: string } };
    500: { json: { error: string } };
  }
>;
// lib/hono.ts
export const client = hc<AppWithGlobalErrors>(process.env.NEXT_PUBLIC_APP_URL!);
// Now all hooks automatically know about error types
export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      if (response.status === 401) {
        const { error } = await response.json(); // ✅ Typed as { error: string }
        throw new Error(error);
      }

      if (!response.ok) throw new Error("Failed to fetch accounts");

      const { data } = await response.json();
      return data;
    },
  });
  return query;
};
```

---

## 5. Analysis of Current Codebase

### Current Pattern Usage

You're using **inline checks with discriminated unions**:

```typescript
// 25+ endpoints follow this pattern:
const auth = requireAuth(ctx);
if (!auth.success) return auth.response;
```

### Issues with Current Pattern

1. **Lost Type Information**: Client cannot infer `{ error: string }` from 401 responses
2. **Repetitive Code**: Every endpoint repeats the same check
3. **Inconsistent Error Messages**: String literals are scattered
4. **No Centralized Error Handling**: Each handler manages auth failures

### Impact Analysis

- **25+ endpoints** affected
- **Type safety**: Lost on error responses
- **Client-side handling**: Must rely on `response.ok` checks without specific error types
- **Maintenance**: Changes to error format require 25+ file updates

---

## 6. Recommended Migration Strategy

### Step 1: Define Global Error Types

```typescript
// lib/api-errors.ts
export const API_ERRORS = {
  UNAUTHORIZED: { error: "Unauthorized" },
  NOT_FOUND: { error: "Not found" },
  MISSING_ID: { error: "Missing id" },
} as const;
export type ApiErrorResponse = (typeof API_ERRORS)[keyof typeof API_ERRORS];
```

### Step 2: Apply Global Response Type

```typescript
// lib/hono.ts
import { hc } from "hono/client";
import type { ApplyGlobalResponse } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";
import type { ApiErrorResponse } from "./api-errors";
type AppWithErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: ApiErrorResponse };
    404: { json: ApiErrorResponse };
  }
>;
export const client = hc<AppWithErrors>(process.env.NEXT_PUBLIC_APP_URL!);
```

### Step 3: Refactor Auth Middleware

```typescript
// lib/auth-middleware.ts (Updated)
import { getAuth } from "@hono/clerk-auth";
import type { Context } from "hono";
export function getAuthUserId(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// Or keep requireAuth but simplify
export function requireAuth(ctx: Context): string | null {
  return getAuthUserId(ctx);
}
```

### Step 4: Update Route Handlers

```typescript
// Before
const auth = requireAuth(ctx);
if (!auth.success) return auth.response;
// After
const userId = requireAuth(ctx);
if (!userId) {
  return ctx.json({ error: "Unauthorized" }, 401);
}
```

### Step 5: Update Client-Side Hooks

```typescript
// features/accounts/api/use-get-accounts.ts
export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      // ✅ Now properly typed
      if (response.status === 401) {
        const { error } = await response.json(); // Type: { error: string }
        throw new Error(error);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const { data } = await response.json();
      return data;
    },
  });
  return query;
};
```

---

## 7. Performance & Trade-offs

### Type Compilation Performance

- **Current issue**: Large apps with many routes cause slow IDE performance
- **Mitigation**: Use project references and compile types ahead of time
- **Your codebase**: 25+ endpoints is moderate - unlikely to cause issues yet

### Developer Experience Trade-offs

| Pattern                 | Type Safety | DRY     | Simplicity |
| ----------------------- | ----------- | ------- | ---------- |
| Inline checks (current) | ⚠️ Partial  | ❌ Low  | ✅ High    |
| Factory pattern         | ✅ Full     | ✅ High | ⚠️ Medium  |
| Global errors           | ✅ Full     | ✅ High | ✅ High    |

## **Recommendation**: Use **Global Error Pattern** (Option C) for best balance.

## 8. Key Takeaways

### ✅ What Works

1. **Direct `ctx.json()` returns** in handlers
2. **Middleware with `c.set()` and `c.var`** for passing values
3. **`ApplyGlobalResponse`** for common error types
4. **Inline status codes** (200, 404, 401, etc.)

### ❌ What Doesn't Work

1. **Helper functions returning `Response`** objects
2. **Wrapped responses** in discriminated unions
3. **`c.notFound()`** without module augmentation
4. **Generic `Response` types** without status/JSON info

### 🎯 Best Practice for Your Codebase

```typescript
// 1. Define global errors
type AppWithErrors = ApplyGlobalResponse<
  AppType,
  {
    401: { json: { error: string } };
    404: { json: { error: string } };
  }
>;
// 2. Simplify auth helper
export function requireAuth(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
// 3. Inline error returns
app.get("/api/accounts", clerkMiddleware(), async (c) => {
  const userId = requireAuth(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const data = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return c.json({ data }, 200);
});
// 4. Client gets full types
const res = await client.api.accounts.$get();
if (res.status === 401) {
  const { error } = await res.json(); // ✅ Typed!
}
```

---

## 9. References

### Official Documentation

- [Hono RPC Guide](https://hono.dev/docs/guides/rpc)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [Hono Context API](https://hono.dev/docs/api/context)
- [Hono Factory Helper](https://hono.dev/docs/helpers/factory)

### Key Concepts

- **Type Inference Chain**: Handler → Status Code → JSON Shape → RPC Client
- **Response Opacity**: `Response` objects don't expose type information
- **Global Response Types**: `ApplyGlobalResponse` for shared error schemas
- **Context Extension**: `c.set()` and `c.var` for type-safe middleware data passing

### Codebase Files

- `/lib/auth-middleware.ts` - Current auth helper
- `/lib/hono.ts` - RPC client setup
- `/lib/api-types.ts` - Response type inference examples
- `/app/api/[[...route]]/accounts.ts` - Route handler pattern
- `/features/accounts/api/use-get-accounts.ts` - Client-side hook

---

## 10. Action Items

1. **Immediate**: Review the Global Error Pattern (Option C)
2. **Short-term**: Test `ApplyGlobalResponse` with 1-2 endpoints
3. **Medium-term**: Refactor `requireAuth` to return `string | null`
4. **Long-term**: Migrate all 25+ endpoints to new pattern
5. **Documentation**: Update `/opencode/docs/api-patterns.md` with new pattern

---

**Conclusion**: Helper functions that return `Response` objects fundamentally break Hono's RPC type inference. The recommended solution is to use `ApplyGlobalResponse` for common error types and keep `ctx.json()` calls inline in handlers.
