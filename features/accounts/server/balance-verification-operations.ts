import { eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { transactionBalanceDeltaSql } from "@/db/helpers";
import { accounts, transactions } from "@/db/schema";
import { calculateTotalCorruptionMilliunits } from "@/features/accounts/lib/balance-reconciliation";
import { convertAmountFromMilliunits } from "@/lib/utils";

type BalanceVerificationPersistenceRow = {
  accountId: string;
  accountName: string;
  calculatedBalanceMilliunits: number;
  currentBalanceMilliunits: number;
};

type BalanceVerificationDependencies = {
  listAccountBalances: (userId: string) => Promise<BalanceVerificationPersistenceRow[]>;
};

export type BalanceVerificationResult = {
  accounts: Array<{
    accountId: string;
    accountName: string;
    calculatedBalance: number;
    currentBalance: number;
    difference: number;
    isValid: boolean;
  }>;
  summary: {
    corruptedAccounts: number;
    corruptionRate: string;
    healthyAccounts: number;
    totalAccounts: number;
    totalCorruption: number;
  };
};

const balanceVerificationDependencies: BalanceVerificationDependencies = {
  listAccountBalances: (userId) =>
    db
      .select({
        accountId: accounts.id,
        accountName: accounts.name,
        calculatedBalanceMilliunits: sql<number>`COALESCE(${transactionBalanceDeltaSql}, 0)`.mapWith(Number),
        currentBalanceMilliunits: sql<number>`COALESCE(${accounts.balance}, 0)`.mapWith(Number),
      })
      .from(accounts)
      .leftJoin(transactions, eq(transactions.accountId, accounts.id))
      .where(eq(accounts.userId, userId))
      .groupBy(accounts.id, accounts.name, accounts.balance),
};

export const createBalanceVerificationOperations = (
  dependencies: BalanceVerificationDependencies = balanceVerificationDependencies,
) => ({
  verifyBalances: async (userId: string): Promise<BalanceVerificationResult> => {
    const verificationResults = (await dependencies.listAccountBalances(userId)).map(
      ({
        accountId,
        accountName,
        calculatedBalanceMilliunits,
        currentBalanceMilliunits,
      }) => {
        const differenceMilliunits =
          currentBalanceMilliunits - calculatedBalanceMilliunits;

        return {
          accountId,
          accountName,
          calculatedBalanceMilliunits,
          currentBalanceMilliunits,
          differenceMilliunits,
          isValid: differenceMilliunits === 0,
        };
      },
    );
    const totalAccounts = verificationResults.length;
    const corruptedAccounts = verificationResults.filter(({ isValid }) => !isValid).length;
    const totalCorruptionMilliunits = calculateTotalCorruptionMilliunits(verificationResults);

    return {
      summary: {
        corruptedAccounts,
        corruptionRate:
          totalAccounts > 0
            ? `${((corruptedAccounts / totalAccounts) * 100).toFixed(1)}%`
            : "0%",
        healthyAccounts: totalAccounts - corruptedAccounts,
        totalAccounts,
        totalCorruption: convertAmountFromMilliunits(totalCorruptionMilliunits),
      },
      accounts: verificationResults.map(
        ({
          calculatedBalanceMilliunits,
          currentBalanceMilliunits,
          differenceMilliunits,
          ...account
        }) => ({
          ...account,
          calculatedBalance: convertAmountFromMilliunits(calculatedBalanceMilliunits),
          currentBalance: convertAmountFromMilliunits(currentBalanceMilliunits),
          difference: convertAmountFromMilliunits(differenceMilliunits),
        }),
      ),
    };
  },
});

const balanceVerificationOperations = createBalanceVerificationOperations();

export const verifyBalances = balanceVerificationOperations.verifyBalances;
