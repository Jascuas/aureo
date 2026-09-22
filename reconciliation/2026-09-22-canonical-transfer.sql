-- Aureo production forward reconciliation. REVIEW ONLY: it has not been run.
--
-- This is deliberately outside drizzle/: the target's journal is divergent, so
-- `pnpm db:migrate` would replay a batch that has not been individually
-- approved. This script must be reviewed with its companion README and run by
-- an approved operator against the exact production target only.
--
-- Source reviewed: origin/main 0344dff1240d9eedf057f537050b957f67aaa908
-- Read-only target baseline: neondb/public, PostgreSQL 170011, 2026-09-22.
-- The preconditions make that baseline a required input, rather than a claim
-- that remains true after another deployment or database change.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Serialize the reconciliation and block concurrent transaction/account
-- writers. The changes to transaction_type_id intentionally run while the
-- balance trigger is disabled, so no identifier change modifies a balance.
SELECT pg_advisory_xact_lock(hashtext('aureo-canonical-transfer-2026-09-22'));
LOCK TABLE accounts, transaction_types, transactions IN SHARE ROW EXCLUSIVE MODE;

-- A session-local aggregate guard proves that this identifier/schema
-- reconciliation did not change the stored balance population. It contains no
-- account identifiers or transaction data and is dropped automatically.
CREATE TEMPORARY TABLE reconciliation_balance_guard (
  account_count bigint NOT NULL,
  balance_sum numeric NOT NULL,
  balance_min bigint,
  balance_max bigint
) ON COMMIT DROP;
INSERT INTO reconciliation_balance_guard
SELECT
  count(*),
  COALESCE(sum(balance::numeric), 0),
  min(balance),
  max(balance)
FROM accounts;

DO $$
DECLARE
  observed_hashes text[];
  expected_hashes constant text[] := ARRAY[
    'd8356520f4aaed7d3000212f93c74a68cc9b7273970e0b11c416ddc17e821134',
    '9695a72654b7a2514865ff08018fd530b5fc781729642ce4ead87c4e25b8e368',
    '28e9639cc381a44ed37e5d3657e58e15aa1dd0636ca95453c547aeda64aeb7fc',
    'd3d6c09c2db378fa8bec1b434fdf2113afd1b84ad89907d98c11b68fbd2d89c9',
    '74d04d946468cb79ebcb0616b742ad06f4133f68b7c544b43ec57e5494a5aa15',
    '010ead34293981baeefbfd155d3b0854a90043a43ed86a656bb87de57681e1c6',
    '6bb2785c5a00d778599d6b6549474c3b0ff0cdc5ba73a687b26b809d103b67bf',
    '9bb0bc3b9a6b8e05055a2e17d22ab45b0cc98c037e417907f73a2c3a925a08df'
  ];
  expected_transaction_constraints constant text[] := ARRAY[
    'fk_transaction_type',
    'transactions_account_id_accounts_id_fk',
    'transactions_category_id_categories_id_fk',
    'transactions_pkey',
    'transactions_transaction_type_id_transaction_types_id_fk'
  ];
