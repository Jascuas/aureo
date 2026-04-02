import { addDays } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { sum } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";

type CurrentBalanceChangeResult = {
  currentBalanceMilli: number;
  balanceAtSinceDateMilli: number;
  changeMilli: number;
};

/**
 * Calcula balance en un periodo y cambio desde fecha de referencia.
 *
 * Balance card muestra:
 * - Balance al final del periodo (endDate, o HOY si no se especifica)
 * - Cambio desde la fecha de referencia (sinceDate) hasta endDate
 *
 * @param userId - ID del usuario
 * @param sinceDate - Fecha de inicio del periodo (para calcular cambio)
 * @param endDate - Fecha de fin del periodo (opcional, por defecto HOY)
 * @param accountId - Cuenta específica (opcional)
 *
 * @returns Balance al final del periodo, balance al inicio, y cambio
 */
export async function calculateCurrentBalanceChange(
  userId: string,
  sinceDate: Date,
  endDate?: Date,
  accountId?: string,
): Promise<CurrentBalanceChangeResult> {
  // Get current balance from accounts table (balance HOY)
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

  // If no endDate provided, use current balance as-is
  // Otherwise, calculate historical balance at endDate
  let balanceAtEndDateMilli = currentBalance;

  if (endDate) {
    // Calculate transactions AFTER endDate
    const dayAfterEndDate = addDays(endDate, 1);

    const [rowAfter] = await db
      .select({
        netAfterEndDate: sum(transactions.amount).mapWith(Number),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          accountId ? eq(transactions.accountId, accountId) : undefined,
          gte(transactions.date, dayAfterEndDate),
        ),
      );

    const transactionsAfterEndDate = rowAfter?.netAfterEndDate || 0;

    // Balance at endDate = current balance - transactions after endDate
    balanceAtEndDateMilli = currentBalance - transactionsAfterEndDate;
  }

  // Calculate balance at the reference date (sinceDate)
  // Balance at sinceDate = current balance - all transactions since that date
  const dayAfterSinceDate = addDays(sinceDate, 1);

  const [row] = await db
    .select({
      netSinceThen: sum(transactions.amount).mapWith(Number),
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(accounts.userId, userId),
        accountId ? eq(transactions.accountId, accountId) : undefined,
        gte(transactions.date, dayAfterSinceDate),
      ),
    );

  const transactionsSinceRefDate = row?.netSinceThen || 0;

  // Balance at reference date = current balance - transactions since then
  const balanceAtSinceDateMilli = currentBalance - transactionsSinceRefDate;

  // Change = balance at endDate - balance at sinceDate
  const changeMilli = balanceAtEndDateMilli - balanceAtSinceDateMilli;

  return {
    currentBalanceMilli: balanceAtEndDateMilli,
    balanceAtSinceDateMilli,
    changeMilli,
  };
}

type BalanceForPeriodResult = {
  balanceAtStartMilli: number;
  balanceAtEndMilli: number;
  netChangeMilli: number;
};

/**
 * Calcula balance al inicio y final de un periodo.
 *
 * Usado por over-time para construir gráfico de balance día por día.
 *
 * @param userId - ID del usuario
 * @param periodStart - Inicio del periodo
 * @param periodEnd - Fin del periodo
 * @param periodIncomeMilli - Income del periodo (milliunits)
 * @param periodExpensesMilli - Expenses del periodo (milliunits)
 * @param accountId - Cuenta específica (opcional)
 */
export async function calculateBalanceForPeriod(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  periodIncomeMilli: number,
  periodExpensesMilli: number,
  accountId?: string,
): Promise<BalanceForPeriodResult> {
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
