# Aureo - Finance Platform

Personal finance SaaS application. Next.js 16 + Hono.js + PostgreSQL.

---

## 🚨 CRITICAL RULES (NEVER VIOLATE)

### 💰 Amounts - Milliunits

```typescript
// ALWAYS store in milliunits (× 1000)
convertAmountToMilliunits(100); // 100 → 100000 (DB)
convertAmountFromMilliunits(100000); // 100000 → 100 (UI)

// Positive = Income | Negative = Expense
```

**Location**: `lib/utils.ts`

### 💳 Balances - Database Triggers

❌ **NEVER** calculate or mutate balances in code  
✅ Database triggers update automatically

### 🧪 Testing

❌ **ZERO testing** - Do not write, suggest, or configure tests

### 💬 Comments

❌ **ZERO comments** - Code must be self-explanatory

### 📝 Git Commits

✅ **Conventional Commits mandatory**:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code changes without altering functionality
- `chore:` maintenance tasks

---

## 📦 Tech Stack

### Frontend

- Next.js 16.0.7 (App Router, React 19)
- Tailwind CSS 4.1.4 + shadcn/ui
- Zustand 5.0.3 (UI state)
- React Query 5.74.4 (server state, stale: 60s)
- React Hook Form 7.55 + Zod 3.24.3

### Backend

- Hono.js 4.7.7 (Edge runtime)
- PostgreSQL (Neon DB)
- Drizzle ORM 0.42.0
- Clerk 6.15.1 (Auth)

---

## 🎨 Code Conventions

### Naming

- Files: `kebab-case`
- Hooks: `use-kebab-case.ts`
- Components: `component-name.tsx`
- API routes: `lowercase.ts`

### Imports (auto-sorted)

```typescript
// 1. External (alphabetical)
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// 2. Internal @ alias (alphabetical)
import { Button } from "@/components/ui/button";
import { insertAccountSchema } from "@/db/schema";

// 3. Relative
import { AccountForm } from "./account-form";
```

### Types

- **Prefer**: `type` over `interface` (97% of project)
- **Co-locate**: Define in same file
- **Shared**: Only globals in `lib/types.ts`

---

## 📚 Detailed Documentation

For specific information, consult:

- **Architecture**: `.opencode/docs/architecture.md`
- **Database Schema**: `.opencode/docs/database-schema.md`
- **API Patterns**: `.opencode/docs/api-patterns.md`
- **State Management**: `.opencode/docs/state-management.md`
- **GitHub Workflow**: `.opencode/docs/github-workflow.md` (task management)
- **Agent Delegation**: `.opencode/docs/agent-delegation.md` (how agents work together)

---

## 🛠️ Useful Scripts

```bash
npm run dev          # Dev server (port 4000)
npm run build        # Production build
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Drizzle Studio (port 5000)
```

---

## 🔧 Environment Variables

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:4000
```
