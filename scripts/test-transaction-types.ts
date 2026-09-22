import assert from "node:assert/strict";
import test from "node:test";

import type { MiddlewareHandler } from "hono";

import { createCsvImportApp } from "../app/api/[[...route]]/csv-import.ts";
import { createTransactionsApp } from "../app/api/[[...route]]/transactions.ts";
import {
  canonicalizeTransactionTypeId,
  getStoredTransactionTypeIdCandidates,
  getSummaryStoredTransactionTypeIds,
  getSummaryTransactionTypeIds,
  getTransactionSummaryAmounts,
  getTransactionTypeForAmount,
  isSupportedTransactionTypeId,
  normalizeTransactionAmount,
  SUPPORTED_TRANSACTION_TYPE_IDS,
  SUPPORTED_TRANSACTION_TYPES,
  supportedTransactionTypeIdSchema,
  transactionTypeInputIdSchema,
} from "../features/transaction-types/lib/transaction-types.ts";
import type { AppEnv } from "../lib/hono-env.ts";
import {
  convertAmountFromMilliunits,
  convertAmountToMilliunits,
} from "../lib/utils.ts";

const testAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("userId", "test-user");
  await next();
};

const transactionsApp = createTransactionsApp(testAuthMiddleware);
const csvImportApp = createCsvImportApp(testAuthMiddleware);

const transactionWrite = {
  accountId: "account-1",
  amount: 50_000,
  categoryId: null,
  date: "2026-09-02T00:00:00.000Z",
  notes: null,
  payee: "Example payee",
};

const importTransaction = {
  amount: 50_000,
  categoryId: null,
  date: "2026-09-02T00:00:00.000Z",
  notes: null,
  payee: "Example payee",
};

const expectInvalidForeignKey = async (response: Response) => {
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid category or transaction type ID",
  });
};

test("canonical IDs include Transfer and accept audited legacy IDs during cutover", () => {
  assert.deepEqual(SUPPORTED_TRANSACTION_TYPE_IDS, [
    "income",
    "expense",
    "refund",
    "transfer",
  ]);
  assert.deepEqual(
    SUPPORTED_TRANSACTION_TYPES.map(({ id, name }) => ({ id, name })),
    [
      { id: "income", name: "Income" },
      { id: "expense", name: "Expense" },
      { id: "refund", name: "Refund" },
      { id: "transfer", name: "Transfer" },
    ],
  );

  for (const id of SUPPORTED_TRANSACTION_TYPE_IDS) {
    assert.equal(supportedTransactionTypeIdSchema.safeParse(id).success, true);
    assert.equal(isSupportedTransactionTypeId(id), true);
  }

  for (const [legacyId, canonicalId] of [
    ["txd4b7kzpn2lmjv6cuqf9s3yw", "expense"],
    ["txp8azr12yckwhv9odnb30elu", "income"],
    ["uo4hd5voxicrkfovkx0bo8xg", "transfer"],
  ] as const) {
    assert.equal(supportedTransactionTypeIdSchema.safeParse(legacyId).success, false);
    assert.equal(transactionTypeInputIdSchema.safeParse(legacyId).success, true);
    assert.equal(canonicalizeTransactionTypeId(legacyId), canonicalId);
    assert.deepEqual(getStoredTransactionTypeIdCandidates(canonicalId), [
      canonicalId,
      legacyId,
    ]);
  }

  for (const unsupportedId of [
    "",
    "Transfer",
    "INCOME",
    "Income",
    "income ",
    "unknown",
  ]) {
    assert.equal(supportedTransactionTypeIdSchema.safeParse(unsupportedId).success, false);
    assert.equal(isSupportedTransactionTypeId(unsupportedId), false);
  }
});

