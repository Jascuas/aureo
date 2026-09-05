export type CategoryParentReference = {
  id: string;
  parentId: string | null;
};

export type CategoryHierarchyRecord = CategoryParentReference & {
  name: string;
};

export type CategoryHierarchyItem = CategoryHierarchyRecord & {
  depth: number;
  parentName: string | null;
};

export type CategoryHierarchyResult =
  | { ok: true; data: CategoryHierarchyItem[] }
  | { ok: false; reason: "invalid_hierarchy" };

export type CategoryParentValidationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid_hierarchy" };

const compareCategories = (
  left: CategoryHierarchyRecord,
  right: CategoryHierarchyRecord,
) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

export const validateCategoryParent = (
  categories: readonly CategoryParentReference[],
  categoryId: string,
  parentId: string | null,
): CategoryParentValidationResult => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  if (!categoriesById.has(categoryId)) {
    return { ok: false, reason: "not_found" };
  }

  if (parentId === null) {
    return { ok: true };
  }

  let currentId: string | null = parentId;
  const visitedIds = new Set<string>();

  while (currentId !== null) {
    if (currentId === categoryId || visitedIds.has(currentId)) {
      return { ok: false, reason: "invalid_hierarchy" };
    }

    visitedIds.add(currentId);
    const current = categoriesById.get(currentId);

    if (!current) {
      return { ok: false, reason: "not_found" };
    }

    currentId = current.parentId;
  }

  return { ok: true };
};

export const orderCategoryHierarchy = (
  categories: readonly CategoryHierarchyRecord[],
): CategoryHierarchyResult => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  if (categoriesById.size !== categories.length) {
    return { ok: false, reason: "invalid_hierarchy" };
  }

  const stateById = new Map<string, "visiting" | "visited">();

  for (const category of categories) {
    if (stateById.get(category.id) === "visited") {
      continue;
    }

    const path: CategoryHierarchyRecord[] = [];
    let current: CategoryHierarchyRecord | undefined = category;

    while (current) {
      const state = stateById.get(current.id);

      if (state === "visiting") {
        return { ok: false, reason: "invalid_hierarchy" };
      }

      if (state === "visited") {
        break;
      }

      stateById.set(current.id, "visiting");
      path.push(current);

      if (current.parentId === null) {
        break;
      }

      current = categoriesById.get(current.parentId);

      if (!current) {
        return { ok: false, reason: "invalid_hierarchy" };
      }
    }

    for (const visitedCategory of path) {
      stateById.set(visitedCategory.id, "visited");
    }
  }

  const childrenByParentId = new Map<string | null, CategoryHierarchyRecord[]>();

  for (const category of categories) {
    const children = childrenByParentId.get(category.parentId) ?? [];
    children.push(category);
    childrenByParentId.set(category.parentId, children);
  }

  const hierarchy: CategoryHierarchyItem[] = [];
  const stack = (childrenByParentId.get(null) ?? [])
    .sort(compareCategories)
    .reverse()
    .map((category) => ({ category, depth: 0 }));

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const parent =
      current.category.parentId === null
        ? null
        : categoriesById.get(current.category.parentId);

    hierarchy.push({
      ...current.category,
      depth: current.depth,
      parentName: parent?.name ?? null,
    });

    const children = (childrenByParentId.get(current.category.id) ?? [])
      .sort(compareCategories)
      .reverse();

    for (const child of children) {
      stack.push({ category: child, depth: current.depth + 1 });
    }
  }

  return { ok: true, data: hierarchy };
};