BEGIN
  IF current_database() <> 'neondb' OR current_schema() <> 'public' THEN
    RAISE EXCEPTION 'Expected the approved Aureo target neondb/public; got %/%',
      current_database(), current_schema();
  END IF;

  SELECT array_agg(hash ORDER BY created_at)
  INTO observed_hashes
  FROM drizzle.__drizzle_migrations;

  IF observed_hashes IS DISTINCT FROM expected_hashes THEN
    RAISE EXCEPTION 'Migration journal differs from the reviewed baseline; do not run a batch migration or this reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM transaction_types
    WHERE id IN ('income', 'expense', 'refund', 'transfer')
  ) THEN
    RAISE EXCEPTION 'Canonical transaction-type IDs already exist; re-audit before proceeding';
  END IF;

  IF (SELECT count(*) FROM transaction_types
      WHERE id IN (
        'txd4b7kzpn2lmjv6cuqf9s3yw',
        'txp8azr12yckwhv9odnb30elu',
        'uo4hd5voxicrkfovkx0bo8xg'
      )) <> 3 THEN
    RAISE EXCEPTION 'The three reviewed legacy transaction types are not all present';
  END IF;

  IF (SELECT count(*) FROM transactions WHERE transaction_type_id IS NULL) <> 0
    OR (SELECT count(*) FROM transactions t
        LEFT JOIN transaction_types tt ON tt.id = t.transaction_type_id
        WHERE tt.id IS NULL) <> 0 THEN
    RAISE EXCEPTION 'Transaction-type null or dangling-reference baseline changed';
  END IF;

  IF (SELECT count(*) FROM transactions
      WHERE transaction_type_id IN (
        'txd4b7kzpn2lmjv6cuqf9s3yw',
        'txp8azr12yckwhv9odnb30elu',
        'uo4hd5voxicrkfovkx0bo8xg'
      )) <> 1134
    OR (SELECT count(*) FROM transactions
        WHERE transaction_type_id = 'uo4hd5voxicrkfovkx0bo8xg') <> 138 THEN
    RAISE EXCEPTION 'Reviewed transaction-type aggregate counts changed; re-audit before proceeding';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts'
      AND column_name = 'balance' AND udt_name = 'int4'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions'
      AND column_name = 'import_key'
  ) THEN
    RAISE EXCEPTION 'The reviewed balance/import_key schema baseline changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'transactions_account_date_id_idx',
        'transactions_account_transaction_type_date_idx'
      )
  ) OR EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'transactions'::regclass
      AND conname = 'transactions_account_import_key_unique'
  ) THEN
    RAISE EXCEPTION 'The reviewed missing-index/import-key baseline changed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'transactions'::regclass
      AND tgname = 'transactions_balance_trigger' AND NOT tgisinternal
  ) OR to_regprocedure('public.update_account_balance()') IS NULL THEN
    RAISE EXCEPTION 'The reviewed balance trigger/function is not present';
  END IF;

  IF (SELECT tgenabled FROM pg_trigger
      WHERE tgrelid = 'transactions'::regclass
        AND tgname = 'transactions_balance_trigger') <> 'O'
    OR (SELECT pg_get_triggerdef(oid, true) FROM pg_trigger
        WHERE tgrelid = 'transactions'::regclass
          AND tgname = 'transactions_balance_trigger') <>
       'CREATE TRIGGER transactions_balance_trigger AFTER INSERT OR DELETE OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_account_balance()'
    OR md5(pg_get_functiondef('public.update_account_balance()'::regprocedure)) <>
       '403d6f17eff0d52ea0a90ff0839f85ce' THEN
    RAISE EXCEPTION 'The active balance-trigger definition differs from the audited baseline';
  END IF;

  IF (SELECT array_agg(conname::text ORDER BY conname) FROM pg_constraint
      WHERE conrelid = 'transactions'::regclass) IS DISTINCT FROM expected_transaction_constraints
    OR (SELECT array_agg(indexname::text ORDER BY indexname) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'transactions')
       IS DISTINCT FROM ARRAY['transactions_pkey'] THEN
    RAISE EXCEPTION 'The reviewed transaction constraint/index names changed';
  END IF;

  IF (SELECT array_agg(indexname::text ORDER BY indexname) FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'accounts')
     IS DISTINCT FROM ARRAY['accounts_pkey'] THEN
    RAISE EXCEPTION 'The reviewed accounts index names changed';
  END IF;
END
$$;

-- Insert canonical identifiers before redirecting foreign keys. The legacy
-- catalog rows are intentionally retained as historical reference records.
-- Because legacy and canonical rows share names, this transition deliberately
-- does not add the source's name-unique constraint.
INSERT INTO transaction_types (id, name) VALUES
  ('income', 'Income'),
  ('expense', 'Expense'),
  ('refund', 'Refund'),
  ('transfer', 'Transfer');

ALTER TABLE transactions DISABLE TRIGGER transactions_balance_trigger;

-- This is an identifier-only transition. It deliberately does not touch
-- amount, account_id, or accounts.balance, and it does not classify any of the
-- 138 Transfer rows as income, expense, or refund.
UPDATE transactions
SET transaction_type_id = CASE transaction_type_id
  WHEN 'txp8azr12yckwhv9odnb30elu' THEN 'income'
  WHEN 'txd4b7kzpn2lmjv6cuqf9s3yw' THEN 'expense'
  WHEN 'uo4hd5voxicrkfovkx0bo8xg' THEN 'transfer'
  ELSE transaction_type_id
END
WHERE transaction_type_id IN (
  'txd4b7kzpn2lmjv6cuqf9s3yw',
  'txp8azr12yckwhv9odnb30elu',
  'uo4hd5voxicrkfovkx0bo8xg'
);

