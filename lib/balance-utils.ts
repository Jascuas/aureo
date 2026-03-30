import { addDays } from "date-fns";
import { and, eq, gte, sum } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";

type BalanceCalculationResult = {
  balanceAtStartMilli: number;
  balanceAtEndMilli: number;
  netChangeMilli: number;
};

export async function calculateBalanceForPeriod(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  periodIncomeMilli: number,
  periodExpensesMilli: number,
  accountId?: string,
): Promise<BalanceCalculationResult> {
  // Get current balance from accounts table
  const [{ currentBalance }] = await db
    .select({
      currentBalance: sum(accounts.balance).mapWith(Number),
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        accountId ? eq(accounts.id, accountId) : undefined,
      ),
    );

  // Calculate transactions after the period end
  const dayAfterPeriod = addDays(periodEnd, 1);

  const [row] = await db
    .select({
      netAfterPeriod: sum(transactions.amount).mapWith(Number),
    })
    .from(transactions)
    .innerJoin(
      transactionTypes,
      eq(transactions.transactionTypeId, transactionTypes.id),
    )
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(accounts.userId, userId),
        accountId ? eq(transactions.accountId, accountId) : undefined,
        gte(transactions.date, dayAfterPeriod),
      ),
    );

  const transactionsAfterPeriodNet = row?.netAfterPeriod || 0;

  // Balance at period start = current balance - transactions after period
  const balanceAtStartMilli = currentBalance - transactionsAfterPeriodNet;

  // Net change during the period
  const netChangeMilli = periodIncomeMilli - periodExpensesMilli;

  // Balance at period end = balance at start + net change
  const balanceAtEndMilli = balanceAtStartMilli + netChangeMilli;

  return {
    balanceAtStartMilli,
    balanceAtEndMilli,
    netChangeMilli,
  };
}
