import { eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { transactionBalanceDeltaSql } from "@/db/helpers";
import { accounts, transactions } from "@/db/schema";

type BalanceVerificationPersistenceRow = {
  calculatedBalanceMilliunits: number;
  currentBalanceMilliunits: number;
};

type BalanceVerificationDependencies = {
  listAccountBalances: (
    userId: string,
    maximumAccounts: number,
  ) => Promise<BalanceVerificationPersistenceRow[]>;
};

export type BalanceVerificationInput = {
  maximumAccounts?: number;
  userId: string;
};

export type BalanceVerificationResult = {
  accountsWithDiscrepancies: number;
  accountsInspected: number;
  isTruncated: boolean;
};

const DEFAULT_MAXIMUM_ACCOUNTS = 100;
const MAXIMUM_ACCOUNT_LIMIT = 100;

const balanceVerificationDependencies: BalanceVerificationDependencies = {
  listAccountBalances: (userId, maximumAccounts) => {
    const selectedAccounts = db.$with("selected_accounts").as(
      db
        .select({
          accountId: accounts.id,
          currentBalanceMilliunits: accounts.balance,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .orderBy(accounts.id)
        .limit(maximumAccounts + 1),
    );

    return db
      .with(selectedAccounts)
      .select({
        calculatedBalanceMilliunits: sql<number>`COALESCE(${transactionBalanceDeltaSql}, 0)`.mapWith(Number),
        currentBalanceMilliunits: sql<number>`COALESCE(${selectedAccounts.currentBalanceMilliunits}, 0)`.mapWith(Number),
      })
      .from(selectedAccounts)
      .leftJoin(transactions, eq(transactions.accountId, selectedAccounts.accountId))
      .groupBy(selectedAccounts.accountId, selectedAccounts.currentBalanceMilliunits)
      .orderBy(selectedAccounts.accountId);
  },
};

const resolveMaximumAccounts = (maximumAccounts?: number): number => {
  if (maximumAccounts === undefined) {
    return DEFAULT_MAXIMUM_ACCOUNTS;
  }

  return Math.min(Math.max(maximumAccounts, 1), MAXIMUM_ACCOUNT_LIMIT);
};

export const createBalanceVerificationOperations = (
  dependencies: BalanceVerificationDependencies = balanceVerificationDependencies,
) => ({
  verifyBalances: async ({
    maximumAccounts,
    userId,
  }: BalanceVerificationInput): Promise<BalanceVerificationResult> => {
    const resolvedMaximumAccounts = resolveMaximumAccounts(maximumAccounts);
    const persistenceRows = await dependencies.listAccountBalances(
      userId,
      resolvedMaximumAccounts,
    );
    const inspectedRows = persistenceRows.slice(0, resolvedMaximumAccounts);
    const discrepancies = inspectedRows.map(
      ({ calculatedBalanceMilliunits, currentBalanceMilliunits }) => ({
        differenceMilliunits: currentBalanceMilliunits - calculatedBalanceMilliunits,
      }),
    );

    return {
      accountsWithDiscrepancies: discrepancies.filter(
        ({ differenceMilliunits }) => differenceMilliunits !== 0,
      ).length,
      accountsInspected: inspectedRows.length,
      isTruncated: persistenceRows.length > resolvedMaximumAccounts,
    };
  },
});

const balanceVerificationOperations = createBalanceVerificationOperations();

export const verifyBalances = balanceVerificationOperations.verifyBalances;
