import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getSummaryTransactionTypeIds,
  getTransactionTypeForAmount,
  isSupportedTransactionTypeId,
  SUPPORTED_TRANSACTION_TYPE_IDS,
  SUPPORTED_TRANSACTION_TYPES,
  supportedTransactionTypeIdSchema,
} from "../features/transaction-types/lib/transaction-types.ts";

assert.deepEqual(SUPPORTED_TRANSACTION_TYPE_IDS, ["income", "expense", "refund"]);
assert.deepEqual(
  SUPPORTED_TRANSACTION_TYPES.map(({ id, name }) => ({ id, name })),
  [
    { id: "income", name: "Income" },
    { id: "expense", name: "Expense" },
    { id: "refund", name: "Refund" },
  ],
);

for (const id of SUPPORTED_TRANSACTION_TYPE_IDS) {
  assert.equal(supportedTransactionTypeIdSchema.safeParse(id).success, true);
  assert.equal(isSupportedTransactionTypeId(id), true);
}

for (const unsupportedId of ["", "transfer", "Transfer", "unknown", "Income"]) {
  assert.equal(supportedTransactionTypeIdSchema.safeParse(unsupportedId).success, false);
  assert.equal(isSupportedTransactionTypeId(unsupportedId), false);
}

assert.equal(getTransactionTypeForAmount(-1).id, "expense");
assert.equal(getTransactionTypeForAmount(0).id, "income");
assert.equal(getTransactionTypeForAmount(1).id, "income");
assert.deepEqual(getSummaryTransactionTypeIds("Income"), ["income"]);
assert.deepEqual(getSummaryTransactionTypeIds("Expense"), ["expense", "refund"]);
assert.deepEqual(getSummaryTransactionTypeIds("Refund"), ["refund"]);
assert.deepEqual(getSummaryTransactionTypeIds("All"), SUPPORTED_TRANSACTION_TYPE_IDS);

const transactionsRouteSource = readFileSync(
  new URL("../app/api/[[...route]]/transactions.ts", import.meta.url),
  "utf8",
);
const csvImportRouteSource = readFileSync(
  new URL("../app/api/[[...route]]/csv-import.ts", import.meta.url),
  "utf8",
);
const transactionTypesRouteSource = readFileSync(
  new URL("../app/api/[[...route]]/transaction-types.ts", import.meta.url),
  "utf8",
);
const categorizerSource = readFileSync(
  new URL("../features/csv-import/lib/transaction-categorizer.ts", import.meta.url),
  "utf8",
);
const summaryHelpersSource = readFileSync(
  new URL("../db/helpers.ts", import.meta.url),
  "utf8",
);
const triggerMigrationSource = readFileSync(
  new URL(
    "../drizzle/0005_canonical_transaction_type_semantics.sql",
    import.meta.url,
  ),
  "utf8",
);

assert.match(transactionsRouteSource, /transactionWriteSchema/);
assert.match(transactionsRouteSource, /API_ERRORS\.INVALID_FOREIGN_KEY, 400/);
assert.match(csvImportRouteSource, /transactionTypeId: supportedTransactionTypeIdSchema/);
assert.match(csvImportRouteSource, /API_ERRORS\.INVALID_FOREIGN_KEY, 400/);
assert.match(transactionTypesRouteSource, /SUPPORTED_TRANSACTION_TYPES/);
assert.doesNotMatch(transactionTypesRouteSource, /Transfer/);
assert.match(categorizerSource, /isSupportedTransactionTypeId\(hint\.transactionTypeId\)/);
assert.match(summaryHelpersSource, /SUPPORTED_TRANSACTION_TYPE_IDS\[2\].*\n.*-ABS/s);
assert.match(triggerMigrationSource, /WHEN 'refund' THEN NEW\.amount/);
assert.doesNotMatch(triggerMigrationSource, /LOWER\(tt\.name\)/);

console.log("Transaction type contract checks passed.");
