import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
import {
  type CategoryParentReference,
  validateCategoryParent,
} from "@/features/categories/lib/category-hierarchy";
import { ensureOwnedReferences } from "@/features/transactions/server/owned-references";

export type CategoryWriteValues = Omit<
  InferInsertModel<typeof categories>,
  "id" | "userId"
>;

export type CategoryResponse = {
  id: string;
  name: string;
  parentId: string | null;
};

export type CategoryWriteResult =
  | { ok: true; data: CategoryResponse }
  | { ok: false; reason: "not_found" | "invalid_hierarchy" };

export type CategoryDeleteResult =
  | { ok: true; data: { id: string }[] }
  | { ok: false; reason: "not_found" | "has_children" };

const categoryProjection = {
  id: categories.id,
  name: categories.name,
  parentId: categories.parentId,
};

const categoryIdProjection = {
  id: categories.id,
};

const isForeignKeyViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23503";

export type CategoryWriteDependencies = {
  authorizeReferences: typeof ensureOwnedReferences;
  findOwnedHierarchy: (userId: string) => Promise<CategoryParentReference[]>;
  findOwnedIds: (userId: string, ids: readonly string[]) => Promise<string[]>;
  findChildIds: (
    userId: string,
    parentIds: readonly string[],
    excludedIds: readonly string[],
  ) => Promise<string[]>;
  create: (
    userId: string,
    values: CategoryWriteValues,
  ) => Promise<CategoryResponse>;
  update: (
    userId: string,
    id: string,
    values: CategoryWriteValues,
  ) => Promise<CategoryResponse | undefined>;
  delete: (userId: string, ids: readonly string[]) => Promise<{ id: string }[]>;
};

const categoryWriteDependencies: CategoryWriteDependencies = {
  authorizeReferences: ensureOwnedReferences,
  findOwnedHierarchy: (userId) =>
    db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.userId, userId)),
  findOwnedIds: async (userId, ids) => {
    const rows = await db
      .select(categoryIdProjection)
      .from(categories)
      .where(
        and(eq(categories.userId, userId), inArray(categories.id, [...ids])),
      );

    return rows.map((row) => row.id);
  },
  findChildIds: async (userId, parentIds, excludedIds) => {
    const rows = await db
      .select(categoryIdProjection)
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          inArray(categories.parentId, [...parentIds]),
          notInArray(categories.id, [...excludedIds]),
        ),
      );

    return rows.map((row) => row.id);
  },
  create: async (userId, values) => {
    const [data] = await db
      .insert(categories)
      .values({ id: createId(), userId, ...values })
      .returning(categoryProjection);

    return data;
  },
  update: async (userId, id, values) => {
    const [data] = await db
      .update(categories)
      .set(values)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning(categoryProjection);

    return data;
  },
  delete: (userId, ids) =>
    db
      .delete(categories)
      .where(
        and(eq(categories.userId, userId), inArray(categories.id, [...ids])),
      )
      .returning(categoryIdProjection),
};

const sameIds = (left: readonly string[], right: readonly string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
};

export const createCategoryWriteOperations = (
  dependencies: CategoryWriteDependencies = categoryWriteDependencies,
) => {
  const authorizeParent = async (userId: string, parentId: string | null) => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      categoryIds: parentId === null ? [] : [parentId],
    });

    return authorization;
  };

  const deleteCategories = async (
    userId: string,
    requestedIds: readonly string[],
  ): Promise<CategoryDeleteResult> => {
    const ids = [...new Set(requestedIds)];
    const ownedIds = await dependencies.findOwnedIds(userId, ids);

    if (!sameIds(ids, ownedIds)) {
      return { ok: false, reason: "not_found" };
    }

    const childIds = await dependencies.findChildIds(userId, ids, ids);

    if (childIds.length > 0) {
      return { ok: false, reason: "has_children" };
    }

    try {
      const data = await dependencies.delete(userId, ids);

      if (!sameIds(ids, data.map((category) => category.id))) {
        return { ok: false, reason: "not_found" };
      }

      return { ok: true, data };
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        return { ok: false, reason: "has_children" };
      }

      throw error;
    }
  };

  return {
    createCategory: async (
      userId: string,
      values: CategoryWriteValues,
    ): Promise<CategoryWriteResult> => {
      const authorization = await authorizeParent(userId, values.parentId ?? null);

      if (!authorization.ok) {
        return authorization;
      }

      return { ok: true, data: await dependencies.create(userId, values) };
    },
    updateCategory: async (
      userId: string,
      id: string,
      values: CategoryWriteValues,
    ): Promise<CategoryWriteResult> => {
      const parentId = values.parentId ?? null;
      const authorization = await authorizeParent(userId, parentId);

      if (!authorization.ok) {
        return authorization;
      }

      const parentValidation = validateCategoryParent(
        await dependencies.findOwnedHierarchy(userId),
        id,
        parentId,
      );

      if (!parentValidation.ok) {
        return parentValidation;
      }

      const data = await dependencies.update(userId, id, values);

      if (!data) {
        return { ok: false, reason: "not_found" };
      }

      return { ok: true, data };
    },
    deleteCategory: async (
      userId: string,
      id: string,
    ): Promise<CategoryDeleteResult> => deleteCategories(userId, [id]),
    deleteCategories,
  };
};

const categoryWriteOperations = createCategoryWriteOperations();

export const createCategory = categoryWriteOperations.createCategory;
export const updateCategory = categoryWriteOperations.updateCategory;
export const deleteCategory = categoryWriteOperations.deleteCategory;
export const deleteCategories = categoryWriteOperations.deleteCategories;
