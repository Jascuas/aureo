import type {
  AICategorization,
  EnrichedCategorization,
  TransactionForAnalysis,
} from "@/features/csv-import/types/import-types";

export function enrichCategorizations(
  categorizations: AICategorization[],
  originalTransactions: TransactionForAnalysis[],
): EnrichedCategorization[] {
  return categorizations.map((cat) => {
    const originalTx = originalTransactions.find(
      (t) => t.csvRowIndex === cat.csvRowIndex,
    );
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
