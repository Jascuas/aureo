import { createId } from "@paralleldrive/cuid2";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";

import { ensureOwnedReferences } from "./owned-references";

type TransactionWriteValues = Omit<InferInsertModel<typeof transactions>, "id">;

type TransactionResponse = {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  notes: string | null;
  payee: string;
  transactionTypeId: string;
};

type TransactionWriteResult =
  | { ok: true; data: TransactionResponse }
  | { ok: false; reason: "not_found" };

type TransactionBulkWriteResult =
  | { ok: true; data: TransactionResponse[] }
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

export const createTransaction = async (
  userId: string,
  values: TransactionWriteValues,
): Promise<TransactionWriteResult> => {
  const authorization = await ensureOwnedReferences(
    transactionReferences(userId, [values]),
  );

  if (!authorization.ok) {
    return authorization;
  }

  const [data] = await db
    .insert(transactions)
    .values({ id: createId(), ...values })
    .returning(transactionProjection);

  return { ok: true, data };
};

export const createTransactions = async (
  userId: string,
  values: TransactionWriteValues[],
): Promise<TransactionBulkWriteResult> => {
  const authorization = await ensureOwnedReferences(
    transactionReferences(userId, values),
  );

  if (!authorization.ok) {
    return authorization;
  }

  const data = await db
    .insert(transactions)
    .values(values.map((value) => ({ id: createId(), ...value })))
    .returning(transactionProjection);

  return { ok: true, data };
};

export const updateTransaction = async (
  userId: string,
  id: string,
  values: TransactionWriteValues,
): Promise<TransactionWriteResult> => {
  const authorization = await ensureOwnedReferences(
    transactionReferences(userId, [values]),
  );

  if (!authorization.ok) {
    return authorization;
  }

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

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, data };
};
