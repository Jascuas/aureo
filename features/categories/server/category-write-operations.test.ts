import assert from "node:assert/strict";
import test from "node:test";

import {
  type CategoryWriteDependencies,
  type CategoryWriteValues,
  createCategoryWriteOperations,
} from "./category-write-operations";

const values: CategoryWriteValues = {
  name: "Rent",
  parentId: "home",
};

const hierarchy = [
  { id: "home", parentId: null },
  { id: "rent", parentId: "home" },
  { id: "utilities", parentId: "home" },
];

const createDependencies = (): CategoryWriteDependencies => ({
  authorizeReferences: async ({ categoryIds = [] }) =>
    categoryIds.every((id) => hierarchy.some((category) => category.id === id))
      ? { ok: true }
      : { ok: false, reason: "not_found" },
  findOwnedHierarchy: async () => hierarchy,
  findOwnedIds: async (_userId, ids) => [...ids],
  findChildIds: async () => [],
  create: async (_userId, categoryValues) => ({
    id: "created",
    name: categoryValues.name,
    parentId: categoryValues.parentId ?? null,
  }),
  update: async (_userId, id, categoryValues) => ({
    id,
    name: categoryValues.name,
    parentId: categoryValues.parentId ?? null,
  }),
  delete: async (_userId, ids) => ids.map((id) => ({ id })),
});

test("creates valid same-user subcategories and allows clearing their parent", async () => {
  const operations = createCategoryWriteOperations(createDependencies());

  assert.deepEqual(await operations.createCategory("user-1", values), {
    ok: true,
    data: { id: "created", name: "Rent", parentId: "home" },
  });
  assert.deepEqual(
    await operations.updateCategory("user-1", "rent", {
      ...values,
      parentId: null,
    }),
    {
      ok: true,
      data: { id: "rent", name: "Rent", parentId: null },
    },
  );
});

test("rejects nonexistent, foreign, self, and cyclic category parents before writing", async () => {
  const dependencies = createDependencies();
  let updateCount = 0;
  dependencies.update = async (_userId, id, categoryValues) => {
    updateCount += 1;
    return { id, name: categoryValues.name, parentId: categoryValues.parentId ?? null };
  };
  const operations = createCategoryWriteOperations(dependencies);

  assert.deepEqual(
    await operations.createCategory("user-1", { ...values, parentId: "foreign" }),
    { ok: false, reason: "not_found" },
  );
  assert.deepEqual(await operations.updateCategory("user-1", "home", values), {
    ok: false,
    reason: "invalid_hierarchy",
  });
  assert.deepEqual(
    await operations.updateCategory("user-1", "home", {
      ...values,
      parentId: "rent",
    }),
    { ok: false, reason: "invalid_hierarchy" },
  );
  assert.equal(updateCount, 0);
});

test("rejects a parent deletion when it would orphan children", async () => {
  const dependencies = createDependencies();
  dependencies.findChildIds = async () => ["rent"];
  const operations = createCategoryWriteOperations(dependencies);

  assert.deepEqual(await operations.deleteCategory("user-1", "home"), {
    ok: false,
    reason: "has_children",
  });
});
