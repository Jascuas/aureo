import assert from "node:assert/strict";
import test from "node:test";

import {
  type CategoryResponse,
  type CategoryWriteValues,
  createCategoryWriteOperations,
} from "@/features/categories/server/category-write-operations";
import {
  createCsvImportWriteOperations,
  type ImportTemplateResponse,
  type ImportTemplateWriteValues,
  type ImportTransactionInput,
} from "@/features/csv-import/server/csv-import-write-operations";
import { isSupportedTransactionTypeId } from "@/features/transaction-types/lib/transaction-types";

import {
  authorizeOwnedReferences,
  type OwnedReferenceAuthorization,
  type OwnedReferenceInput,
  type OwnedReferenceLookup,
} from "./owned-reference-authorization.ts";
import {
  createTransactionWriteOperations,
  type TransactionResponse,
  type TransactionWriteValues,
} from "./transaction-write-operations";

const notFound = { ok: false, reason: "not_found" } as const;

const lookup: OwnedReferenceLookup = {
  findOwnedAccountIds: async (_userId, ids) =>
    ids.filter((id) => id.startsWith("owned-account")),
  findOwnedCategoryIds: async (_userId, ids) =>
    ids.filter((id) => id.startsWith("owned-category")),
  findTransactionTypeIds: async (ids) =>
    ids.filter(isSupportedTransactionTypeId),
};

const authorize = (input: OwnedReferenceInput) =>
  authorizeOwnedReferences(lookup, input);

const sameUserTransaction: TransactionWriteValues = {
  accountId: "owned-account-1",
  amount: 1_000,
  categoryId: "owned-category-1",
  date: new Date("2026-09-02T00:00:00.000Z"),
  notes: null,
  payee: "Same user payee",
  transactionTypeId: "income",
};

const sameUserCategory: CategoryWriteValues = {
  name: "Same user category",
  parentId: "owned-category-1",
};

const sameUserTemplate: ImportTemplateWriteValues = {
  accountId: "owned-account-1",
  amountFormat: {
    decimalSeparator: ".",
    isNegativeExpense: true,
    thousandsSeparator: ",",
  },
  columnMapping: { amount: 1, date: 0 },
  dateFormat: "yyyy-MM-dd",
  name: "Same user template",
};

const sameUserImport: ImportTransactionInput[] = [
  {
    amount: 1_000,
    categoryId: "owned-category-1",
    csvRowIndex: 0,
    date: new Date("2026-09-02T00:00:00.000Z"),
    idempotencyKey: "import-row-0",
    notes: null,
    payee: "Imported same user payee",
    transactionTypeId: "income",
  },
];

const ownedReferenceAuthorizer = async (
  input: OwnedReferenceInput,
): Promise<OwnedReferenceAuthorization> => {
  const ids = [
    ...(input.accountIds ?? []),
    ...(input.categoryIds ?? []),
    ...(input.transactionTypeIds ?? []),
  ];

  return ids.every(
    (id) =>
      id !== null &&
      id !== undefined &&
      (id.startsWith("owned-") || isSupportedTransactionTypeId(id)),
  )
    ? { ok: true }
    : notFound;
};

const transactionResponse = (
  values: TransactionWriteValues,
): TransactionResponse => ({
  accountId: values.accountId,
  amount: values.amount,
  categoryId: values.categoryId ?? null,
  date: values.date,
  id: "transaction-1",
  notes: values.notes ?? null,
  payee: values.payee,
  transactionTypeId: values.transactionTypeId,
});

const categoryResponse = (values: CategoryWriteValues): CategoryResponse => ({
  id: "category-1",
  name: values.name,
  parentId: values.parentId ?? null,
});

const templateResponse = (
  values: ImportTemplateWriteValues,
): ImportTemplateResponse => ({
  accountId: values.accountId,
  amountFormat: {
    decimalSeparator: ".",
    isNegativeExpense: true,
    thousandsSeparator: ",",
  },
  columnMapping: { amount: 1, date: 0 },
  createdAt: new Date("2026-09-02T00:00:00.000Z"),
  dateFormat: "YYYY-MM-DD",
  id: "template-1",
  name: values.name,
  updatedAt: new Date("2026-09-02T00:00:00.000Z"),
});

