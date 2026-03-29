# Features Pendientes - Aureo Finance Platform

Lista de funcionalidades incompletas o no implementadas.

---

## 🚧 Transaction Type Selector

**Estado**: Schema existe, UI NO implementada

### Contexto

- Tabla `transactionTypes` tiene: `"Income"`, `"Expense"`, `"Refund"`
- `transactions.transactionTypeId` es FK required
- Form actualmente hardcodea `transactionTypeId: ""`

### Ubicación

- `features/transactions/components/transaction-form.tsx` (línea ~66)

### TODO

1. Crear endpoint GET `/api/transaction-types`
2. Crear hook `use-get-transaction-types.ts`
3. Añadir `<GenericSelect>` al form para selector de tipo
4. Actualizar validación del form para incluir `transactionTypeId`

### Impacto

- **DB**: No requiere migración
- **API**: Nuevo endpoint read-only
- **UI**: Añadir selector al form

---

## 🚧 Category Parent Selector

**Estado**: Schema soporta jerarquía, UI NO implementada

### Contexto

- `categories.parentId` es self-referencing FK (nullable)
- Permite jerarquía parent-child (ej: "Food" → "Groceries", "Restaurants")
- Form solo acepta `name`

### Ubicación

- `features/categories/components/category-form.tsx`

### TODO

1. Crear hook `use-get-categories.ts` que retorne tree structure
2. Añadir `<Select>` opcional para parent category
3. Actualizar API GET `/api/categories` para incluir `parentName`
4. Considerar UI para mostrar jerarquía (breadcrumbs o nested display)

### Impacto

- **DB**: No requiere migración
- **API**: Ya retorna `parentName`, solo falta tree structure
- **UI**: Form + display de jerarquía

---

## 🚧 Transferencias entre Cuentas

**Estado**: NO implementado

### Contexto

- Usuarios pueden tener múltiples cuentas
- No existe funcionalidad para transferir dinero entre cuentas
- Requiere transaction type "Transfer"

### Diseño Propuesto

#### 1. Database

Crear tabla `transaction_pairs` para linkear transfers:

```sql
CREATE TABLE transaction_pairs (
  id TEXT PRIMARY KEY,
  debit_transaction_id TEXT REFERENCES transactions(id),
  credit_transaction_id TEXT REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Transaction Type

Añadir `"Transfer"` a `transactionTypes`

#### 3. API

Endpoint `POST /api/transactions/transfer`:

```typescript
{
  fromAccountId: string,
  toAccountId: string,
  amount: number,  // positivo
  date: Date,
  notes?: string
}
```

**Lógica**:

- Crear 2 transactions atómicamente (DB transaction)
- Debit: `amount` negativo en `fromAccount`
- Credit: `amount` positivo en `toAccount`
- Linkear con `transaction_pairs`

#### 4. UI

- Nuevo form: `TransferForm.tsx`
- Selectores para `fromAccount` y `toAccount`
- AmountInput (solo positivos)
- Validación: cuentas diferentes

### Impacto

- **DB**: Nueva tabla + migración
- **API**: Nuevo endpoint + lógica transaccional
- **UI**: Nuevo form + listado de transfers
- **Business Logic**: Balances actualizados via triggers (OK)

---

## 🚧 Plaid Integration

**Estado**: Mencionado en README, NO implementado

### Contexto

- Plaid permite conectar cuentas bancarias reales
- Importar transacciones automáticamente
- Actualizar balances en tiempo real

### Complejidad

- Alta (integración externa)
- Requiere credenciales Plaid
- Webhook handling
- Mapeo de categorías

### Prioridad

- Baja (feature avanzada)

---

## 🚧 Lemon Squeezy Integration

**Estado**: Mencionado en README, NO implementado

### Contexto

- Monetización del SaaS
- Subscripciones premium
- Gestión de billing

### Complejidad

- Media (integración externa)
- Requiere credenciales Lemon Squeezy
- Webhook handling para subscriptions

### Prioridad

- Media (monetización)

---

## 🐛 Known Issues

### 1. Balance Initialization

**Problema**: Al crear cuenta, `balance` es `NULL`

**Impacto**: No critical (triggers actualizan al crear transactions)

**TODO**: Considerar inicializar en 0 o permitir balance inicial

### 2. Transaction Type Hardcoded

**Problema**: Form envía `transactionTypeId: ""`

**Impacto**: Probablemente falla en DB (FK constraint)

**TODO**: Implementar selector urgentemente

### 3. Deleted Accounts en Transactions

**Problema**: Cascade delete borra transacciones al borrar cuenta

**Debate**: ¿Soft delete? ¿Archivar?

**TODO**: Decidir política de retención de datos

---

## ✨ Ideas para el Futuro

### Recurring Transactions

- Transacciones recurrentes (mensuales, etc.)
- Cron job para crearlas automáticamente

### Budgets

- Establecer presupuestos por categoría
- Alertas cuando se excede

### Multi-Currency

- Soporte para múltiples monedas
- Conversiones automáticas

### Reports

- Reportes PDF
- Gráficos avanzados
- Exportar a Excel

### Mobile App

- React Native
- Sincronización con web

### AI Categorization

- Auto-categorizar transacciones basado en payee
- Sugerencias inteligentes
