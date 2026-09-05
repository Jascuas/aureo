import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categories, importTemplates, transactions } from "@/db/schema";
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
  "accountId" | "id" | "importKey" | "transactionTypeId"
> & {
  transactionTypeId: SupportedTransactionTypeId;
};

export type ImportTransactionInput = ImportTransactionValues & {
  csvRowIndex: number;
  duplicateResolution?: "import";
  idempotencyKey: string;
};

const importTemplateResponseSchema = z.object({
  accountId: z.string(),
  amountFormat: z.object({
    decimalSeparator: z.enum([".", ","]),
    isNegativeExpense: z.boolean(),
    thousandsSeparator: z.enum([".", ",", " ", ""]),
  }),
  columnMapping: z.record(z.string(), z.number()),
  createdAt: z.date(),
  dateFormat: z.enum([
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "DD/MM/YY",
    "MM/DD/YY",
    "DD-MMM-YYYY",
    "DD-MMM-YY",
    "YYYY/MM/DD",
    "unknown",
  ]),
  id: z.string(),
  name: z.string(),
  updatedAt: z.date(),
});

export type ImportTemplateResponse = z.infer<
  typeof importTemplateResponseSchema
>;

export type ImportRowOutcome = {
  csvRowIndex: number;
  reason?: string;
  status: "duplicate" | "failed" | "imported";
};

export type ImportTemplateWriteResult =
  | { ok: true; data: ImportTemplateResponse }
  | { ok: false; reason: "not_found" };

export type ImportTransactionsResult =
  | {
      ok: true;
      data: {
        outcomes: ImportRowOutcome[];
        summary: { duplicate: number; failed: number; imported: number };
      };
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

const toImportTemplateResponse = (value: unknown): ImportTemplateResponse =>
  importTemplateResponseSchema.parse(value);

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
  deleteTemplate: (userId: string, id: string) => Promise<{ id: string } | undefined>;
  findExistingTransaction: (
    accountId: string,
    values: ImportTransactionValues,
  ) => Promise<boolean>;
  findOwnedCategoryIds: (userId: string, ids: string[]) => Promise<string[]>;
  insertTransaction: (
    accountId: string,
    values: ImportTransactionValues,
    importKey: string,
  ) => Promise<"already_imported" | "inserted">;
  listTemplates: (
    userId: string,
    accountId?: string,
  ) => Promise<ImportTemplateResponse[]>;
};

