import assert from "node:assert/strict";
import test from "node:test";

import { createBalanceVerificationOperations } from "./balance-verification-operations";

test("balance verification batches all user accounts in one persistence operation", async () => {
  const requests: Array<{ maximumAccounts: number; userId: string }> = [];
  const operations = createBalanceVerificationOperations({
    listAccountBalances: async (userId, maximumAccounts) => {
      requests.push({ maximumAccounts, userId });

      return [
        {
          calculatedBalanceMilliunits: 2_000,
          currentBalanceMilliunits: 2_000,
        },
        {
          calculatedBalanceMilliunits: 1_000,
          currentBalanceMilliunits: 2_500,
        },
        {
          calculatedBalanceMilliunits: 4_000,
          currentBalanceMilliunits: 4_000,
        },
      ];
    },
  });

  const result = await operations.verifyBalances({
    maximumAccounts: 2,
    userId: "user-1",
  });

  assert.deepEqual(requests, [{ maximumAccounts: 2, userId: "user-1" }]);
  assert.deepEqual(result, {
    accountsInspected: 2,
    accountsWithDiscrepancies: 1,
    isTruncated: true,
  });
});

test("balance verification caps an operator-supplied account limit", async () => {
  const requests: Array<{ maximumAccounts: number; userId: string }> = [];
  const operations = createBalanceVerificationOperations({
    listAccountBalances: async (userId, maximumAccounts) => {
      requests.push({ maximumAccounts, userId });
      return [];
    },
  });

  await operations.verifyBalances({
    maximumAccounts: 1_000,
    userId: "user-1",
  });

  assert.deepEqual(requests, [{ maximumAccounts: 100, userId: "user-1" }]);
});
