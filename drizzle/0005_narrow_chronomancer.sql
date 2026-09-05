-- Account balances are signed milliunits. Widening integer to bigint is exact:
-- it preserves every existing balance and does not recalculate historical rows.
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE bigint;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_delta BIGINT;
  old_balance_delta BIGINT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    balance_delta := CASE NEW.transaction_type_id
      WHEN 'income' THEN ABS(NEW.amount)
      WHEN 'expense' THEN -ABS(NEW.amount)
      WHEN 'refund' THEN ABS(NEW.amount)
      ELSE 0
    END;

    UPDATE accounts
    SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = NEW.account_id;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    balance_delta := CASE OLD.transaction_type_id
      WHEN 'income' THEN -ABS(OLD.amount)
      WHEN 'expense' THEN ABS(OLD.amount)
      WHEN 'refund' THEN -ABS(OLD.amount)
      ELSE 0
    END;

    UPDATE accounts
    SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = OLD.account_id;

    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_balance_delta := CASE OLD.transaction_type_id
      WHEN 'income' THEN -ABS(OLD.amount)
      WHEN 'expense' THEN ABS(OLD.amount)
      WHEN 'refund' THEN -ABS(OLD.amount)
      ELSE 0
    END;
    balance_delta := CASE NEW.transaction_type_id
      WHEN 'income' THEN ABS(NEW.amount)
      WHEN 'expense' THEN -ABS(NEW.amount)
      WHEN 'refund' THEN ABS(NEW.amount)
      ELSE 0
    END;

    IF (NEW.account_id <> OLD.account_id) THEN
      UPDATE accounts
      SET balance = COALESCE(balance, 0) + old_balance_delta
      WHERE id = OLD.account_id;

      UPDATE accounts
      SET balance = COALESCE(balance, 0) + balance_delta
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