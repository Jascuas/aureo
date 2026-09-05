import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories, transactions } from "@/db/schema";
import {
  getTransactionDateRange,
  type TransactionListQuery,
} from "@/features/transactions/lib/transaction-list-input";

export type TransactionListItem = {
  account: string;
  accountId: string;
  amount: number;
  category: string | null;
  categoryId: string | null;
  date: Date;
  id: string;
  notes: string | null;
  payee: string;
  transactionTypeId: string;
};

export type TransactionEditItem = {
  accountId: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  id: string;
  notes: string | null;
  payee: string;
  transactionTypeId: string;
};

export type TransactionListResult = {
  data: TransactionListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type TransactionListDependencies = {
  findById: (userId: string, id: string) => Promise<TransactionEditItem | undefined>;
  list: (userId: string, input: TransactionListQuery) => Promise<TransactionListItem[]>;
};

const transactionListProjection = {
  account: accounts.name,
  accountId: transactions.accountId,
  amount: transactions.amount,
  category: categories.name,
  categoryId: transactions.categoryId,
  date: transactions.date,
  id: transactions.id,
  notes: transactions.notes,
  payee: transactions.payee,
  transactionTypeId: transactions.transactionTypeId,
};

const transactionEditProjection = {
  accountId: transactions.accountId,
  amount: transactions.amount,
  categoryId: transactions.categoryId,
  date: transactions.date,
  id: transactions.id,
  notes: transactions.notes,
  payee: transactions.payee,
  transactionTypeId: transactions.transactionTypeId,
};

const transactionListDependencies: TransactionListDependencies = {
  findById: async (userId, id) => {
    const [transaction] = await db
      .select(transactionEditProjection)
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.id, id), eq(accounts.userId, userId)));

    return transaction;
  },
  list: async (userId, input) => {
    const { endDate, startDate } = getTransactionDateRange(input);

    return db
      .select(transactionListProjection)
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          input.accountId ? eq(transactions.accountId, input.accountId) : undefined,
          eq(accounts.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          input.cursor
            ? or(
                lt(transactions.date, input.cursor.date),
                and(
                  eq(transactions.date, input.cursor.date),
                  lt(transactions.id, input.cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(input.limit + 1);
  },
};

export const createTransactionListOperations = (
  dependencies: TransactionListDependencies = transactionListDependencies,
) => ({
  getTransaction: (userId: string, id: string) => dependencies.findById(userId, id),
  listTransactions: async (
    userId: string,
    input: TransactionListQuery,
  ): Promise<TransactionListResult> => {
    const rows = await dependencies.list(userId, input);
    const hasMore = rows.length > input.limit;
    const data = hasMore ? rows.slice(0, input.limit) : rows;
    const lastTransaction = data.at(-1);

    return {
      data,
      hasMore,
      nextCursor:
        hasMore && lastTransaction
          ? JSON.stringify({
              date: lastTransaction.date.toISOString(),
              id: lastTransaction.id,
            })
          : null,
    };
  },
});

const transactionListOperations = createTransactionListOperations();

export const getTransaction = transactionListOperations.getTransaction;
export const listTransactions = transactionListOperations.listTransactions;
