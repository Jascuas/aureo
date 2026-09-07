import { neon } from "@neondatabase/serverless";

import { E2E_ENVIRONMENT } from "../e2e/environment.ts";
import { buildAureoQaFixture } from "../e2e/fixtures.ts";

if (!E2E_ENVIRONMENT.managedQa || !E2E_ENVIRONMENT.descriptor) {
  throw new Error("QA fixture preparation is allowed only in a validated Hermes managed-QA run");
}
const fixture = buildAureoQaFixture(E2E_ENVIRONMENT.descriptor);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Validated managed QA DATABASE_URL is missing");
const sql = neon(databaseUrl);

const [positive, zero, negative, secondary] = fixture.accounts;
const [primaryCategory, secondaryCategory] = fixture.categories;
const [income, expense, secondaryIncome] = fixture.transactions;

const [foreignReservation] = await sql`
  SELECT
    (SELECT COUNT(*) FROM accounts WHERE id IN (${positive.id}, ${zero.id}, ${negative.id}, ${secondary.id})
      AND NOT ((id IN (${positive.id}, ${zero.id}, ${negative.id}) AND user_id = ${fixture.primaryUserId})
        OR (id = ${secondary.id} AND user_id = ${fixture.secondaryUserId}))) AS foreign_accounts,
    (SELECT COUNT(*) FROM categories WHERE id IN (${primaryCategory.id}, ${secondaryCategory.id})
      AND NOT ((id = ${primaryCategory.id} AND user_id = ${fixture.primaryUserId})
        OR (id = ${secondaryCategory.id} AND user_id = ${fixture.secondaryUserId}))) AS foreign_categories,
    (SELECT COUNT(*) FROM import_templates WHERE id = ${fixture.importTemplate.id}
      AND (user_id <> ${fixture.primaryUserId} OR account_id <> ${fixture.importTemplate.accountId})) AS foreign_templates,
    (SELECT COUNT(*) FROM transactions
      WHERE id IN (${income.id}, ${expense.id}, ${secondaryIncome.id})
        AND NOT (
          (id = ${income.id} AND account_id = ${income.accountId}) OR
          (id = ${expense.id} AND account_id = ${expense.accountId}) OR
          (id = ${secondaryIncome.id} AND account_id = ${secondaryIncome.accountId})
        )) AS foreign_transactions
`;
if (
  Number(foreignReservation.foreign_accounts) !== 0 ||
  Number(foreignReservation.foreign_categories) !== 0 ||
  Number(foreignReservation.foreign_templates) !== 0 ||
  Number(foreignReservation.foreign_transactions) !== 0
) {
  throw new Error("Refusing to seed Aureo QA fixtures because a reserved ID belongs to another owner");
}

await sql`DELETE FROM transactions WHERE id IN (${income.id}, ${expense.id}, ${secondaryIncome.id})`;
await sql`
  INSERT INTO accounts (id, name, user_id, balance)
  VALUES
    (${positive.id}, ${positive.name}, ${positive.userId}, 0),
    (${zero.id}, ${zero.name}, ${zero.userId}, 0),
    (${negative.id}, ${negative.name}, ${negative.userId}, 0),
    (${secondary.id}, ${secondary.name}, ${secondary.userId}, 0)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, balance = 0
  WHERE accounts.user_id = EXCLUDED.user_id
`;
await sql`
  INSERT INTO categories (id, name, user_id, parent_id)
  VALUES
    (${primaryCategory.id}, ${primaryCategory.name}, ${primaryCategory.userId}, NULL),
    (${secondaryCategory.id}, ${secondaryCategory.name}, ${secondaryCategory.userId}, NULL)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  WHERE categories.user_id = EXCLUDED.user_id
`;
await sql`
  INSERT INTO import_templates (
    id, user_id, account_id, name, column_mapping, date_format, amount_format
  ) VALUES (
    ${fixture.importTemplate.id}, ${fixture.importTemplate.userId}, ${fixture.importTemplate.accountId},
    ${fixture.importTemplate.name}, ${JSON.stringify({ date: 0, payee: 1, amount: 2 })}::jsonb,
    'YYYY-MM-DD', ${JSON.stringify({ decimalSeparator: ".", thousandsSeparator: "", isNegativeExpense: true })}::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  WHERE import_templates.user_id = EXCLUDED.user_id AND import_templates.account_id = EXCLUDED.account_id
`;
await sql`
  INSERT INTO transactions (
    id, amount, payee, notes, date, account_id, category_id, import_key, transaction_type_id
  ) VALUES
    (${income.id}, ${income.amount}, 'QA income', NULL, timestamp '2026-09-01 09:00:00', ${income.accountId}, ${income.categoryId}, ${`${fixture.runId}:income`}, ${income.type}),
    (${expense.id}, ${expense.amount}, 'QA expense', NULL, timestamp '2026-09-02 09:00:00', ${expense.accountId}, ${expense.categoryId}, ${`${fixture.runId}:expense`}, ${expense.type}),
    (${secondaryIncome.id}, ${secondaryIncome.amount}, 'QA secondary income', NULL, timestamp '2026-09-03 09:00:00', ${secondaryIncome.accountId}, ${secondaryIncome.categoryId}, ${`${fixture.runId}:secondary`}, ${secondaryIncome.type})
`;

const verification = await sql`
  SELECT
    COUNT(*) AS account_count,
    (SELECT COUNT(*) FROM transactions
      WHERE id IN (${income.id}, ${expense.id}, ${secondaryIncome.id})
        AND account_id IN (${income.accountId}, ${expense.accountId}, ${secondaryIncome.accountId})) AS transaction_count,
    (SELECT COUNT(*) FROM import_templates
      WHERE id = ${fixture.importTemplate.id}
        AND user_id = ${fixture.primaryUserId}
        AND account_id = ${fixture.importTemplate.accountId}) AS template_count
  FROM accounts
  WHERE
    (id = ${positive.id} AND user_id = ${positive.userId} AND balance = ${positive.expectedBalance}) OR
    (id = ${zero.id} AND user_id = ${zero.userId} AND balance = ${zero.expectedBalance}) OR
    (id = ${negative.id} AND user_id = ${negative.userId} AND balance = ${negative.expectedBalance}) OR
    (id = ${secondary.id} AND user_id = ${secondary.userId} AND balance = ${secondary.expectedBalance})
`;
if (
  Number(verification[0]?.account_count) !== fixture.accounts.length ||
  Number(verification[0]?.transaction_count) !== fixture.transactions.length ||
  Number(verification[0]?.template_count) !== 1
) {
  throw new Error("Aureo QA fixture balance or ownership verification failed");
}

console.log(`Prepared Aureo QA fixtures for run ${fixture.runId} with two isolated owners.`);
