import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";

import { ensureOwnedReferences } from "./owned-references";

export type TransactionWriteValues = Omit<
  InferInsertModel<typeof transactions>,
  "id"
>;

export type TransactionResponse = {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  notes: string | null;
  payee: string;
  transactionTypeId: string;
};

export type TransactionWriteResult =
  | { ok: true; data: TransactionResponse }
  | { ok: false; reason: "not_found" };

export type TransactionBulkWriteResult =
  | { ok: true; data: TransactionResponse[] }
  | { ok: false; reason: "not_found" };

export type TransactionDeleteResponse = {
  id: string;
};

export type TransactionDeleteResult =
  | { ok: true; data: TransactionDeleteResponse }
  | { ok: false; reason: "not_found" };

const transactionReferences = (
  userId: string,
  values: readonly TransactionWriteValues[],
) => ({
  userId,
  accountIds: values.map((value) => value.accountId),
  categoryIds: values.map((value) => value.categoryId),
  transactionTypeIds: values.map((value) => value.transactionTypeId),
});

const transactionProjection = {
  id: transactions.id,
  accountId: transactions.accountId,
  amount: transactions.amount,
  categoryId: transactions.categoryId,
  date: transactions.date,
  notes: transactions.notes,
  payee: transactions.payee,
  transactionTypeId: transactions.transactionTypeId,
};

export type TransactionWriteDependencies = {
  authorizeReferences: typeof ensureOwnedReferences;
  create: (values: TransactionWriteValues) => Promise<TransactionResponse>;
  createMany: (
    values: TransactionWriteValues[],
  ) => Promise<TransactionResponse[]>;
  update: (
    userId: string,
    id: string,
    values: TransactionWriteValues,
  ) => Promise<TransactionResponse | undefined>;
  delete: (
    userId: string,
    id: string,
  ) => Promise<TransactionDeleteResponse | undefined>;
  deleteMany: (
    userId: string,
    ids: string[],
  ) => Promise<TransactionDeleteResponse[]>;
};

const transactionWriteDependencies: TransactionWriteDependencies = {
  authorizeReferences: ensureOwnedReferences,
  create: async (values) => {
    const [data] = await db
      .insert(transactions)
      .values({ id: createId(), ...values })
      .returning(transactionProjection);

    return data;
  },
  createMany: (values) =>
    db
      .insert(transactions)
      .values(values.map((value) => ({ id: createId(), ...value })))
      .returning(transactionProjection),
  update: async (userId, id, values) => {
    const transactionsToUpdate = db.$with("transactions_to_update").as(
      db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, userId))),
    );

    const [data] = await db
      .with(transactionsToUpdate)
      .update(transactions)
      .set(values)
      .where(
        inArray(
          transactions.id,
          sql`(select id from ${transactionsToUpdate})`,
        ),
      )
      .returning(transactionProjection);

    return data;
  },
  delete: async (userId, id) => {
    const transactionsToDelete = db.$with("transactions_to_delete").as(
      db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, userId))),
    );

    const [data] = await db
      .with(transactionsToDelete)
      .delete(transactions)
      .where(
        inArray(
          transactions.id,
          sql`(select id from ${transactionsToDelete})`,
        ),
      )
      .returning({ id: transactions.id });

    return data;
  },
  deleteMany: async (userId, ids) => {
    const transactionsToDelete = db.$with("transactions_to_delete").as(
      db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            inArray(transactions.id, ids),
            eq(accounts.userId, userId),
          ),
        ),
    );

    return db
      .with(transactionsToDelete)
      .delete(transactions)
      .where(
        inArray(
          transactions.id,
          sql`(select id from ${transactionsToDelete})`,
        ),
      )
      .returning({ id: transactions.id });
  },
};

export const createTransactionWriteOperations = (
  dependencies: TransactionWriteDependencies = transactionWriteDependencies,
) => ({
  createTransaction: async (
    userId: string,
    values: TransactionWriteValues,
  ): Promise<TransactionWriteResult> => {
    const authorization = await dependencies.authorizeReferences(
      transactionReferences(userId, [values]),
    );

    if (!authorization.ok) {
      return authorization;
    }

    return { ok: true, data: await dependencies.create(values) };
  },
  createTransactions: async (
    userId: string,
    values: TransactionWriteValues[],
  ): Promise<TransactionBulkWriteResult> => {
    const authorization = await dependencies.authorizeReferences(
      transactionReferences(userId, values),
    );

    if (!authorization.ok) {
      return authorization;
    }

    return { ok: true, data: await dependencies.createMany(values) };
  },
  updateTransaction: async (
    userId: string,
    id: string,
    values: TransactionWriteValues,
  ): Promise<TransactionWriteResult> => {
    const authorization = await dependencies.authorizeReferences(
      transactionReferences(userId, [values]),
    );

    if (!authorization.ok) {
      return authorization;
    }

    const data = await dependencies.update(userId, id, values);

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    return { ok: true, data };
  },
  deleteTransaction: async (
    userId: string,
    id: string,
  ): Promise<TransactionDeleteResult> => {
    const data = await dependencies.delete(userId, id);

    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    return { ok: true, data };
  },
  deleteTransactions: (userId: string, ids: string[]) =>
    dependencies.deleteMany(userId, ids),
});

const transactionWriteOperations = createTransactionWriteOperations();

export const createTransaction = transactionWriteOperations.createTransaction;
export const createTransactions = transactionWriteOperations.createTransactions;
export const deleteTransaction = transactionWriteOperations.deleteTransaction;
export const deleteTransactions = transactionWriteOperations.deleteTransactions;
export const updateTransaction = transactionWriteOperations.updateTransaction;
