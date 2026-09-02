import { z } from "zod";

export const SUPPORTED_TRANSACTION_TYPE_IDS = [
  "income",
  "expense",
  "refund",
] as const;

export const TRANSACTION_TYPE_NAMES = ["Income", "Expense", "Refund"] as const;

export type SupportedTransactionTypeId =
  (typeof SUPPORTED_TRANSACTION_TYPE_IDS)[number];
export type TransactionTypeName = (typeof TRANSACTION_TYPE_NAMES)[number];
export type SummaryTransactionTypeName = TransactionTypeName | "All";

type TransactionTypeDefinition = {
  id: SupportedTransactionTypeId;
  name: TransactionTypeName;
  balanceEffect: "increase" | "decrease";
  expenseSummaryEffect: "include" | "offset" | "exclude";
};

export const SUPPORTED_TRANSACTION_TYPES: readonly TransactionTypeDefinition[] = [
  {
    id: SUPPORTED_TRANSACTION_TYPE_IDS[0],
    name: TRANSACTION_TYPE_NAMES[0],
    balanceEffect: "increase",
    expenseSummaryEffect: "exclude",
  },
  {
    id: SUPPORTED_TRANSACTION_TYPE_IDS[1],
    name: TRANSACTION_TYPE_NAMES[1],
    balanceEffect: "decrease",
    expenseSummaryEffect: "include",
  },
  {
    id: SUPPORTED_TRANSACTION_TYPE_IDS[2],
    name: TRANSACTION_TYPE_NAMES[2],
    balanceEffect: "increase",
    expenseSummaryEffect: "offset",
  },
];

export const supportedTransactionTypeIdSchema = z.enum(
  SUPPORTED_TRANSACTION_TYPE_IDS,
);

export const isSupportedTransactionTypeId = (
  id: string,
): id is SupportedTransactionTypeId => supportedTransactionTypeIdSchema.safeParse(id).success;

export const getTransactionTypeForAmount = (
  amount: number,
): TransactionTypeDefinition =>
  amount < 0
    ? SUPPORTED_TRANSACTION_TYPES[1]
    : SUPPORTED_TRANSACTION_TYPES[0];

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
