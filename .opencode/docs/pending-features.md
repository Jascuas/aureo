# Features Pendientes - Aureo

## 🚧 Transaction Type Selector

**Estado**: Schema OK, UI NO

- Tabla `transactionTypes`: "Income", "Expense", "Refund"
- Form hardcodea `transactionTypeId: ""`
- **TODO**: Endpoint GET + hook + `<GenericSelect>` en form

**Ubicación**: `features/transactions/components/transaction-form.tsx:66`

## 🚧 Category Parent Selector

**Estado**: Schema soporta jerarquía, UI NO

- `categories.parentId` permite parent-child
- Form solo acepta `name`
- **TODO**: Hook tree structure + selector opcional + UI jerarquía

**Ubicación**: `features/categories/components/category-form.tsx`

## 🚧 Transferencias entre Cuentas

**Estado**: NO implementado

**Diseño**:

1. Nueva tabla `transaction_pairs` (link debit/credit transactions)
2. Nuevo transaction type "Transfer"
3. Endpoint `POST /api/transactions/transfer` (DB transaction atómica)
4. Form: selectores fromAccount/toAccount + AmountInput positivo

**Impacto**: DB migration + nuevo endpoint + nuevo form

## 🚧 Plaid Integration

Conectar bancos reales, importar transacciones automáticamente.
**Prioridad**: Baja

## 🚧 Lemon Squeezy Integration

Monetización, subscripciones, billing.
**Prioridad**: Media

## 🐛 Known Issues

1. **Balance Initialization**: NULL al crear cuenta (no crítico)
2. **Transaction Type Hardcoded**: FK constraint falla
3. **Cascade Delete**: ¿Soft delete? ¿Archivar?

## ✨ Ideas Futuro

- Recurring transactions (cron job)
- Budgets por categoría + alertas
- Multi-currency + conversiones
- Reports PDF + Excel export
- Mobile app (React Native)
- AI categorization (payee → category)
