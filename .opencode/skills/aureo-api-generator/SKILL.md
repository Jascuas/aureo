# Aureo API Generator

Compatibility helper for planning CRUD work. `AGENTS.md` is the sole normative
source; this skill must not generate code that bypasses its module, ownership,
typing, URL, error, or verification contracts.

## When to Use This Skill

✅ **USE when**:

- Creating new API resource with CRUD operations (GET list/single, POST, PATCH, DELETE)
- Adding bulk-delete to existing resource
- Generating endpoint requiring Clerk authentication (user-owned resources)
- Implementing Zod validation in endpoints
- Creating a coherent CRUD interface that needs matching Hono adapters, domain
  operations, typed client hooks, and query keys

❌ **DON'T USE when**:

- You only need one endpoint and the skill would add pass-through modules
- Public API without authentication → this skill assumes Clerk auth
- Complex business logic beyond CRUD → implement manually

## Required shape

- Hono files are relative route adapters: authenticate, validate, call the
  owning `features/<domain>/server/` operation, and translate its result.
- Domain operations own persistence, ownership checks, transactions, and
  expected outcomes behind a small interface.
- Browser hooks use the typed client from `lib/hono.ts` and feature-owned query
  key factories. Do not duplicate endpoint strings or raw key arrays.
- Responses use the shared error owner and expose only intentional fields.

## Checklist

- [ ] The module and its interface have one clear domain owner
- [ ] Route input is validated and every user-owned identifier is scoped
- [ ] Drizzle stays out of new or materially changed route adapters
- [ ] Reads and returned rows use explicit runtime projections
- [ ] Hooks use the typed Hono client and canonical query keys
- [ ] Expected and infrastructure failures remain distinguishable
- [ ] Verification matches `AGENTS.md`
