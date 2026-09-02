import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
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
  | { ok: false; reason: "not_found" };

const categoryProjection = {
  id: categories.id,
  name: categories.name,
  parentId: categories.parentId,
};

export type CategoryWriteDependencies = {
  authorizeReferences: typeof ensureOwnedReferences;
  create: (
    userId: string,
    values: CategoryWriteValues,
  ) => Promise<CategoryResponse>;
  update: (
    userId: string,
    id: string,
    values: CategoryWriteValues,
  ) => Promise<CategoryResponse | undefined>;
};

const categoryWriteDependencies: CategoryWriteDependencies = {
  authorizeReferences: ensureOwnedReferences,
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
};

export const createCategoryWriteOperations = (
  dependencies: CategoryWriteDependencies = categoryWriteDependencies,
) => ({
  createCategory: async (
    userId: string,
    values: CategoryWriteValues,
  ): Promise<CategoryWriteResult> => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      categoryIds:
        values.parentId === null || values.parentId === undefined
          ? []
          : [values.parentId],
    });

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
    const authorization = await dependencies.authorizeReferences({
      userId,
      categoryIds:
        values.parentId === null || values.parentId === undefined
          ? []
          : [values.parentId],
    });

    if (!authorization.ok) {
      return authorization;
    }

    const data = await dependencies.update(userId, id, values);

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    return { ok: true, data };
  },
});

const categoryWriteOperations = createCategoryWriteOperations();

export const createCategory = categoryWriteOperations.createCategory;
export const updateCategory = categoryWriteOperations.updateCategory;