test("the shared helper rejects empty, missing, and foreign references", async () => {
  assert.deepEqual(
    await authorize({
      accountIds: [""],
      userId: "user-1",
    }),
    notFound,
  );
  assert.deepEqual(
    await authorize({
      categoryIds: ["missing-category"],
      userId: "user-1",
    }),
    notFound,
  );
  assert.deepEqual(
    await authorize({
      transactionTypeIds: ["foreign-transaction-type"],
      userId: "user-1",
    }),
    notFound,
  );
});

test("transaction create, bulk-create, and update authorize references before writing", async () => {
  const writes = { create: 0, createMany: 0, update: 0 };
  const operations = createTransactionWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    create: async (values) => {
      writes.create += 1;
      return transactionResponse(values);
    },
    createMany: async (values) => {
      writes.createMany += 1;
      return values.map(transactionResponse);
    },
    update: async (_userId, _id, values) => {
      writes.update += 1;
      return transactionResponse(values);
    },
    delete: async (_userId, id) => ({ id }),
    deleteMany: async (_userId, ids) => ids.map((id) => ({ id })),
  });

  assert.equal(
    (await operations.createTransaction("user-1", sameUserTransaction)).ok,
    true,
  );
  assert.equal(writes.create, 1);
  assert.deepEqual(
    await operations.createTransaction("user-1", {
      ...sameUserTransaction,
      accountId: "foreign-account-2",
    }),
    notFound,
  );
  assert.equal(writes.create, 1);

  assert.equal(
    (
      await operations.createTransactions("user-1", [
        sameUserTransaction,
        { ...sameUserTransaction, accountId: "owned-account-2" },
      ])
    ).ok,
    true,
  );
  assert.equal(writes.createMany, 1);
  assert.deepEqual(
    await operations.createTransactions("user-1", [
      sameUserTransaction,
      { ...sameUserTransaction, categoryId: "foreign-category-2" },
    ]),
    notFound,
  );
  assert.equal(writes.createMany, 1);

  assert.equal(
    (await operations.updateTransaction("user-1", "transaction-1", sameUserTransaction))
      .ok,
    true,
  );
  assert.equal(writes.update, 1);
  assert.equal(
    (
      await operations.updateTransaction("user-1", "transaction-1", {
        ...sameUserTransaction,
        transactionTypeId: "expense",
      })
    ).ok,
    true,
  );
  assert.equal(writes.update, 2);
});

test("transaction writes discard import idempotency keys before persistence", async () => {
  const persistedValues: TransactionWriteValues[] = [];
  const operations = createTransactionWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    create: async (values) => {
      persistedValues.push(values);
      return transactionResponse(values);
    },
    createMany: async (values) => {
      persistedValues.push(...values);
      return values.map(transactionResponse);
    },
    update: async (_userId, _id, values) => {
      persistedValues.push(values);
      return transactionResponse(values);
    },
    delete: async (_userId, id) => ({ id }),
    deleteMany: async (_userId, ids) => ids.map((id) => ({ id })),
  });
  const compromisedValues = {
    ...sameUserTransaction,
    importKey: "attempt-probe:0",
  };

  await operations.createTransaction("user-1", compromisedValues);
  await operations.createTransactions("user-1", [compromisedValues]);
  await operations.updateTransaction("user-1", "transaction-1", compromisedValues);

  assert.equal(persistedValues.length, 3);
  assert.equal(
    persistedValues.every((values) => !Object.hasOwn(values, "importKey")),
    true,
  );
});

