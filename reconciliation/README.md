# Canonical transaction-type reconciliation

The exact forward SQL was applied and verified on 2026-09-22 against Aureo's
production Neon endpoint `ep-withered-cherry-a2txq1lc`, project
`billowing-thunder-74965762`, branch `br-curly-tree-a2h11wys`. It is not a
Drizzle migration and no build or application command invokes it. Do not replay it.

Executed source: `a1108300fdc545f7c8d73f225a8f0d7c052df111`.
SQL SHA-256: `a9d34688dbd16b7d3107d2bfc0eaf1bdc29f5953ea333be139ffa76e369108cf`.
Postflight verified all 1,134 canonical references, all 138 Transfers, zero legacy
transaction references, the enabled compatible trigger, intended schema/indexes,
and an unchanged account-balance fingerprint. The historical journal remains
unchanged. A pre-cutover Neon snapshot was retained.

Execution evidence is in
`/Users/javiersanchez/Personal/hermes-rollout-2026-09-22/production-cutover/aureo-cutover-v2-apply-receipt.json`
and `aureo-cutover-v2-postflight.json` beside it. The first operation stopped on
an overly strict trigger-definition guard and rolled back unchanged; its receipt
and SQL were preserved. The corrected exact preflight passed natively before the
single successful execution. The SQL file's original review-only header is
preserved to keep the executed artifact's hash stable; this execution record
supersedes that historical status. It reconciles the
observed production schema with the current application contract without using
`pnpm db:migrate`, because the production Drizzle journal has eight hashes that
do not align with the checked-out nine-entry journal.

The approved business choice is to keep `Transfer` as the fourth canonical
transaction type and preserve its current signed effect on account balances.
The forward SQL therefore maps only the three observed legacy IDs in
`transactions` to canonical IDs, leaves all `amount` and `accounts.balance`
values unchanged, does not reclassify the observed 138 Transfer rows, and
retains the three legacy catalog records as truthful historical references.

The script’s transaction requires the exact observed target before it can make
any change: `neondb/public`, the eight full migration-log hashes, no canonical
reference rows, three legacy reference rows, 1,134 mapped transactions, 138
Transfers, no null/dangling type references, and the audited trigger/schema
shape. A changed baseline aborts rather than guessing how to proceed.

It temporarily disables only `transactions_balance_trigger` around the
identifier update. This avoids the old trigger interpreting a legacy-to-
canonical ID change as a new financial event. The replacement trigger encodes
the existing production behavior for all four canonical types, including the
signed Transfer path. No historical balance is recalculated. A session-local,
aggregate-only guard compares account count, sum, minimum, and maximum before
and after the transaction; it does not read or print account-level data.

The `bigint`, `import_key`, transaction indexes, and `accounts.user_id` index
are included because the schema-only audit proved each is absent while source
code already depends on it.
The current `accounts.balance` default and NOT NULL constraint are deliberately
preserved even though the checked-out Drizzle declaration is looser; changing
those properties is outside this data reconciliation. The source's
transaction-type name-unique constraint is intentionally deferred: adding it
would require deleting or renaming retained legacy catalog rows, neither of
which is needed for this canonical-ID cutover.

For any future reconciliation, require a new reviewed artifact, an approved
operator, a fresh target preflight and a recovery point. This artifact has already
run and its original preconditions will now reject replay. Run the SQL as one explicit transaction with an error-stopping
client; do not substitute `pnpm db:migrate`, `db:push`, or a deployment build.
The script never writes `drizzle.__drizzle_migrations`, so the migration ledger
continues to describe the real, non-batch history.

The release order is constrained by the current source/schema drift. First,
review the application patch in a preview without treating its build as a
migration. Next, repeat the SQL preflight and run the explicit transaction only
after production approval. Then deploy the compatibility application with that
schema gate. The DDL preserves the previous schema surface; full product
compatibility requires the new application. The compatibility application also works before the
transaction for ordinary transaction writes because it resolves canonical input
to the existing legacy reference, but that is not a reason to deploy it early:
the currently missing `import_key` and bigint schema pieces remain an
independent production gate. Do not run a migration during a Vercel build.
