import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
import {
  type CategoryHierarchyItem,
  type CategoryHierarchyResult,
  orderCategoryHierarchy,
} from "@/features/categories/lib/category-hierarchy";
import type { CategoryResponse } from "@/features/categories/server/category-write-operations";

export type CategoryListItem = CategoryHierarchyItem;

export type CategoryReadDependencies = {
  list: (userId: string) => Promise<CategoryResponse[]>;
  get: (userId: string, id: string) => Promise<CategoryResponse | undefined>;
  orderHierarchy: (
    categories: readonly CategoryResponse[],
  ) => CategoryHierarchyResult;
};

const categoryProjection = {
  id: categories.id,
  name: categories.name,
  parentId: categories.parentId,
};

const categoryReadDependencies: CategoryReadDependencies = {
  list: (userId) =>
    db
      .select(categoryProjection)
      .from(categories)
      .where(eq(categories.userId, userId)),
  get: async (userId, id) => {
    const [category] = await db
      .select(categoryProjection)
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1);

    return category;
  },
  orderHierarchy: orderCategoryHierarchy,
};

export const createCategoryReadOperations = (
  dependencies: CategoryReadDependencies = categoryReadDependencies,
) => ({
  getCategories: async (userId: string) =>
    dependencies.orderHierarchy(await dependencies.list(userId)),
  getCategory: (userId: string, id: string) => dependencies.get(userId, id),
});

const categoryReadOperations = createCategoryReadOperations();

export const getCategories = categoryReadOperations.getCategories;
export const getCategory = categoryReadOperations.getCategory;
