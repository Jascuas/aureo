import assert from "node:assert/strict";
import test from "node:test";

import type { MiddlewareHandler } from "hono";

import { createCsvImportApp } from "../app/api/[[...route]]/csv-import.ts";
import { createTransactionsApp } from "../app/api/[[...route]]/transactions.ts";
import {
  getSummaryTransactionTypeIds,
  getTransactionSummaryAmounts,
  getTransactionTypeForAmount,
  isSupportedTransactionTypeId,
  normalizeTransactionAmount,
  SUPPORTED_TRANSACTION_TYPE_IDS,
  SUPPORTED_TRANSACTION_TYPES,
  supportedTransactionTypeIdSchema,
} from "../features/transaction-types/lib/transaction-types.ts";
import type { AppEnv } from "../lib/hono-env.ts";

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

test("canonical IDs are case-sensitive storage values with canonical display names", () => {
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

  for (const unsupportedId of [
    "",
    "transfer",
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

test("transaction write endpoints reject empty, unknown, and Transfer IDs before persistence", async () => {
  for (const transactionTypeId of ["", "unknown", "transfer", "Transfer"]) {
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
      body: JSON.stringify({ ...transactionWrite, transactionTypeId: "transfer" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    }),
  );
});

test("CSV categorization and import endpoints reject unsupported historical hints and writes", async () => {
  await expectInvalidForeignKey(
    await csvImportApp.request("/categorize", {
      body: JSON.stringify({
        transactions: [
          {
            amount: -50_000,
            csvRowIndex: 0,
            date: "2026-09-02T00:00:00.000Z",
            historicalHint: {
              categoryId: "category-1",
              confidence: 1,
              matchCount: 3,
              matchType: "exact",
              transactionTypeId: "Transfer",
            },
            payee: "Example payee",
          },
        ],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  for (const transactionTypeId of ["", "unknown", "transfer", "Transfer"]) {
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
