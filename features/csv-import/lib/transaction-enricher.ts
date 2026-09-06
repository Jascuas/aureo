import type {
  AICategorization,
  EnrichedCategorization,
  TransactionForAnalysis,
} from "@/features/csv-import/types/import-types";

export function enrichCategorizations(
  categorizations: AICategorization[],
  originalTransactions: TransactionForAnalysis[],
): EnrichedCategorization[] {
  const transactionsByRow = new Map(
    originalTransactions.map((transaction) => [
      transaction.csvRowIndex,
      transaction,
    ]),
  );

  return categorizations.map((cat) => {
    const originalTx = transactionsByRow.get(cat.csvRowIndex);
    return {
      csvRowIndex: cat.csvRowIndex,
      date: originalTx?.date || "",
      amount: originalTx?.amount || 0,
      payee: originalTx?.payee || "",
      notes: originalTx?.notes,
      categoryId: cat.categoryId,
      transactionTypeId: cat.transactionTypeId,
      confidence: cat.confidence,
      normalizedPayee: cat.normalizedPayee,
      userEdited: false,
    };
  });
}