const csvImportWriteDependencies: CsvImportWriteDependencies = {
  authorizeReferences: ensureOwnedReferences,
  createTemplate: async (userId, values) => {
    const [data] = await db
      .insert(importTemplates)
      .values({ id: createId(), userId, ...values })
      .returning(templateProjection);

    return toImportTemplateResponse(data);
  },
  updateTemplate: async (userId, id, values) => {
    const [data] = await db
      .update(importTemplates)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)))
      .returning(templateProjection);

    return data ? toImportTemplateResponse(data) : undefined;
  },
  deleteTemplate: async (userId, id) => {
    const [data] = await db
      .delete(importTemplates)
      .where(and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)))
      .returning({ id: importTemplates.id });

    return data;
  },
  findExistingTransaction: async (accountId, values) => {
    const [existing] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.amount, values.amount),
          eq(transactions.date, values.date),
          sql`LOWER(${transactions.payee}) = LOWER(${values.payee})`,
        ),
      )
      .limit(1);

    return existing !== undefined;
  },
  findOwnedCategoryIds: async (userId, ids) => {
    if (ids.length === 0) return [];

    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));

    return rows.map((row) => row.id);
  },
  insertTransaction: async (accountId, values, importKey) => {
    const [insertedTransaction] = await db
      .insert(transactions)
      .values({
        id: createId(),
        accountId,
        importKey,
        ...values,
      })
      .onConflictDoNothing({
        target: [transactions.accountId, transactions.importKey],
      })
      .returning({ id: transactions.id });

    return insertedTransaction === undefined ? "already_imported" : "inserted";
  },
  listTemplates: async (userId, accountId) => {
    const templates = await db
      .select(templateProjection)
      .from(importTemplates)
      .where(
        accountId === undefined
          ? eq(importTemplates.userId, userId)
          : and(
              eq(importTemplates.userId, userId),
              eq(importTemplates.accountId, accountId),
            ),
      )
      .orderBy(importTemplates.updatedAt);

    return templates.map(toImportTemplateResponse);
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
  deleteImportTemplate: async (
    userId: string,
    id: string,
  ): Promise<
    { ok: true; data: { id: string } } | { ok: false; reason: "not_found" }
  > => {
    const data = await dependencies.deleteTemplate(userId, id);
    return data ? { ok: true, data } : { ok: false, reason: "not_found" };
  },
  listImportTemplates: async (
    userId: string,
    accountId?: string,
  ): Promise<
    | { ok: true; data: ImportTemplateResponse[] }
    | { ok: false; reason: "not_found" }
  > => {
    if (accountId !== undefined) {
      const authorization = await dependencies.authorizeReferences({
        userId,
        accountIds: [accountId],
      });

      if (!authorization.ok) return authorization;
    }

    return { ok: true, data: await dependencies.listTemplates(userId, accountId) };
  },
  importTransactions: async (
    userId: string,
    accountId: string,
    rows: ImportTransactionInput[],
  ): Promise<ImportTransactionsResult> => {
    const authorization = await dependencies.authorizeReferences({
      userId,
      accountIds: [accountId],
      transactionTypeIds: rows.map((row) => row.transactionTypeId),
    });

    if (!authorization.ok) {
      return authorization;
    }

    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.categoryId)
          .filter((categoryId): categoryId is string => categoryId !== null),
      ),
    ];
    const ownedCategoryIds = new Set(
      await dependencies.findOwnedCategoryIds(userId, categoryIds),
    );
    const importedSignatures = new Set<string>();
    const outcomes: ImportRowOutcome[] = [];

    for (const row of rows) {
      const {
        csvRowIndex,
        duplicateResolution,
        idempotencyKey,
        ...transactionValues
      } = row;
      const categoryId = transactionValues.categoryId ?? null;
      if (categoryId !== null && !ownedCategoryIds.has(categoryId)) {
        outcomes.push({
          csvRowIndex,
          reason: "The selected category is unavailable.",
          status: "failed",
        });
        continue;
      }

      const values = normalizeImportTransactionValues(transactionValues);
      const signature = `${values.date.toISOString()}\u0000${values.amount}\u0000${values.payee.toLocaleLowerCase()}`;

      const existingTransaction =
        duplicateResolution !== "import" &&
        (importedSignatures.has(signature) ||
          (await dependencies.findExistingTransaction(accountId, values)));

      if (existingTransaction) {
        outcomes.push({
          csvRowIndex,
          reason: "An identical transaction already exists in this account.",
          status: "duplicate",
        });
        continue;
      }

      try {
        const writeResult = await dependencies.insertTransaction(
          accountId,
          values,
          idempotencyKey,
        );

        if (writeResult === "already_imported") {
          outcomes.push({
            csvRowIndex,
            reason: "This row was already imported by this import attempt.",
            status: "duplicate",
          });
          continue;
        }

        importedSignatures.add(signature);
        outcomes.push({ csvRowIndex, status: "imported" });
      } catch {
        outcomes.push({
          csvRowIndex,
          reason: "This row could not be saved.",
          status: "failed",
        });
      }
    }

    const summary = outcomes.reduce(
      (counts, outcome) => ({
        ...counts,
        [outcome.status]: counts[outcome.status] + 1,
      }),
      { duplicate: 0, failed: 0, imported: 0 },
    );

    return {
      ok: true,
      data: {
        outcomes,
        summary,
      },
    };
  },
});

const csvImportWriteOperations = createCsvImportWriteOperations();

export const createImportTemplate =
  csvImportWriteOperations.createImportTemplate;
export const deleteImportTemplate =
  csvImportWriteOperations.deleteImportTemplate;
export const updateImportTemplate =
  csvImportWriteOperations.updateImportTemplate;
export const listImportTemplates =
  csvImportWriteOperations.listImportTemplates;
export const importTransactions = csvImportWriteOperations.importTransactions;
