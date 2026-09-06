import assert from "node:assert/strict";
import test from "node:test";

import { getDateRange, getExclusiveEndDate } from "@/lib/date-range";

import {
  createTransactionListOperations,
  type TransactionListItem,
} from "../server/transaction-list-operations";
import {
  transactionIdsSchema,
  transactionListQuerySchema,
} from "./transaction-list-input.ts";

const sameDayTransactions: TransactionListItem[] = [
  {
    account: "Primary account",
    accountId: "account-1",
    amount: 3_000,
    category: null,
    categoryId: null,
    date: new Date("2026-03-31T12:00:00.000Z"),
    id: "transaction-c",
    notes: null,
    payee: "Payee C",
    transactionTypeId: "income",
  },
  {
    account: "Primary account",
    accountId: "account-1",
    amount: 2_000,
    category: null,
    categoryId: null,
    date: new Date("2026-03-31T12:00:00.000Z"),
    id: "transaction-b",
    notes: null,
    payee: "Payee B",
    transactionTypeId: "income",
  },
  {
    account: "Primary account",
    accountId: "account-1",
    amount: 1_000,
    category: null,
    categoryId: null,
    date: new Date("2026-03-31T12:00:00.000Z"),
    id: "transaction-a",
    notes: null,
    payee: "Payee A",
    transactionTypeId: "income",
  },
];

test("transaction list input rejects malformed cursors, date ranges, and invalid limits", () => {
  assert.equal(
    transactionListQuerySchema.safeParse({ cursor: "not-json" }).success,
    false,
  );
  assert.equal(
    transactionListQuerySchema.safeParse({
      cursor: JSON.stringify({ date: "not-an-instant", id: "transaction-1" }),
    }).success,
    false,
  );
  assert.equal(
    transactionListQuerySchema.safeParse({
      from: "2026-04-01",
      to: "2026-03-31",
    }).success,
    false,
  );
  assert.equal(
    transactionListQuerySchema.safeParse({ from: "2026-02-30" }).success,
    false,
  );
  assert.equal(transactionListQuerySchema.safeParse({ limit: "1.5" }).success, false);
  assert.equal(transactionListQuerySchema.safeParse({ limit: "101" }).success, false);
});

test("transaction date bounds include the complete Europe/Madrid final day across DST", () => {
  assert.deepEqual(
    getDateRange({ from: "2026-03-29", to: "2026-03-29" }),
    {
      endDate: new Date("2026-03-29T21:59:59.999Z"),
      startDate: new Date("2026-03-28T23:00:00.000Z"),
    },
  );
  assert.deepEqual(
    getDateRange({ from: "2026-10-25", to: "2026-10-25" }),
    {
      endDate: new Date("2026-10-25T22:59:59.999Z"),
      startDate: new Date("2026-10-24T22:00:00.000Z"),
    },
  );
  assert.deepEqual(
    getExclusiveEndDate(new Date("2026-03-29T21:59:59.999Z")),
    new Date("2026-03-29T22:00:00.000Z"),
  );
});

test("bulk transaction IDs are required and bounded", () => {
  assert.equal(transactionIdsSchema.safeParse([]).success, false);
  assert.equal(transactionIdsSchema.safeParse([""]).success, false);
  assert.equal(
    transactionIdsSchema.safeParse(Array.from({ length: 101 }, (_, index) => `id-${index}`))
      .success,
    false,
  );
  assert.deepEqual(transactionIdsSchema.parse(["transaction-1"]), ["transaction-1"]);
});

test("cursor pages continue below the descending date and ID tie-break", async () => {
  const operations = createTransactionListOperations({
    findById: async () => undefined,
    list: async (_userId, input) =>
      input.cursor?.id === "transaction-b"
        ? [sameDayTransactions[2]]
        : sameDayTransactions,
  });
  const input = transactionListQuerySchema.parse({ limit: "2" });
  const firstPage = await operations.listTransactions("user-1", input);

  assert.deepEqual(
    firstPage.data.map((transaction) => transaction.id),
    ["transaction-c", "transaction-b"],
  );
  assert.equal(firstPage.hasMore, true);
  assert.equal(firstPage.data.every((transaction) => transaction.transactionTypeId === "income"), true);

  const secondPage = await operations.listTransactions(
    "user-1",
    transactionListQuerySchema.parse({ cursor: firstPage.nextCursor, limit: "2" }),
  );

  assert.deepEqual(secondPage.data.map((transaction) => transaction.id), ["transaction-a"]);
  assert.equal(secondPage.hasMore, false);
  assert.equal(secondPage.nextCursor, null);
});
