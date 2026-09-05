import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { transactionBalanceDeltaSql } from "@/db/helpers";
import { accounts, transactions } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { convertAmountFromMilliunits } from "@/lib/utils";

const app = new Hono<AppEnv>().get(
  "/verify-balances",
  requireAuth,
  async (c) => {
    const userId = c.var.userId;

    // Get all user accounts with their current balances
    const userAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        currentBalance: accounts.balance,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    // Calculate expected balance for each account from transaction history
    const verificationResults = await Promise.all(
      userAccounts.map(async (account) => {
        const result = await db
          .select({
            calculatedBalance: transactionBalanceDeltaSql,
          })
          .from(transactions)

          .where(eq(transactions.accountId, account.id));

        const calculatedBalance = result[0]?.calculatedBalance ?? 0;
        const currentBalance = account.currentBalance ?? 0;
        const isValid = currentBalance === calculatedBalance;
        const difference = currentBalance - calculatedBalance;

        return {
          accountId: account.id,
          accountName: account.name,
          currentBalance: convertAmountFromMilliunits(currentBalance),
          calculatedBalance: convertAmountFromMilliunits(calculatedBalance),
          isValid,
          difference: convertAmountFromMilliunits(difference),
        };
      }),
    );

    // Summary statistics
    const totalAccounts = verificationResults.length;
    const corruptedAccounts = verificationResults.filter(
      (r) => !r.isValid,
    ).length;
    const totalCorruption = verificationResults.reduce(
      (sum, r) => sum + Math.abs(r.difference),
      0,
    );

    return c.json({
      summary: {
        totalAccounts,
        corruptedAccounts,
        healthyAccounts: totalAccounts - corruptedAccounts,
        corruptionRate:
          totalAccounts > 0
            ? ((corruptedAccounts / totalAccounts) * 100).toFixed(1) + "%"
            : "0%",
        totalCorruption: convertAmountFromMilliunits(totalCorruption),
      },
      accounts: verificationResults,
    });
  },
);

export default app;
