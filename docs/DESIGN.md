# Design System: Aureo

## Authority

This document defines Aureo's target visual language, interaction principles,
responsive behavior, accessibility requirements, and component rules. It is
normative for user-facing work even while legacy screens are migrated.

`docs/PRODUCT.md` governs product behavior. `AGENTS.md` governs code ownership
and implementation architecture. Approved scoped deviations belong only in
`docs/EXCEPTIONS.md`. Observed code and screenshots are evidence, not authority.

## Direction: the financial command terminal

Aureo is a calm, precise financial cockpit expressed through a restrained CRT
terminal language. It should feel focused, trustworthy, technical, and
deliberate—not theatrical, nostalgic for its own sake, or styled like a generic
cybersecurity dashboard.

The memorable detail is the terminal prompt: square geometry, monospaced data,
subtle grid and scanline texture, controlled phosphor accents, and compact status
language. Financial content remains the subject. The terminal treatment frames
information; it never competes with it.

## Design principles

### Data is the strongest visual element

Amounts, labels, scope, status, and required actions establish hierarchy. Grid,
glow, glyphs, and motion stay subordinate.

### Dense but breathable

Desktop supports repeated scanning and comparison without oversized marketing
composition. Density comes from alignment and concise language, not tiny touch
targets or insufficient spacing.

### Semantic before chromatic

Color communicates meaning through named tokens. Position, labels, symbols, or
patterns provide a second cue; color alone never carries financial or validation
state.

### One visual system

Authentication, dashboard, CRUD tables, sheets, dialogs, import, loading, empty,
and error states share the same tokens and interaction grammar. A third-party
surface is themed to Aureo where supported and framed coherently where it is not.

### Motion explains state

Animation communicates progress, focus, expansion, or transition. Decorative
CRT effects remain subtle and disposable.

## Theme and color

Dark mode is Aureo's primary experience. A complete light mode is also required;
it is a warm paper-terminal interpretation, not an inverted afterthought.

`app/globals.css` owns the implemented semantic tokens. New visual values are
defined there before use. Components consume semantic names rather than literal
hexadecimal, RGB, HSL, OKLCH, or framework palette values.

### Semantic roles

- `background`: application canvas.
- `card` and `popover`: raised working surfaces.
- `secondary` and `muted`: lower-emphasis controls and regions.
- `foreground`: primary data and action text.
- `muted-foreground` and `crt-dim`: secondary context and disabled emphasis.
- `border`: structure and grouping.
- `crt-accent`: active focus, selection, prompt, and primary brand signal.
- `crt-pos` or `success`: positive financial or completion state.
- `destructive` or `crt-neg`: loss, failure, and destructive action.
- `crt-amber`: caution, pending review, and non-blocking warning.
- chart tokens: ordered categorical and quantitative data colors.

Accent and destructive colors may be visually related, but they remain different
semantic roles. A destructive state always includes explicit wording or an icon.

### Palette behavior

- Large surfaces remain neutral; saturated colors are reserved for meaning.
- Borders define most grouping. Heavy shadows and floating glass cards are not
  the default.
- Charts use the approved multi-hue palette and preserve series identity across
  views.
- Light and dark themes preserve semantic relationships and WCAG AA contrast for
  load-bearing information.
- Do not use raw framework colors such as `text-slate-*`, `bg-blue-*`, or
  `bg-rose-*` in application UI when an Aureo token can express the role.

## Typography and numbers

- Monospaced typography is the primary family for interface and financial data.
- Numeric values use tabular figures. Currency alignment must remain stable while
  values update.
- Page and card titles use concise uppercase labels with controlled tracking.
- Instructions, descriptions, validation, and longer messages use sentence case
  for readability; do not uppercase paragraphs.
- The largest type belongs to key amounts or a true page decision, not generic
  welcome copy.
- Use a clear heading hierarchy. Visual styling never changes semantic heading
  order.
- Truncation is acceptable only when the full value remains available through a
  label, tooltip, expansion, or detail view.

User-facing language follows `docs/PRODUCT.md`: Spanish, `es-ES`, and EUR. Format
currency with two decimals, keep minus signs explicit, and never use a currency
symbol that contradicts the stored or selected currency.