test("category create and update reject foreign or empty parent references before writing", async () => {
  const writes = { create: 0, update: 0 };
  const operations = createCategoryWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    findOwnedHierarchy: async () => [
      { id: "category-1", parentId: null },
      { id: "owned-category-1", parentId: null },
    ],
    findOwnedIds: async (_userId, ids) => [...ids],
    findChildIds: async () => [],
    create: async (_userId, values) => {
      writes.create += 1;
      return categoryResponse(values);
    },
    update: async (_userId, _id, values) => {
      writes.update += 1;
      return categoryResponse(values);
    },
    delete: async (_userId, ids) => ids.map((id) => ({ id })),
  });

  assert.equal((await operations.createCategory("user-1", sameUserCategory)).ok, true);
  assert.equal(writes.create, 1);
  assert.deepEqual(
    await operations.createCategory("user-1", {
      ...sameUserCategory,
      parentId: "foreign-category-2",
    }),
    notFound,
  );
  assert.equal(writes.create, 1);

  assert.equal(
    (await operations.updateCategory("user-1", "category-1", sameUserCategory)).ok,
    true,
  );
  assert.equal(writes.update, 1);
  assert.deepEqual(
    await operations.updateCategory("user-1", "category-1", {
      ...sameUserCategory,
      parentId: "",
    }),
    notFound,
  );
  assert.equal(writes.update, 1);
});

test("template create and update reject foreign or empty account references before writing", async () => {
  const writes = { create: 0, update: 0 };
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => {
      writes.create += 1;
      return templateResponse(values);
    },
    deleteTemplate: async () => undefined,
    findExistingTransaction: async () => false,
    findOwnedCategoryIds: async (_userId, ids) =>
      ids.filter((id) => id.startsWith("owned-category")),
    insertTransaction: async () => "inserted",
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) => {
      writes.update += 1;
      return templateResponse({ ...sameUserTemplate, ...values });
    },
  });

  assert.equal(
    (await operations.createImportTemplate("user-1", sameUserTemplate)).ok,
    true,
  );
  assert.equal(writes.create, 1);
  assert.deepEqual(
    await operations.createImportTemplate("user-1", {
      ...sameUserTemplate,
      accountId: "foreign-account-2",
    }),
    notFound,
  );
  assert.equal(writes.create, 1);

  assert.equal(
    (await operations.updateImportTemplate("user-1", "template-1", sameUserTemplate))
      .ok,
    true,
  );
  assert.equal(writes.update, 1);
  assert.deepEqual(
    await operations.updateImportTemplate("user-1", "template-1", {
      accountId: "",
    }),
    notFound,
  );
  assert.equal(writes.update, 1);
});

test("CSV import rejects foreign accounts, categories, and transaction types before writing", async () => {
  let writes = 0;
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => templateResponse(values),
    deleteTemplate: async () => undefined,
    findExistingTransaction: async () => false,
    findOwnedCategoryIds: async (_userId, ids) =>
      ids.filter((id) => id.startsWith("owned-category")),
    insertTransaction: async () => {
      writes += 1;
      return "inserted";
    },
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) =>
      templateResponse({ ...sameUserTemplate, ...values }),
  });

  assert.equal(
    (await operations.importTransactions("user-1", "owned-account-1", sameUserImport))
      .ok,
    true,
  );
  assert.equal(writes, 1);

  assert.deepEqual(
    await operations.importTransactions("user-1", "foreign-account-2", sameUserImport),
    notFound,
  );
  assert.deepEqual(
    await operations.importTransactions("user-1", "owned-account-1", [
      { ...sameUserImport[0], categoryId: "foreign-category-2" },
    ]),
    {
      data: {
        outcomes: [
          {
            csvRowIndex: 0,
            reason: "La categoría seleccionada no está disponible.",
            status: "failed",
          },
        ],
        summary: { duplicate: 0, failed: 1, imported: 0 },
      },
      ok: true,
    },
  );
  assert.equal(
    (
      await operations.importTransactions("user-1", "owned-account-1", [
        { ...sameUserImport[0], transactionTypeId: "refund" },
      ])
    ).ok,
    true,
  );
  assert.equal(writes, 2);
});

