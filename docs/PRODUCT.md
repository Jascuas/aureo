# Product

## Authority

This document defines Aureo's product purpose, users, behavior, principles, and
anti-patterns. It describes the intended product, not a claim that every current
screen or workflow already complies with it.

`AGENTS.md` governs code architecture. `docs/DESIGN.md` governs visual and
interaction decisions. Plane is the live authority for approved delivery work.
Roadmaps, audits, source code, and implementation history do not override this
document.

## Product definition

Aureo is a private personal-finance application for individuals in Spain. It
helps a person understand, organize, and control their own financial activity
through accounts, transactions, categories, summaries, and reviewed imports.

The technical system may isolate many users, but Aureo is not a collaborative
workspace, household ledger, accounting product, or financial institution. Each
person operates within a private financial space.

## Primary user

The primary user wants a reliable view of personal finances without maintaining
spreadsheets or surrendering control to opaque automation. They need to:

- know what changed and where money went;
- keep accounts, transactions, and categories accurate;
- import bank activity without blindly trusting a parser or AI model;
- identify mistakes and correct them confidently;
- compare a selected period or account without losing context;
- use the essential product on both desktop and mobile.

## Product promise

Aureo turns raw financial activity into a trustworthy, understandable personal
record. It supports financial awareness and organization. It does not provide
investment, tax, legal, credit, or personalized financial advice.

The product earns trust through accurate amounts, explicit scope, reversible or
confirmable actions, visible processing state, and honest failure reporting.
Visual polish never compensates for uncertain financial semantics.

## Core loop

1. Record a transaction manually or import activity from a source file.
2. Verify dates, amounts, payees, accounts, types, categories, and duplicates.
3. Confirm the write explicitly.
4. Explore the resulting position through summaries, filters, charts, and lists.
5. Correct errors at their canonical source and see affected summaries update.

The first useful outcome is a trustworthy account and transaction history, not a
decorative dashboard with unverified data.

## Core capabilities

### Accounts

- Represent the user's financial containers.
- Provide stable ownership for transactions and balances.
- Make balance state and reconciliation understandable.
- Avoid implying unsupported bank synchronization or historical balance data.

### Transactions

- Form the canonical activity record.
- Support deliberate creation, editing, deletion, filtering, search, pagination,
  and bulk operations.
- Keep date, amount, account, type, category, payee, and notes understandable at
  the point of review.
- Never report a failed write as successful.
- Transaction date filters interpret `YYYY-MM-DD` bounds as complete calendar
  days in `Europe/Madrid`, including daylight-saving transitions. The selected
  final date remains inclusive.

### Categories

- Organize activity into a user-owned hierarchy.
- Keep parent-child relationships valid and understandable.
- Preserve user control over uncategorized activity rather than hiding it from
  summaries.

### Overview and analysis

- Answer balance, income, expense, account, category, payee, and time questions
  for the selected scope.
- Keep active account and date filters visible.
- Explain empty, partial, stale, and error states instead of treating all of them
  as "no data."
- Use charts to reveal patterns, not to decorate the interface.

### Import

- Follow an explicit sequence: upload, map, analyze, review, and import.
- Show format assumptions, detected mappings, duplicates, categorization
  suggestions, exclusions, row-level failures, and the final write count.
- Require review before persistence. A cancel action must leave no partial import
  presented as successful.
- Treat templates as user-controlled accelerators, not hidden behavior.

## AI contract

AI is assistive. It may analyze, match, detect, rank, or suggest, but it does not
silently create, edit, delete, categorize, or import financial records.

- Deterministic rules and prior user decisions take precedence over generative
  guesses when both can solve the same problem reliably.
- Suggestions identify their confidence or uncertainty when useful to review.
- The user can inspect and change an AI-assisted result before committing it.
- Failure, timeout, or provider unavailability leaves the user with a safe manual
  path whenever the underlying workflow can continue without AI.
- Prompts, logs, and provider payloads contain only the financial data necessary
  for the approved operation.

## Regional and language contract

- The target product language is Spanish.
- The default regional context is Spain with locale `es-ES`.
- The target default currency is EUR and values display with two decimal places.
- Dates, decimal separators, CSV formats, and week boundaries follow explicit
  regional rules; they are never inferred from visual copy alone.
- Multilingual UI and multi-currency accounting are future product decisions,
  not current promises. Adding them requires an approved domain and data model.

Code identifiers may remain in English. User-facing copy must not mix languages
within one workflow except for established external names or file-format terms.

## Product principles

### Trust before automation

Accuracy, ownership, and explainability take priority over speed or apparent
intelligence. When Aureo is uncertain, it asks or presents a review state.

### Data before decoration

The primary financial object, action, or decision appears before explanatory or
decorative material. Empty states explain the next useful action.

### One action, one outcome

Every mutation has a clear pending, success, partial-success, or failure state.
Success copy names what actually changed.

### Scope stays visible

Account, date range, filters, selected rows, import account, and other active
scope remain visible where they materially change the result.

### Correction is a first-class workflow

Financial records will need correction. Edit, delete, recategorize, duplicate
resolution, reconciliation, and import review are core product behavior rather
than exceptional administration.

### Progressive assistance

Aureo can make repeated work faster after the user has established context or a
preference. It does not force advanced automation into the first-use path.

### Complete mobile essentials

Mobile supports the same essential understanding and correction loop as
desktop. Desktop may show denser comparisons and wider tables, but mobile is not
a read-only or reduced product.

## Safety and privacy

- Authentication never substitutes for user-scoped authorization.
- One user must never infer another user's accounts, categories, transactions,
  templates, summaries, or identifiers.
- Financial records and raw imports are sensitive personal data. Collect,
  transmit, expose, and log only what the active workflow requires.
- Destructive and bulk actions disclose their scope and require explicit
  confirmation proportional to their impact.
- Bank connection, payment execution, or movement of money is out of scope until
  separately designed and approved.

## Product anti-patterns

- Presenting Aureo as financial or investment advice.
- Silent writes, hidden recategorization, or automatic imports without review.
- Showing a success message when persistence failed or completed only partially.
- Hiding records because they are uncategorized, malformed, or inconvenient to
  summarize.
- Treating AI confidence as certainty.
- Building collaborative organizations, business accounting, or banking
  custody into an individual-finance workflow without a product decision.
- Adding a feature because it appears in a historical roadmap or audit.
- Optimizing dashboards before the underlying financial record is trustworthy.
- Mixing Spanish and English user-facing copy within one flow.
- Using desktop density as justification for removing essential mobile actions.

## Proposals and delivery

`docs/future-features.md`, `README.md`, `docs/analysis/`, source comments, and
mockups may contain useful ideas. They are proposals or historical evidence, not
commitments.

A capability becomes planned only when its product behavior, data implications,
risks, acceptance criteria, and priority are approved in Plane. `Done` reflects
the workflow defined in `AGENTS.md`; documentation alone does not establish that
a capability exists in production.

## Product success signals

Evaluate Aureo with observable user outcomes:

- time from first account to a trustworthy first overview;
- successful manual and CSV transaction completion rates;
- import rows requiring correction, skipped rows, and unresolved failures;
- stale or contradictory summary incidents;
- time required to find and correct a financial record;
- successful completion of essential flows on mobile;
- frequency of repeated use without data-integrity support work.

Metrics are diagnostic signals. They do not justify weakening privacy, accuracy,
confirmation, or user control.
