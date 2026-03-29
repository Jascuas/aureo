# Aureo Form Builder

Genera forms con validación Zod + React Hook Form.

## Cuándo Usar Este Skill

✅ **USA cuando**:

- Crear form completo para CRUD (create + edit + delete) de una entidad
- Generar form + new sheet + edit sheet + zustand stores (conjunto completo)
- Implementar validación compleja con Zod + React Hook Form
- Necesitas form con loading states, disabled states, confirm dialogs
- Form usa campos estándar: Input, Textarea, DatePicker, Select, AmountInput

❌ **NO USES cuando**:

- Solo necesitas un form simple sin sheets → escribe directo sin skill
- Form tiene lógica de negocio muy custom → implementa manualmente
- Solo editas form existente (no crear desde cero) → edita archivo directo

## Estructura (3 archivos)

**1. Form**: `features/[entity]/components/[entity]-form.tsx`

- Props: `id?, defaultValues?, onSubmit, onDelete?, disabled?`
- React Hook Form + zodResolver
- Mostrar delete button solo si `id` existe

**2. New Sheet**: `new-[entity]-sheet.tsx`

- Zustand hook: `useNew[Entity]()`
- Mutation hook: `useCreate[Entity]()`
- Loading state: `Loader2` durante `isPending`

**3. Edit Sheet**: `edit-[entity]-sheet.tsx`

- Zustand hook: `useOpen[Entity]()` (con `id`)
- Query: `useGet[Entity](id)`
- Mutations: `useEdit + useDelete`
- Confirm dialog: `useConfirm` para delete
- Loading states: query + mutations

## Zustand Stores

**use-new-[entity].ts**:

```typescript
type NewState = { isOpen: boolean; onOpen: () => void; onClose: () => void };
export const useNewEntity = create<NewState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

**use-open-[entity].ts**: Igual + `id?: string` + `onOpen: (id: string) => void`

## Field Types

**Input**: `<Input {...field} />`  
**Textarea**: `<Textarea {...field} value={field.value ?? ""} />`  
**DatePicker**: `<DatePicker value={field.value} onChange={field.onChange} />`  
**Select**: `<GenericSelect options={} value={} onChange={} onCreate={} />`  
**Amount**: `<AmountInput {...field} />` (ver `lib/utils.ts` para conversión milliunits)

## Checklist

- Form component + validation schema
- New sheet + create mutation
- Edit sheet + edit/delete mutations + confirm dialog
- Zustand stores (new + open)
- Loading/disabled states
- Toast notifications (en mutation hooks)

Referencia completa: Ver `features/accounts/components/` y `state-management.md`