test("CSV import returns one idempotent outcome per row and normalizes expense duplicates", async () => {
  const insertedAmounts: number[] = [];
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => templateResponse(values),
    deleteTemplate: async () => undefined,
    findExistingTransaction: async (_accountId, values) => values.amount === -2_000,
    findOwnedCategoryIds: async (_userId, ids) => ids,
    insertTransaction: async (_accountId, values) => {
      if (values.payee === "Fails") throw new Error("storage failure");
      insertedAmounts.push(values.amount);
      return "inserted";
    },
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) =>
      templateResponse({ ...sameUserTemplate, ...values }),
  });

  const result = await operations.importTransactions("user-1", "owned-account-1", [
    {
      ...sameUserImport[0],
      amount: 2_000,
      csvRowIndex: 2,
      payee: "Existing expense",
      transactionTypeId: "expense",
    },
    { ...sameUserImport[0], csvRowIndex: 3, payee: "Inserted" },
    { ...sameUserImport[0], csvRowIndex: 4, payee: "Inserted" },
    { ...sameUserImport[0], csvRowIndex: 5, payee: "Fails" },
  ]);

  assert.deepEqual(result, {
    data: {
      outcomes: [
        {
          csvRowIndex: 2,
          reason: "Ya existe una transacción idéntica en esta cuenta.",
          status: "duplicate",
        },
        { csvRowIndex: 3, status: "imported" },
        {
          csvRowIndex: 4,
          reason: "Ya existe una transacción idéntica en esta cuenta.",
          status: "duplicate",
        },
        {
          csvRowIndex: 5,
          reason: "No se ha podido guardar esta fila.",
          status: "failed",
        },
      ],
      summary: { duplicate: 2, failed: 1, imported: 1 },
    },
    ok: true,
  });
  assert.deepEqual(insertedAmounts, [1_000]);
});

test("CSV import propagates unavailable duplicate detection", async () => {
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => templateResponse(values),
    deleteTemplate: async () => undefined,
    findExistingTransaction: async () => {
      throw new Error("database unavailable");
    },
    findOwnedCategoryIds: async (_userId, ids) => ids,
    insertTransaction: async () => "inserted",
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) =>
      templateResponse({ ...sameUserTemplate, ...values }),
  });

  await assert.rejects(
    operations.importTransactions("user-1", "owned-account-1", sameUserImport),
    /database unavailable/,
  );
});

test("CSV import uses an atomic row idempotency key for concurrent retries", async () => {
  const insertedKeys = new Set<string>();
  let writes = 0;
  let checks = 0;
  let releaseFindExisting: () => void = () => {};
  const bothChecksComplete = new Promise<void>((resolve) => {
    releaseFindExisting = resolve;
  });
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => templateResponse(values),
    deleteTemplate: async () => undefined,
    findExistingTransaction: async () => {
      checks += 1;
      if (checks === 2) releaseFindExisting();
      await bothChecksComplete;
      return false;
    },
    findOwnedCategoryIds: async (_userId, ids) => ids,
    insertTransaction: async (_accountId, _values, importKey) => {
      if (insertedKeys.has(importKey)) return "already_imported";
      insertedKeys.add(importKey);
      writes += 1;
      return "inserted";
    },
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) =>
      templateResponse({ ...sameUserTemplate, ...values }),
  });
  const retryRow = { ...sameUserImport[0], idempotencyKey: "concurrent-retry" };

  const results = await Promise.all([
    operations.importTransactions("user-1", "owned-account-1", [retryRow]),
    operations.importTransactions("user-1", "owned-account-1", [retryRow]),
  ]);

  assert.equal(writes, 1);
  assert.deepEqual(
    results
      .map((result) => (result.ok ? result.data.outcomes[0].status : "not_found"))
      .sort(),
    ["duplicate", "imported"],
  );
});

test("CSV import honors an explicit duplicate import resolution", async () => {
  let writes = 0;
  const operations = createCsvImportWriteOperations({
    authorizeReferences: ownedReferenceAuthorizer,
    createTemplate: async (_userId, values) => templateResponse(values),
    deleteTemplate: async () => undefined,
    findExistingTransaction: async () => true,
    findOwnedCategoryIds: async (_userId, ids) => ids,
    insertTransaction: async () => {
      writes += 1;
      return "inserted";
    },
    listTemplates: async () => [],
    updateTemplate: async (_userId, _id, values) =>
      templateResponse({ ...sameUserTemplate, ...values }),
  });

  const result = await operations.importTransactions("user-1", "owned-account-1", [
    sameUserImport[0],
    {
      ...sameUserImport[0],
      csvRowIndex: 1,
      duplicateResolution: "import",
      idempotencyKey: "duplicate-import-override",
    },
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(writes, 1);
  assert.deepEqual(
    result.data.outcomes.map((outcome) => outcome.status),
    ["duplicate", "imported"],
  );
});