import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { importTemplates, transactions } from "@/db/schema";
import { ensureOwnedReferences } from "@/features/transactions/server/owned-references";

type ImportTemplateWriteValues = Omit<
  InferInsertModel<typeof importTemplates>,
  "createdAt" | "id" | "updatedAt" | "userId"
>;

type ImportTransactionValues = Omit<
  InferInsertModel<typeof transactions>,
  "accountId" | "id"
>;

type ImportTemplateResponse = {
  accountId: string;
  amountFormat: unknown;
  columnMapping: unknown;
  createdAt: Date;
  dateFormat: string;
  id: string;
  name: string;
  updatedAt: Date;
};

type ImportTemplateWriteResult =
  | { ok: true; data: ImportTemplateResponse }
  | { ok: false; reason: "not_found" };

type ImportTransactionsResult =
  | {
      ok: true;
      data: { errors: []; imported: number; skipped: number };
    }
  | { ok: false; reason: "not_found" };

const templateProjection = {
  accountId: importTemplates.accountId,
  amountFormat: importTemplates.amountFormat,
  columnMapping: importTemplates.columnMapping,
  createdAt: importTemplates.createdAt,
  dateFormat: importTemplates.dateFormat,
  id: importTemplates.id,
  name: importTemplates.name,
  updatedAt: importTemplates.updatedAt,
};

export const createImportTemplate = async (
  userId: string,
  values: ImportTemplateWriteValues,
): Promise<ImportTemplateWriteResult> => {
  const authorization = await ensureOwnedReferences({
    userId,
    accountIds: [values.accountId],
  });

  if (!authorization.ok) {
    return authorization;
  }

  const [data] = await db
    .insert(importTemplates)
    .values({ id: createId(), userId, ...values })
    .returning(templateProjection);

  return { ok: true, data };
};

export const updateImportTemplate = async (
  userId: string,
  id: string,
  values: Partial<ImportTemplateWriteValues>,
): Promise<ImportTemplateWriteResult> => {
  const authorization = await ensureOwnedReferences({
    userId,
    accountIds: values.accountId ? [values.accountId] : [],
  });

  if (!authorization.ok) {
    return authorization;
  }

  const [data] = await db
    .update(importTemplates)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)))
    .returning(templateProjection);

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, data };
};

export const importTransactions = async (
  userId: string,
  accountId: string,
  values: ImportTransactionValues[],
): Promise<ImportTransactionsResult> => {
  const authorization = await ensureOwnedReferences({
    userId,
    accountIds: [accountId],
    categoryIds: values.map((value) => value.categoryId),
    transactionTypeIds: values.map((value) => value.transactionTypeId),
  });

  if (!authorization.ok) {
    return authorization;
  }

  const inserted = await db
    .insert(transactions)
    .values(
      values.map((value) => ({
        id: createId(),
        accountId,
        ...value,
      })),
    )
    .returning({ id: transactions.id });

  return {
    ok: true,
    data: {
      errors: [],
      imported: inserted.length,
      skipped: 0,
    },
  };
};
