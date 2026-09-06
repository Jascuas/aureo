import assert from "node:assert/strict";
import test from "node:test";

import { createBalanceVerificationOperations } from "./balance-verification-operations";

test("balance verification batches all user accounts in one persistence operation", async () => {
  const requestedUsers: string[] = [];
  const operations = createBalanceVerificationOperations({
    listAccountBalances: async (userId) => {
      requestedUsers.push(userId);

      return [
        {
          accountId: "account-1",
          accountName: "Healthy",
          calculatedBalanceMilliunits: 2_000,
          currentBalanceMilliunits: 2_000,
        },
        {
          accountId: "account-2",
          accountName: "Corrupt",
          calculatedBalanceMilliunits: 1_000,
          currentBalanceMilliunits: 2_500,
        },
      ];
    },
  });

  const result = await operations.verifyBalances("user-1");

  assert.deepEqual(requestedUsers, ["user-1"]);
  assert.deepEqual(result.summary, {
    corruptedAccounts: 1,
    corruptionRate: "50.0%",
    healthyAccounts: 1,
    totalAccounts: 2,
    totalCorruption: 1.5,
  });
  assert.deepEqual(result.accounts, [
    {
      accountId: "account-1",
      accountName: "Healthy",
      calculatedBalance: 2,
      currentBalance: 2,
      difference: 0,
      isValid: true,
    },
    {
      accountId: "account-2",
      accountName: "Corrupt",
      calculatedBalance: 1,
      currentBalance: 2.5,
      difference: 1.5,
      isValid: false,
    },
  ]);
});
