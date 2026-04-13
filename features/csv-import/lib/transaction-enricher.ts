import type {
  TransactionForAnalysis,
  EnrichedCategorization,
} from "@/features/csv-import/types/import-types";

type CategorizationAPIResult = {
  csvRowIndex: number;
  categoryId: string | null;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

export function enrichCategorizations(
  categorizations: CategorizationAPIResult[],
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
    };
  });
}
