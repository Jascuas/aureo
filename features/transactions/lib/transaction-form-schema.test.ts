import assert from "node:assert/strict";
import test from "node:test";

import { accountFormSchema } from "@/features/accounts/lib/account-form-schema";
import { categoryFormSchema } from "@/features/categories/lib/category-form-schema";

import {
  transactionFormSchema,
  transactionMutationSchema,
} from "./transaction-form-schema";

test("CRUD form schemas reject blank names and invalid transaction form values", () => {
  assert.equal(accountFormSchema.safeParse({ name: "   " }).success, false);
  assert.equal(categoryFormSchema.safeParse({ name: "\t" }).success, false);

  assert.equal(
    transactionFormSchema.safeParse({
      accountId: "",
      amount: "0",
      categoryId: null,
      date: new Date("2026-08-12"),
      notes: "",
      payee: " ",
      transactionTypeId: "",
    }).success,
    false,
  );
});

test("transaction mutation values use the API date-string contract", () => {
  const result = transactionMutationSchema.safeParse({
    accountId: "account-1",
    amount: 12_345,
    categoryId: "category-1",
    date: "2026-08-12",
    notes: "",
    payee: "Mercado",
    transactionTypeId: "expense",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.date, "2026-08-12");
  }
});
