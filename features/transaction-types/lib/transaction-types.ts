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
  {
    id: "transfer",
    name: "Transfer",
    // Production's trigger applies the signed transfer amount. Preserve that
    // behavior through the legacy-ID transition without recalculating rows.
    balanceEffect: "signed",
    expenseSummaryEffect: "exclude",
  },
] as const;

export const LEGACY_TRANSACTION_TYPE_IDS = {
  txd4b7kzpn2lmjv6cuqf9s3yw: "expense",
  txp8azr12yckwhv9odnb30elu: "income",
  uo4hd5voxicrkfovkx0bo8xg: "transfer",
} as const;

export type SupportedTransactionType = (typeof SUPPORTED_TRANSACTION_TYPES)[number];
export type SupportedTransactionTypeId = SupportedTransactionType["id"];
export type LegacyTransactionTypeId = keyof typeof LEGACY_TRANSACTION_TYPE_IDS;
export type TransactionTypeInputId = SupportedTransactionTypeId | LegacyTransactionTypeId;
export type TransactionTypeName = SupportedTransactionType["name"];
export type SummaryTransactionTypeName = TransactionTypeName | "All";

const [incomeTransactionType, expenseTransactionType, refundTransactionType, transferTransactionType] =
  SUPPORTED_TRANSACTION_TYPES;

export const SUPPORTED_TRANSACTION_TYPE_IDS = [
  incomeTransactionType.id,
  expenseTransactionType.id,
  refundTransactionType.id,
  transferTransactionType.id,
] as const;

const LEGACY_TRANSACTION_TYPE_ID_VALUES = Object.keys(
  LEGACY_TRANSACTION_TYPE_IDS,
) as [LegacyTransactionTypeId, ...LegacyTransactionTypeId[]];

export const TRANSACTION_TYPE_NAMES = [
  incomeTransactionType.name,
  expenseTransactionType.name,
  refundTransactionType.name,
  transferTransactionType.name,
] as const;

export const supportedTransactionTypeIdSchema = z.enum(SUPPORTED_TRANSACTION_TYPE_IDS);
export const transactionTypeInputIdSchema = z.union([
  supportedTransactionTypeIdSchema,
  z.enum(LEGACY_TRANSACTION_TYPE_ID_VALUES),
]);

export const isSupportedTransactionTypeId = (
  id: string,
): id is SupportedTransactionTypeId => supportedTransactionTypeIdSchema.safeParse(id).success;

export const isTransactionTypeInputId = (
  id: string,
): id is TransactionTypeInputId => transactionTypeInputIdSchema.safeParse(id).success;

export const canonicalizeTransactionTypeId = (
  id: TransactionTypeInputId,
): SupportedTransactionTypeId => {
  const legacyId = id as LegacyTransactionTypeId;
  return LEGACY_TRANSACTION_TYPE_IDS[legacyId] ?? (id as SupportedTransactionTypeId);
};

export const getStoredTransactionTypeIdCandidates = (
  id: TransactionTypeInputId,
): readonly string[] => {
  const canonicalId = canonicalizeTransactionTypeId(id);
  const legacyId = Object.entries(LEGACY_TRANSACTION_TYPE_IDS).find(
    ([, value]) => value === canonicalId,
  )?.[0];

  return legacyId ? [canonicalId, legacyId] : [canonicalId];
};

export const getSummaryStoredTransactionTypeIds = (
  type: SummaryTransactionTypeName,
): readonly string[] =>
  [
    ...new Set(
      getSummaryTransactionTypeIds(type).flatMap(
        getStoredTransactionTypeIdCandidates,
      ),
    ),
  ];

export const getTransactionTypeForAmount = (
  amount: number,
): SupportedTransactionType =>
  amount < 0 ? expenseTransactionType : incomeTransactionType;

const getSupportedTransactionType = (
  id: TransactionTypeInputId,
): SupportedTransactionType => {
  const canonicalId = canonicalizeTransactionTypeId(id);
  const transactionType = SUPPORTED_TRANSACTION_TYPES.find(
    (candidate) => candidate.id === canonicalId,
  );

  if (!transactionType) throw new Error(`Unsupported transaction type ID: ${id}`);
  return transactionType;
};

export const normalizeTransactionAmount = (
  transactionTypeId: TransactionTypeInputId,
  amount: number,
): number => {
  const { balanceEffect } = getSupportedTransactionType(transactionTypeId);
  const absoluteAmount = Math.abs(amount);

  if (balanceEffect === "signed") return amount;
  return balanceEffect === "decrease" ? -absoluteAmount : absoluteAmount;
};

export const getTransactionSummaryAmounts = (
  transactionTypeId: TransactionTypeInputId,
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