## Geometry and spacing

- Square corners are the canonical Aureo geometry. Rounded shapes are reserved
  for inherently circular indicators, avatars, radio controls, and chart marks.
- Use the shared spacing scale. Prefer 4/8-based rhythm and consistent card
  padding over one-off arbitrary values.
- Cards do not nest inside cards unless the inner surface is an interactive
  object with an independently meaningful state.
- Dividers, grid alignment, and whitespace establish structure before shadows.
- Background grid and scanline textures remain low contrast and never reduce text
  readability.

## Application shell

### Desktop

- Persistent left navigation provides Overview, Transactions, Accounts, and
  Categories, plus future approved first-class domains.
- Global account and date scope appears before scoped dashboard content.
- The main canvas prioritizes key totals, analysis, account position, and recent
  activity in that order.
- Sidebar collapse preserves a clear way to restore navigation and does not
  shift critical data unexpectedly.

### Mobile

- Use a compact top bar with Aureo identity and a sheet-based navigation menu.
- Account and date filters stack at full width when needed.
- Essential create, edit, delete, filter, import, review, and correction actions
  remain available.
- Touch targets are at least 44 by 44 CSS pixels unless an equivalent enlarged
  hit area is provided.
- One-column cards are the default. Wide tables use an intentional mobile
  representation or contained horizontal scrolling; the page itself must not
  overflow horizontally.
- Internal scroll containers must not hide the rest of a route from full-page
  navigation or accessibility tools.

Desktop may expose more simultaneous comparison. It must not define a different
product from mobile.

## Components

### Primitives

`components/ui/` is the single primitive system. Extend variants centrally
instead of creating parallel Aureo, CRT, redesign, or feature-local copies of a
generic control.

### Cards

- Use a thin semantic border, neutral surface, concise title, and aligned content.
- Optional terminal corner glyphs or prompt markers are decorative and
  `aria-hidden`.
- Avoid repeated cards that communicate the same object in one viewport.
- Empty, loading, error, and populated variants preserve stable dimensions where
  that reduces layout shift.

### Buttons and links

- Primary actions use the accent role; destructive actions use the destructive
  role; secondary actions remain neutral.
- Labels name the outcome: `Crear cuenta`, `Importar transacciones`, or
  `Aplicar filtros`, not vague `Continuar` when a specific action is known.
- Icon-only controls require an accessible name and visible focus.
- Hover is supplementary. Every action works with keyboard and touch.

### Forms

- Labels remain visible; placeholders provide examples, not identity.
- Required state and validation are communicated near the field.
- Date, amount, account, transaction type, and category controls reflect the
  same value the server will validate.
- Monetary inputs use EUR formatting and explain the financial effect without
  contradicting the selected transaction type.
- Pending submission disables duplicate writes but does not erase user input.
- Errors preserve context and tell the user what can be corrected or retried.

### Tables and lists

- Use tables for comparison across stable columns and lists/cards when mobile
  reading would otherwise become horizontal archaeology.
- Header sorting exposes its current state accessibly.
- Selection count, bulk action scope, pagination, and loaded-row status remain
  visible.
- Rows expose a clear primary object and do not hide essential actions solely on
  hover.

### Sheets, dialogs, and popovers

- Sheets own substantial create/edit workflows and mobile navigation.
- Dialogs own bounded decisions and confirmations.
- Popovers own lightweight selection or context and never contain a long primary
  workflow.
- Focus is trapped and restored correctly; Escape and a visible close action are
  supported.
- Opening an overlay does not cause observable page-width shift.

### Feedback states

- Loading uses stable skeletons for known structure and progress indicators for
  indeterminate operations.
- Empty states distinguish no records, no results for active filters, and no
  activity in the selected period. Each offers the next useful action when one
  exists.
- Errors are not restyled empty states. They identify failure and recovery.
- Toasts summarize completed outcomes; they do not contain the only explanation
  of a consequential failure.
- Partial import or batch completion receives a dedicated review summary.

## Dashboard and charts

