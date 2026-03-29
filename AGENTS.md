# Aureo - Finance Platform

Aplicación SaaS de finanzas personales. Next.js 16 + Hono.js + PostgreSQL.

---

## 🚨 REGLAS CRÍTICAS (NUNCA VIOLAR)

### 💰 Amounts - Milliunits

```typescript
// SIEMPRE almacenar en milliunits (× 1000)
convertAmountToMilliunits(100); // 100 → 100000 (DB)
convertAmountFromMilliunits(100000); // 100000 → 100 (UI)

// Positivo = Income | Negativo = Expense
```

**Ubicación**: `lib/utils.ts`

### 💳 Balances - Database Triggers

❌ **NUNCA** calcular o mutar balances en código  
✅ Los triggers de DB actualizan automáticamente

### 🧪 Testing

❌ **CERO testing** - No escribir, sugerir, ni configurar

### 💬 Comentarios

❌ **CERO comentarios** - Código autoexplicativo

### 📝 Git Commits

✅ **Conventional Commits obligatorios**:

- `feat:` nueva funcionalidad
- `fix:` corrección de bugs
- `refactor:` cambios sin alterar funcionalidad
- `chore:` tareas de mantenimiento

---

## 📦 Stack Tecnológico

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

## 🎨 Convenciones de Código

### Naming

- Archivos: `kebab-case`
- Hooks: `use-kebab-case.ts`
- Components: `component-name.tsx`
- API routes: `lowercase.ts`

### Imports (auto-sorted)

```typescript
// 1. External (alfabético)
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// 2. Internal @ alias (alfabético)
import { Button } from "@/components/ui/button";
import { insertAccountSchema } from "@/db/schema";

// 3. Relative
import { AccountForm } from "./account-form";
```

### Tipos

- **Preferir**: `type` sobre `interface` (97% del proyecto)
- **Co-localizar**: Definir en mismo archivo
- **Compartidos**: Solo globales en `lib/types.ts`

---

## 📚 Documentación Detallada

Para información específica, consulta:

- **Arquitectura**: `.opencode/docs/architecture.md`
- **Database Schema**: `.opencode/docs/database-schema.md`
- **API Patterns**: `.opencode/docs/api-patterns.md`
- **State Management**: `.opencode/docs/state-management.md`
- **Features Pendientes**: `.opencode/docs/pending-features.md`

---

## 🛠️ Scripts Útiles

```bash
npm run dev          # Dev server (puerto 4000)
npm run build        # Build producción
npm run db:generate  # Generar migraciones Drizzle
npm run db:migrate   # Ejecutar migraciones
npm run db:studio    # Drizzle Studio (puerto 5000)
```

---

## 🔧 Variables de Entorno

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:4000
```
