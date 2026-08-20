import { neon } from "@neondatabase/serverless";

import { getE2EClerkUserId } from "../e2e/environment.ts";

const RESERVED_E2E_ACCOUNTS = [
  {
    id: "e2e-dashboard-positive",
    name: "E2E Positive Account",
    balance: 125_000,
  },
  {
    id: "e2e-dashboard-zero",
    name: "E2E Zero Account",
    balance: 0,
  },
  {
    id: "e2e-dashboard-negative",
    name: "E2E Negative Account",
    balance: -75_000,
  },
] as const;

const userId = getE2EClerkUserId();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing required local E2E environment variable: DATABASE_URL");
}

const sql = neon(databaseUrl);

const [positiveAccount, zeroAccount, negativeAccount] = RESERVED_E2E_ACCOUNTS;
const upsertedAccounts = await sql`
  WITH expected_accounts (id, name, user_id, balance) AS (
    VALUES
      (${positiveAccount.id}, ${positiveAccount.name}, ${userId}, CAST(${positiveAccount.balance} AS integer)),
      (${zeroAccount.id}, ${zeroAccount.name}, ${userId}, CAST(${zeroAccount.balance} AS integer)),
      (${negativeAccount.id}, ${negativeAccount.name}, ${userId}, CAST(${negativeAccount.balance} AS integer))
  ), foreign_reservations AS (
    SELECT accounts.id
    FROM accounts
    INNER JOIN expected_accounts ON accounts.id = expected_accounts.id
    WHERE accounts.user_id <> expected_accounts.user_id
  )
  INSERT INTO accounts (id, name, user_id, balance)
  SELECT id, name, user_id, balance
  FROM expected_accounts
  WHERE NOT EXISTS (SELECT 1 FROM foreign_reservations)
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, balance = EXCLUDED.balance
  WHERE accounts.user_id = EXCLUDED.user_id
  RETURNING id
`;

if (upsertedAccounts.length !== RESERVED_E2E_ACCOUNTS.length) {
  throw new Error(
    "Refusing to seed E2E accounts because a reserved account ID is owned by another user.",
  );
}

const [verification] = await sql`
  SELECT COUNT(*) AS account_count
  FROM accounts
  WHERE
    (id = ${positiveAccount.id} AND name = ${positiveAccount.name} AND user_id = ${userId} AND balance = ${positiveAccount.balance})
    OR (id = ${zeroAccount.id} AND name = ${zeroAccount.name} AND user_id = ${userId} AND balance = ${zeroAccount.balance})
    OR (id = ${negativeAccount.id} AND name = ${negativeAccount.name} AND user_id = ${userId} AND balance = ${negativeAccount.balance})
`;

if (Number(verification.account_count) !== RESERVED_E2E_ACCOUNTS.length) {
  throw new Error("E2E fixture verification failed.");
}

console.log("Prepared 3 dedicated E2E dashboard accounts.");
