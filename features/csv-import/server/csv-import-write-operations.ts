import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { importTemplates, transactions } from "@/db/schema";
import {
  normalizeTransactionAmount,
  type SupportedTransactionTypeId,
} from "@/features/transaction-types/lib/transaction-types";
import { ensureOwnedReferences } from "@/features/transactions/server/owned-references";

export type ImportTemplateWriteValues = Omit<
  InferInsertModel<typeof importTemplates>,
  "createdAt" | "id" | "updatedAt" | "userId"
>;

export type ImportTransactionValues = Omit<
  InferInsertModel<typeof transactions>,
  "accountId" | "id" | "transactionTypeId"
> & {
  transactionTypeId: SupportedTransactionTypeId;
};

export type ImportTemplateResponse = {
  accountId: string;
  amountFormat: unknown;
  columnMapping: unknown;
  createdAt: Date;
  dateFormat: string;
  id: string;
  name: string;
  updatedAt: Date;
};

export type ImportTemplateWriteResult =
  | { ok: true; data: ImportTemplateResponse }
  | { ok: false; reason: "not_found" };

export type ImportTransactionsResult =
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

const normalizeImportTransactionValues = (
  values: ImportTransactionValues,
): ImportTransactionValues => ({
  ...values,
  amount: normalizeTransactionAmount(values.transactionTypeId, values.amount),
});

export type CsvImportWriteDependencies = {
  authorizeReferences: typeof ensureOwnedReferences;
  createTemplate: (
    userId: string,
    values: ImportTemplateWriteValues,
  ) => Promise<ImportTemplateResponse>;
  updateTemplate: (
    userId: string,
    id: string,
    values: Partial<ImportTemplateWriteValues>,
  ) => Promise<ImportTemplateResponse | undefined>;
  insertTransactions: (
    accountId: string,
    values: ImportTransactionValues[],
  ) => Promise<number>;
};

const csvImportWriteDependencies: CsvImportWriteDependencies = {
  authorizeReferences: ensureOwnedReferences,
  createTemplate: async (userId, values) => {
    const [data] = await db
      .insert(importTemplates)
      .values({ id: createId(), userId, ...values })
      .returning(templateProjection);

    return data;
  },
  updateTemplate: async (userId, id, values) => {
    const [data] = await db
      .update(importTemplates)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)))
      .returning(templateProjection);

    return data;
  },
  insertTransactions: async (accountId, values) => {
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

    return inserted.length;
  },
};

export const createCsvImportWriteOperations = (
  dependencies: CsvImportWriteDependencies = csvImportWriteDependencies,
) => ({
  createImportTemplate: async (
    userId: string,
    values: ImportTemplateWriteValues,
  ): Promise<ImportTemplateWriteResult> => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      accountIds: [values.accountId],
    });

    if (!authorization.ok) {
      return authorization;
    }

    return {
      ok: true,
      data: await dependencies.createTemplate(userId, values),
    };
  },
  updateImportTemplate: async (
    userId: string,
    id: string,
    values: Partial<ImportTemplateWriteValues>,
  ): Promise<ImportTemplateWriteResult> => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      accountIds: values.accountId === undefined ? [] : [values.accountId],
    });

    if (!authorization.ok) {
      return authorization;
    }

    const data = await dependencies.updateTemplate(userId, id, values);

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    return { ok: true, data };
  },
  importTransactions: async (
    userId: string,
    accountId: string,
    values: ImportTransactionValues[],
  ): Promise<ImportTransactionsResult> => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      accountIds: [accountId],
      categoryIds: values.map((value) => value.categoryId),
      transactionTypeIds: values.map((value) => value.transactionTypeId),
    });

    if (!authorization.ok) {
      return authorization;
    }

    const imported = await dependencies.insertTransactions(
      accountId,
      values.map(normalizeImportTransactionValues),
    );

    return {
      ok: true,
      data: {
        errors: [],
        imported,
        skipped: 0,
      },
    };
  },
});

const csvImportWriteOperations = createCsvImportWriteOperations();

export const createImportTemplate =
  csvImportWriteOperations.createImportTemplate;
export const updateImportTemplate =
  csvImportWriteOperations.updateImportTemplate;
export const importTransactions = csvImportWriteOperations.importTransactions;
