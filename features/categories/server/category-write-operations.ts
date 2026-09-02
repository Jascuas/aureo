import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
import { ensureOwnedReferences } from "@/features/transactions/server/owned-references";

type CategoryWriteValues = Omit<
  InferInsertModel<typeof categories>,
  "id" | "userId"
>;

type CategoryResponse = {
  id: string;
  name: string;
  parentId: string | null;
};

type CategoryWriteResult =
  | { ok: true; data: CategoryResponse }
  | { ok: false; reason: "not_found" };

const categoryProjection = {
  id: categories.id,
  name: categories.name,
  parentId: categories.parentId,
};

const authorizeParentCategory = (userId: string, parentId?: string | null) =>
  ensureOwnedReferences({
    userId,
    categoryIds: parentId ? [parentId] : [],
  });

export const createCategory = async (
  userId: string,
  values: CategoryWriteValues,
): Promise<CategoryWriteResult> => {
  const authorization = await authorizeParentCategory(userId, values.parentId);

  if (!authorization.ok) {
    return authorization;
  }

  const [data] = await db
    .insert(categories)
    .values({ id: createId(), userId, ...values })
    .returning(categoryProjection);

  return { ok: true, data };
};

export const updateCategory = async (
  userId: string,
  id: string,
  values: CategoryWriteValues,
): Promise<CategoryWriteResult> => {
  const authorization = await authorizeParentCategory(userId, values.parentId);

  if (!authorization.ok) {
    return authorization;
  }

  const [data] = await db
    .update(categories)
    .set(values)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning(categoryProjection);

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, data };
};
