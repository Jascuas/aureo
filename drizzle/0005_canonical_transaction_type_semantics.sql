-- Canonical transaction type semantics
--
-- The application source of truth is
-- features/transaction-types/lib/transaction-types.ts. Migrations cannot import
-- TypeScript, so these immutable persisted IDs intentionally mirror that contract.
-- No transaction rows or account balances are rewritten here.

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_delta INTEGER;
  old_balance_delta INTEGER;
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
--> statement-breakpoint
DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions;
--> statement-breakpoint
CREATE TRIGGER transactions_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();