ALTER TABLE transactions ENABLE TRIGGER transactions_balance_trigger;

ALTER TABLE transactions
  ALTER COLUMN transaction_type_id SET NOT NULL;
ALTER TABLE accounts
  ALTER COLUMN balance SET DATA TYPE bigint;
ALTER TABLE transactions
  ADD COLUMN import_key text;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_account_import_key_unique UNIQUE (account_id, import_key);
CREATE INDEX transactions_account_date_id_idx
  ON transactions (account_id, date, id);
CREATE INDEX transactions_account_transaction_type_date_idx
  ON transactions (account_id, transaction_type_id, date);
CREATE INDEX accounts_user_id_idx
  ON accounts (user_id);

-- Preserve the active production trigger's name-based semantics. This keeps
-- Transfer signed for both its canonical and retained legacy IDs, including a
-- request that chose a legacy reference before the table lock and commits after
-- this transaction. Historical balances are never replayed.
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_delta bigint;
  old_balance_delta bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT CASE
      WHEN LOWER(tt.name) = 'expense' THEN -ABS(NEW.amount)
      WHEN LOWER(tt.name) IN ('income', 'refund', 'transfer') THEN NEW.amount
      ELSE 0
    END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;
    UPDATE accounts SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT CASE
      WHEN LOWER(tt.name) = 'expense' THEN ABS(OLD.amount)
      WHEN LOWER(tt.name) IN ('income', 'refund', 'transfer') THEN -OLD.amount
      ELSE 0
    END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;
    UPDATE accounts SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = OLD.account_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT CASE
      WHEN LOWER(tt.name) = 'expense' THEN ABS(OLD.amount)
      WHEN LOWER(tt.name) IN ('income', 'refund', 'transfer') THEN -OLD.amount
      ELSE 0
    END INTO old_balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;
    SELECT CASE
      WHEN LOWER(tt.name) = 'expense' THEN -ABS(NEW.amount)
      WHEN LOWER(tt.name) IN ('income', 'refund', 'transfer') THEN NEW.amount
      ELSE 0
    END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;

    IF NEW.account_id <> OLD.account_id THEN
      UPDATE accounts SET balance = COALESCE(balance, 0) + old_balance_delta
      WHERE id = OLD.account_id;
      UPDATE accounts SET balance = COALESCE(balance, 0) + balance_delta
      WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts
      SET balance = COALESCE(balance, 0) + old_balance_delta + balance_delta
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF (SELECT count(*) FROM transactions
      WHERE transaction_type_id IN (
        'txd4b7kzpn2lmjv6cuqf9s3yw',
        'txp8azr12yckwhv9odnb30elu',
        'uo4hd5voxicrkfovkx0bo8xg'
      )) <> 0
    OR (SELECT count(*) FROM transactions WHERE transaction_type_id = 'transfer') <> 138
    OR (SELECT count(*) FROM transaction_types
        WHERE id IN ('income', 'expense', 'refund', 'transfer')) <> 4
    OR (SELECT count(*) FROM transaction_types
        WHERE id IN (
          'txd4b7kzpn2lmjv6cuqf9s3yw',
          'txp8azr12yckwhv9odnb30elu',
          'uo4hd5voxicrkfovkx0bo8xg'
        )) <> 3 THEN
    RAISE EXCEPTION 'Canonical transaction-type postcondition failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'transactions'::regclass
      AND tgname = 'transactions_balance_trigger' AND tgenabled = 'D'
  ) THEN
    RAISE EXCEPTION 'Balance trigger remained disabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM reconciliation_balance_guard guard
    CROSS JOIN (
      SELECT
        count(*) AS account_count,
        COALESCE(sum(balance::numeric), 0) AS balance_sum,
        min(balance) AS balance_min,
        max(balance) AS balance_max
      FROM accounts
    ) current
    WHERE (guard.account_count, guard.balance_sum, guard.balance_min, guard.balance_max)
      IS NOT DISTINCT FROM
      (current.account_count, current.balance_sum, current.balance_min, current.balance_max)
  ) THEN
    RAISE EXCEPTION 'Account-balance aggregate invariant failed';
  END IF;
END
$$;

-- Intentionally no INSERT/UPDATE/DELETE in drizzle.__drizzle_migrations.
-- The existing journal remains an honest record of what it did and did not run.
COMMIT;