- The overview answers a question before offering visualization controls.
- Balance, income, and expense cards use consistent units, period comparison,
  and semantic direction.
- Chart controls remain adjacent to the chart they change.
- Axes, legends, tooltips, and comparison periods use the same number and date
  formatting as the rest of Aureo.
- Do not rely on color alone. Provide labels, patterns, symbols, or ordering when
  series meaning would otherwise be ambiguous.
- Preserve chart aspect, label fit, and usable tooltips at mobile widths.
- Respect zero, negative, refund, transfer, uncategorized, and missing-data states
  explicitly. Do not coerce them into a visually convenient story.
- Animation is brief and may introduce values, but does not replay continuously
  or obscure comparison.

## Import experience

The import stepper communicates the five product stages defined in
`docs/PRODUCT.md`. Completed, active, available, blocked, and failed steps use
distinct semantic states and text—not pulse alone.

- The selected destination account stays visible throughout the workflow.
- Upload guidance and limits use Aureo surfaces and tokens.
- Mapping previews source data before analysis.
- Analysis separates deterministic matches, AI suggestions, duplicates, and
  failures.
- Review makes included, changed, skipped, and unresolved rows scannable.
- Import completion reports exact counts and next actions.
- Mobile allows horizontal inspection where necessary without hiding primary
  actions below unreachable content.

## Authentication

- Sign-in and sign-up use the same Aureo theme, geometry, typography, background,
  and language as the authenticated product.
- Third-party identity controls retain provider recognition while fitting the
  surrounding Aureo hierarchy.
- Authentication screens do not use a separate legacy gradient, palette, or
  marketing layout.
- Error, verification, and development states remain readable without exposing
  implementation details to production users.

## Motion and CRT effects

Allowed effects include a restrained prompt blink, subtle scanlines, low-contrast
grid, brief glow, progress sweep, and purposeful overlay transitions.

- Continuous motion never carries required information.
- Scanlines and flicker remain below the threshold where reading or charts are
  impaired.
- Do not animate large financial values continuously after they settle.
- Honor `prefers-reduced-motion`: disable continuous blink, flicker, ticker,
  scan, sweep, parallax, and non-essential transforms while preserving state.
- Motion must not mask slow loading or delay interaction.

## Accessibility

- Meet WCAG AA contrast for text, controls, focus, validation, and chart labels.
- Preserve semantic headings, landmarks, labels, table headers, and live regions.
- Every workflow is operable with keyboard alone and has visible focus.
- Do not use placeholder text as a label.
- Provide text equivalents for status icons, color states, and chart meaning.
- Error messages associate with their field and are announced when appropriate.
- Respect zoom, text resizing, reduced motion, and 320px-wide layouts without
  loss of essential content.

## Do

- Lead with the user's financial object, scope, or next decision.
- Reuse semantic tokens and canonical primitives.
- Keep red, green, amber, and chart colors tied to stable meanings.
- Use terminal details selectively to reinforce identity.
- Verify dark, light, desktop, mobile, keyboard, contrast, and reduced motion in
  proportion to the change.

## Do not

- Add generic SaaS gradients, glassmorphism, oversized marketing heroes, or
  decorative blobs.
- Mix legacy teal, blue, rose, slate, or arbitrary chart colors with the Aureo
  palette.
- Use rounded cards and pills as the default geometry.
- Put cards inside cards to manufacture hierarchy.
- Duplicate the same summary object in one route.
- Treat a screenshot match as proof of responsive behavior or accessibility.
- Make the CRT treatment louder than the financial information.

## Implementation rules

- Read this document and `docs/PRODUCT.md` before user-facing work.
- Use Tailwind utilities and semantic tokens from `app/globals.css`.
- Add reusable visual behavior to the owning `components/ui/` primitive or the
  narrowest domain component defined by `AGENTS.md`.
- A new token states its semantic purpose and supplies both dark and light values.
- A genuine temporary deviation requires an approved entry in
  `docs/EXCEPTIONS.md`; existing non-compliance is not implicit approval.
- Verify the actual affected flow. Source inspection alone cannot prove visual,
  responsive, motion, or accessibility behavior.
