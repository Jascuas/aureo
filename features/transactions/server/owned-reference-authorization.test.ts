import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeOwnedReferences,
  type OwnedReferenceInput,
  type OwnedReferenceLookup,
} from "./owned-reference-authorization.ts";

const lookup: OwnedReferenceLookup = {
  findOwnedAccountIds: async (_userId, ids) =>
    ids.filter((id) => id.startsWith("owned-account")),
  findOwnedCategoryIds: async (_userId, ids) =>
    ids.filter((id) => id.startsWith("owned-category")),
  findTransactionTypeIds: async (ids) =>
    ids.filter((id) => id.startsWith("transaction-type")),
};

const authorize = (input: OwnedReferenceInput) =>
  authorizeOwnedReferences(lookup, input);

const sameUserTransaction = {
  accountIds: ["owned-account-1"],
  categoryIds: ["owned-category-1"],
  transactionTypeIds: ["transaction-type-income"],
  userId: "user-1",
};

const assertAccepted = async (input: OwnedReferenceInput) => {
  assert.deepEqual(await authorize(input), { ok: true });
};

const assertRejected = async (input: OwnedReferenceInput) => {
  assert.deepEqual(await authorize(input), { ok: false, reason: "not_found" });
};

test("transaction create accepts same-user references and rejects cross-user references", async () => {
  await assertAccepted(sameUserTransaction);
  await assertRejected({
    ...sameUserTransaction,
    accountIds: ["foreign-account-2"],
  });
});

test("transaction bulk-create accepts same-user references and rejects cross-user references", async () => {
  await assertAccepted({
    ...sameUserTransaction,
    accountIds: ["owned-account-1", "owned-account-2"],
    categoryIds: ["owned-category-1", "owned-category-2"],
  });
  await assertRejected({
    ...sameUserTransaction,
    accountIds: ["owned-account-1", "foreign-account-2"],
  });
});

test("transaction update accepts same-user references and rejects cross-user references", async () => {
  await assertAccepted(sameUserTransaction);
  await assertRejected({
    ...sameUserTransaction,
    categoryIds: ["foreign-category-2"],
  });
});

test("category parent create and update accept same-user parents and reject foreign or missing parents", async () => {
  await assertAccepted({
    userId: "user-1",
    categoryIds: ["owned-category-1"],
  });
  await assertRejected({
    userId: "user-1",
    categoryIds: ["foreign-category-2"],
  });
  await assertRejected({
    userId: "user-1",
    categoryIds: ["missing-category"],
  });
});

test("template create and update accept same-user accounts and reject cross-user accounts", async () => {
  await assertAccepted({
    userId: "user-1",
    accountIds: ["owned-account-1"],
  });
  await assertRejected({
    userId: "user-1",
    accountIds: ["foreign-account-2"],
  });
});

test("CSV import accepts same-user references and rejects foreign transaction mappings", async () => {
  await assertAccepted(sameUserTransaction);
  await assertRejected({
    ...sameUserTransaction,
    transactionTypeIds: ["foreign-transaction-type"],
  });
});
