# Aureo Form Builder

Compatibility helper for Aureo forms. `AGENTS.md`, `docs/PRODUCT.md`, and
`docs/DESIGN.md` are authoritative. This skill must not create a parallel form,
state, or visual system.

## When to Use This Skill

✅ **USE when**:

- Creating complete form for CRUD (create + edit + delete) of an entity
- Building a create/edit workflow whose shared form behavior is real
- Implementing complex validation with Zod + React Hook Form
- Need form with loading states, disabled states, confirm dialogs
- Form uses standard fields: Input, Textarea, DatePicker, Select, AmountInput

❌ **DON'T USE when**:

- You only need a simple form without sheets → write directly without skill
- Form has very custom business logic → implement manually
- Only editing existing form (not creating from scratch) → edit file directly

## Required shape

- Put route-only UI and behavior in the owning `_components/` and `_hooks/`;
  put reusable domain UI in `features/<domain>/components/`.
- Reuse `components/ui/` primitives and semantic tokens. Do not generate a new
  design system or raw palette.
- Keep simple overlay state local. Use Zustand only for genuinely cross-tree,
  ephemeral workflow state; never duplicate server records.
- The form value must match the server contract. Dates, EUR amounts, account,
  category, and transaction type values must serialize without widening types.
- Pending, success, partial-success, and failure states must be truthful and
  accessible. A failed response never produces a success toast.

## Checklist

- Smallest correct owner selected
- No unnecessary store, wrapper, schema, or duplicated query state
- Visible labels and associated validation errors
- EUR and Spanish product contract preserved
- Keyboard, focus restoration, mobile, and reduced-motion behavior verified
- Mutation response and cache invalidation verified
