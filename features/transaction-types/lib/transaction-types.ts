import { z } from "zod";

export const SUPPORTED_TRANSACTION_TYPES = [
  {
    id: "income",
    name: "Income",
    balanceEffect: "increase",
    expenseSummaryEffect: "exclude",
  },
  {
    id: "expense",
    name: "Expense",
    balanceEffect: "decrease",
    expenseSummaryEffect: "include",
  },
  {
    id: "refund",
    name: "Refund",
    balanceEffect: "increase",
    expenseSummaryEffect: "offset",
  },
] as const;

export type SupportedTransactionType =
  (typeof SUPPORTED_TRANSACTION_TYPES)[number];
export type SupportedTransactionTypeId = SupportedTransactionType["id"];
export type TransactionTypeName = SupportedTransactionType["name"];
export type SummaryTransactionTypeName = TransactionTypeName | "All";

const [incomeTransactionType, expenseTransactionType, refundTransactionType] =
  SUPPORTED_TRANSACTION_TYPES;

export const SUPPORTED_TRANSACTION_TYPE_IDS = [
  incomeTransactionType.id,
  expenseTransactionType.id,
  refundTransactionType.id,
] as const;

export const TRANSACTION_TYPE_NAMES = [
  incomeTransactionType.name,
  expenseTransactionType.name,
  refundTransactionType.name,
] as const;

export const supportedTransactionTypeIdSchema = z.enum(
  SUPPORTED_TRANSACTION_TYPE_IDS,
);

export const isSupportedTransactionTypeId = (
  id: string,
): id is SupportedTransactionTypeId => supportedTransactionTypeIdSchema.safeParse(id).success;

export const getTransactionTypeForAmount = (
  amount: number,
): SupportedTransactionType =>
  amount < 0 ? expenseTransactionType : incomeTransactionType;

const getSupportedTransactionType = (
  id: SupportedTransactionTypeId,
): SupportedTransactionType => {
  const transactionType = SUPPORTED_TRANSACTION_TYPES.find(
    (candidate) => candidate.id === id,
  );

  if (!transactionType) {
    throw new Error(`Unsupported transaction type ID: ${id}`);
  }

  return transactionType;
};

export const normalizeTransactionAmount = (
  transactionTypeId: SupportedTransactionTypeId,
  amount: number,
): number => {
  const { balanceEffect } = getSupportedTransactionType(transactionTypeId);
  const absoluteAmount = Math.abs(amount);

  return balanceEffect === "decrease" ? -absoluteAmount : absoluteAmount;
};

export const getTransactionSummaryAmounts = (
  transactionTypeId: SupportedTransactionTypeId,
  amount: number,
) => {
  const transactionType = getSupportedTransactionType(transactionTypeId);
  const normalizedAmount = normalizeTransactionAmount(transactionTypeId, amount);

  return {
    balanceDelta: normalizedAmount,
    expenses:
      transactionType.expenseSummaryEffect === "include"
        ? Math.abs(normalizedAmount)
        : transactionType.expenseSummaryEffect === "offset"
          ? -Math.abs(normalizedAmount)
          : 0,
    income: transactionType.name === "Income" ? normalizedAmount : 0,
  };
};

export const getSummaryTransactionTypeIds = (
  type: SummaryTransactionTypeName,
): readonly SupportedTransactionTypeId[] => {
  if (type === "All") return SUPPORTED_TRANSACTION_TYPE_IDS;

  if (type === "Expense") {
    return SUPPORTED_TRANSACTION_TYPES.filter(
      (transactionType) => transactionType.expenseSummaryEffect !== "exclude",
    ).map((transactionType) => transactionType.id);
  }

  return SUPPORTED_TRANSACTION_TYPES.filter(
    (transactionType) => transactionType.name === type,
  ).map((transactionType) => transactionType.id);
};
