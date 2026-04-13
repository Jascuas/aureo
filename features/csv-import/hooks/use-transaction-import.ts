import { useCallback } from "react";
import { useBulkImportTransactions } from "@/features/csv-import/api/use-bulk-import-transactions";
import type { EnrichedCategorization } from "@/features/csv-import/hooks/use-import-session";

type DuplicateResolution = {
  csvIndex: number;
  action: "skip" | "import";
};

interface UseTransactionImportOptions {
  accountId: string | undefined;
  categorizations: EnrichedCategorization[];
  resolutions: DuplicateResolution[];
  setImportResult: (result: any) => void;
  onComplete: () => void;
}

interface UseTransactionImportReturn {
  importTransactions: () => Promise<void>;
  isImporting: boolean;
}

export function useTransactionImport({
  accountId,
  categorizations,
  resolutions,
  setImportResult,
  onComplete,
}: UseTransactionImportOptions): UseTransactionImportReturn {
  const bulkImportMutation = useBulkImportTransactions();

  const importTransactions = useCallback(async () => {
    if (!accountId) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: categorizations.length,
        errors: [{ row: 0, message: "No account selected" }],
      });
      return;
    }

    const rowsToImport = categorizations.filter((cat) => {
      const resolution = resolutions.find(
        (r) => r.csvIndex === cat.csvRowIndex,
      );
      if (resolution?.action === "skip") return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: categorizations.length,
        errors: [{ row: 0, message: "No transactions to import" }],
      });
      return;
    }

    try {
      const result = await bulkImportMutation.mutateAsync({
        accountId,
        transactions: rowsToImport.map((cat) => ({
          date: cat.date,
          amount: cat.amount,
          payee: cat.payee,
          notes: cat.notes || undefined,
          categoryId: cat.categoryId,
          transactionTypeId: cat.transactionTypeId,
        })),
      });

      if ("data" in result) {
        setImportResult({
          importedCount: result.data.imported,
          skippedCount: 0,
          errorCount: result.data.errors.length,
          errors: result.data.errors.map((err: any) => ({
            row: 0,
            message: err,
          })),
        });
        onComplete();
      }
    } catch (error: any) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: rowsToImport.length,
        errors: [{ row: 0, message: error?.message || "Import failed" }],
      });
      onComplete();
    }
  }, [
    accountId,
    categorizations,
    resolutions,
    bulkImportMutation,
    setImportResult,
    onComplete,
  ]);

  return {
    importTransactions,
    isImporting: bulkImportMutation.isPending,
  };
}
