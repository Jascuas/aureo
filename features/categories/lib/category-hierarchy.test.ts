import assert from "node:assert/strict";
import test from "node:test";

import {
  orderCategoryHierarchy,
  validateCategoryParent,
} from "./category-hierarchy.ts";

const categories = [
  { id: "rent", name: "Rent", parentId: "home" },
  { id: "food", name: "Food", parentId: null },
  { id: "utilities", name: "Utilities", parentId: "home" },
  { id: "home", name: "Home", parentId: null },
] as const;

test("orders category rows depth-first with deterministic sibling order and depth", () => {
  const result = orderCategoryHierarchy(categories);

  assert.deepEqual(result, {
    ok: true,
    data: [
      { id: "food", name: "Food", parentId: null, parentName: null, depth: 0 },
      { id: "home", name: "Home", parentId: null, parentName: null, depth: 0 },
      { id: "rent", name: "Rent", parentId: "home", parentName: "Home", depth: 1 },
      {
        id: "utilities",
        name: "Utilities",
        parentId: "home",
        parentName: "Home",
        depth: 1,
      },
    ],
  });
});

test("rejects dangling, self-referential, and cyclic persisted hierarchies", () => {
  assert.deepEqual(
    orderCategoryHierarchy([{ id: "orphan", name: "Orphan", parentId: "missing" }]),
    { ok: false, reason: "invalid_hierarchy" },
  );
  assert.deepEqual(
    orderCategoryHierarchy([{ id: "self", name: "Self", parentId: "self" }]),
    { ok: false, reason: "invalid_hierarchy" },
  );
  assert.deepEqual(
    orderCategoryHierarchy([
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ]),
    { ok: false, reason: "invalid_hierarchy" },
  );
});

test("rejects self and descendant parents while allowing parent clearing", () => {
  assert.deepEqual(validateCategoryParent(categories, "home", "home"), {
    ok: false,
    reason: "invalid_hierarchy",
  });
  assert.deepEqual(validateCategoryParent(categories, "home", "rent"), {
    ok: false,
    reason: "invalid_hierarchy",
  });
  assert.deepEqual(validateCategoryParent(categories, "rent", null), { ok: true });
  assert.deepEqual(validateCategoryParent(categories, "rent", "missing"), {
    ok: false,
    reason: "not_found",
  });
});
