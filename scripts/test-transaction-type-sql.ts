import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const containerName = `aureo-aur6-${process.pid}`;
const migration = [
  readFileSync(
    new URL("../drizzle/0005_canonical_transaction_type_semantics.sql", import.meta.url),
    "utf8",
  ),
  readFileSync(
    new URL("../drizzle/0005_narrow_chronomancer.sql", import.meta.url),
    "utf8",
  ),
].join("\n");
const summaryOperationSource = readFileSync(
  new URL("../features/summary/server/summary-operations.ts", import.meta.url),
  "utf8",
);

const docker = (args: string[], input?: string) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    input,
    stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });

const runSql = (query: string) =>
  docker(
    [
      "exec",
      "-i",
      containerName,
      "psql",
      "--dbname=postgres",
      "--no-align",
      "--tuples-only",
      "--field-separator=,",
      "--set=ON_ERROR_STOP=1",
      "--username=postgres",
    ],
    query,
  ).trim();

try {
  docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--env",
    "POSTGRES_PASSWORD=postgres",
    "postgres:16-alpine",
  ]);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      runSql("SELECT 1;");
      break;
    } catch {
      if (attempt === 29) throw new Error("Local PostgreSQL did not become ready");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    }
  }

  runSql(`
    CREATE TABLE accounts (id text PRIMARY KEY, balance integer);
    CREATE TABLE transactions (
      id text PRIMARY KEY,
      amount integer NOT NULL,
      account_id text NOT NULL,
      transaction_type_id text NOT NULL
    );
    ${migration}
    INSERT INTO accounts (id, balance) VALUES ('account-1', 0);
    INSERT INTO transactions (id, amount, account_id, transaction_type_id) VALUES
      ('income-1', -100000, 'account-1', 'income'),
      ('expense-1', -50000, 'account-1', 'expense'),
      ('refund-1', -20000, 'account-1', 'refund'),
      ('unsupported-1', 999999, 'account-1', 'transfer');
  `);

  assert.equal(
    runSql("SELECT balance FROM accounts WHERE id = 'account-1';"),
    "70000",
  );
  assert.equal(
    runSql("SELECT pg_typeof(balance) FROM accounts WHERE id = 'account-1';"),
    "bigint",
  );
  assert.equal(
    runSql(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type_id = 'income' THEN ABS(amount) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type_id = 'expense' THEN ABS(amount) WHEN transaction_type_id = 'refund' THEN -ABS(amount) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type_id IN ('income', 'refund') THEN ABS(amount) WHEN transaction_type_id = 'expense' THEN -ABS(amount) ELSE 0 END), 0)
      FROM transactions;
    `),
    "100000,30000,70000",
  );

  runSql(
    "UPDATE transactions SET amount = 30000, transaction_type_id = 'expense' WHERE id = 'refund-1';",
  );
  assert.equal(
    runSql("SELECT balance FROM accounts WHERE id = 'account-1';"),
    "20000",
  );

  runSql("DELETE FROM transactions WHERE id = 'expense-1';");
  assert.equal(
    runSql("SELECT balance FROM accounts WHERE id = 'account-1';"),
    "70000",
  );

  runSql(`
    INSERT INTO transactions (id, amount, account_id, transaction_type_id) VALUES
      ('large-income-1', 2000000000, 'account-1', 'income'),
      ('large-income-2', 2000000000, 'account-1', 'income');
  `);
  assert.equal(
    runSql("SELECT balance FROM accounts WHERE id = 'account-1';"),
    "4000070000",
  );

  assert.equal(
    summaryOperationSource.includes("ROUND(SUM(${categoryAmountSql}) / 1000)"),
    false,
  );
  assert.equal(
    summaryOperationSource.includes(
      "valueMilliunits: sql<number>`SUM(${categoryAmountSql})`",
    ),
    true,
  );
  assert.equal(
    summaryOperationSource.includes("value: convertAmountFromMilliunits"),
    true,
  );
  assert.equal(
    summaryOperationSource.includes(
      "to_char(${transactions.date} AT TIME ZONE 'UTC' AT TIME ZONE ${DATE_RANGE_TIME_ZONE}, 'YYYY-MM-DD')",
    ),
    true,
  );
  assert.equal(
    summaryOperationSource.includes(
      "to_char(${transactions.date} AT TIME ZONE ${DATE_RANGE_TIME_ZONE}, 'YYYY-MM-DD')",
    ),
    false,
  );

  runSql("SET TIME ZONE 'UTC';");
  assert.equal(
    runSql("SELECT to_char(timestamp '2026-03-29 00:00:00', 'YYYY-MM-DD');"),
    "2026-03-29",
  );
  assert.equal(
    runSql(
      "SELECT to_char(timestamp '2026-03-29 00:00:00' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD');",
    ),
    "2026-03-28",
  );
  assert.equal(
    runSql(
      "SELECT to_char(timestamp '2026-03-29 00:00:00' AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD');",
    ),
    "2026-03-29",
  );
  assert.equal(
    runSql(
      "SELECT to_char(timestamp '2026-03-28 23:00:00' AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD');",
    ),
    "2026-03-29",
  );

  runSql(`
    INSERT INTO transactions (id, amount, account_id, transaction_type_id) VALUES
      ('summary-cents', 12990, 'account-1', 'income');
  `);
  assert.equal(
    runSql(`
      SELECT
        (SUM(CASE WHEN transaction_type_id = 'income' THEN ABS(amount) ELSE 0 END) = 12990)::text,
        (SUM(CASE WHEN transaction_type_id = 'income' THEN ABS(amount) ELSE 0 END) / 1000.0 = 12.99)::text
      FROM transactions
      WHERE id = 'summary-cents';
    `),
    "true,true",
  );

  console.log("Transaction type SQL trigger checks passed.");
} finally {
  try {
    docker(["rm", "--force", containerName]);
  } catch {
    // The container may not have started successfully.
  }
}