test("amount inference and summary selection use canonical IDs rather than labels", () => {
  assert.equal(getTransactionTypeForAmount(-1).id, "expense");
  assert.equal(getTransactionTypeForAmount(0).id, "income");
  assert.equal(getTransactionTypeForAmount(1).id, "income");
  assert.deepEqual(getSummaryTransactionTypeIds("Income"), ["income"]);
  assert.deepEqual(getSummaryTransactionTypeIds("Expense"), ["expense", "refund"]);
  assert.deepEqual(getSummaryTransactionTypeIds("Refund"), ["refund"]);
  assert.deepEqual(getSummaryTransactionTypeIds("All"), SUPPORTED_TRANSACTION_TYPE_IDS);
  assert.deepEqual(getSummaryStoredTransactionTypeIds("Income"), [
    "income",
    "txp8azr12yckwhv9odnb30elu",
  ]);
  assert.deepEqual(getSummaryStoredTransactionTypeIds("Expense"), [
    "expense",
    "txd4b7kzpn2lmjv6cuqf9s3yw",
    "refund",
  ]);
});

test("Refund and Expense amounts reconcile across normalized balance and summary semantics", () => {
  const income = getTransactionSummaryAmounts("income", -100_000);
  const expense = getTransactionSummaryAmounts("expense", -50_000);
  const refund = getTransactionSummaryAmounts("refund", -20_000);

  assert.deepEqual(income, {
    balanceDelta: 100_000,
    expenses: 0,
    income: 100_000,
  });
  assert.deepEqual(expense, {
    balanceDelta: -50_000,
    expenses: 50_000,
    income: 0,
  });
  assert.deepEqual(refund, {
    balanceDelta: 20_000,
    expenses: -20_000,
    income: 0,
  });
  assert.equal(
    income.balanceDelta + expense.balanceDelta + refund.balanceDelta,
    income.income + expense.income + refund.income - (income.expenses + expense.expenses + refund.expenses),
  );
  assert.equal(normalizeTransactionAmount("expense", 50_000), -50_000);
  assert.equal(normalizeTransactionAmount("refund", -20_000), 20_000);
});

test("Transfer preserves its signed balance effect and stays out of income and expense totals", () => {
  const outgoingTransfer = getTransactionSummaryAmounts("transfer", -12_345);
  const incomingTransfer = getTransactionSummaryAmounts(
    "uo4hd5voxicrkfovkx0bo8xg",
    12_345,
  );

  assert.deepEqual(outgoingTransfer, {
    balanceDelta: -12_345,
    expenses: 0,
    income: 0,
  });
  assert.deepEqual(incomingTransfer, {
    balanceDelta: 12_345,
    expenses: 0,
    income: 0,
  });
  assert.equal(normalizeTransactionAmount("transfer", -12_345), -12_345);
  assert.equal(
    normalizeTransactionAmount("uo4hd5voxicrkfovkx0bo8xg", 12_345),
    12_345,
  );
});

test("currency conversion preserves signed cents through milliunit round-trips", () => {
  for (const [currency, milliunits] of [
    ["12.99", 12_990],
    ["-12.99", -12_990],
    ["0.01", 10],
    ["1000", 1_000_000],
  ] as const) {
    assert.equal(convertAmountToMilliunits(currency), milliunits);
    assert.equal(convertAmountFromMilliunits(milliunits), Number(currency));
    assert.equal(
      convertAmountToMilliunits(convertAmountFromMilliunits(milliunits).toString()),
      milliunits,
    );
  }
});

test("transaction write endpoints reject empty, unknown, and display-label IDs before persistence", async () => {
  for (const transactionTypeId of ["", "unknown", "Transfer"]) {
    await expectInvalidForeignKey(
      await transactionsApp.request("/", {
        body: JSON.stringify({ ...transactionWrite, transactionTypeId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
  }

  await expectInvalidForeignKey(
    await transactionsApp.request("/bulk-create", {
      body: JSON.stringify([{ ...transactionWrite, transactionTypeId: "Transfer" }]),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  await expectInvalidForeignKey(
    await transactionsApp.request("/transaction-1", {
      body: JSON.stringify({ ...transactionWrite, transactionTypeId: "Transfer" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    }),
  );
});

test("CSV import endpoint rejects unsupported transaction type writes", async () => {
  for (const transactionTypeId of ["", "unknown", "Transfer"]) {
    await expectInvalidForeignKey(
      await csvImportApp.request("/import", {
        body: JSON.stringify({
          accountId: "account-1",
          transactions: [{ ...importTransaction, transactionTypeId }],
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
  }
});
