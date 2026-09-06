import "dotenv/config";

import { verifyBalances } from "@/features/accounts/server/balance-verification-operations";

const getMaximumAccounts = (): number | undefined => {
  const value = process.env.BALANCE_VERIFICATION_MAXIMUM_ACCOUNTS;

  if (value === undefined) {
    return undefined;
  }

  const maximumAccounts = Number(value);

  if (!Number.isInteger(maximumAccounts) || maximumAccounts < 1) {
    throw new Error("BALANCE_VERIFICATION_MAXIMUM_ACCOUNTS must be a positive integer.");
  }

  return maximumAccounts;
};

const runVerification = async (): Promise<void> => {
  const userId = process.env.OPERATOR_USER_ID;

  if (!userId) {
    console.error("OPERATOR_USER_ID must be set before running balance verification.");
    process.exitCode = 1;
    return;
  }

  const result = await verifyBalances({
    maximumAccounts: getMaximumAccounts(),
    userId,
  });

  console.log(JSON.stringify(result));

  if (result.accountsWithDiscrepancies > 0 || result.isTruncated) {
    process.exitCode = 2;
  }
};

void runVerification().catch(() => {
  console.error("Balance verification could not be completed.");
  process.exitCode = 1;
});
