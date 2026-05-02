import { useCallback, useRef } from "react";
import { useBulkImportTransactions } from "@/features/csv-import/api/use-bulk-import-transactions";
import { Resolution } from "@/features/csv-import/const/import-const";
import type {
  DuplicateResolution,
  EnrichedCategorization,
} from "@/features/csv-import/types/import-types";

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
  const isImportingRef = useRef(false);

  const importTransactions = useCallback(async () => {
    if (isImportingRef.current) return;
    isImportingRef.current = true;

    if (!accountId) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: categorizations.length,
        errors: [{ row: 0, message: "No account selected" }],
      });
      isImportingRef.current = false;
      return;
    }

    const rowsToImport = categorizations.filter((cat) => {
      const resolution = resolutions.find(
        (r) => r.csvIndex === cat.csvRowIndex,
      );
      if (resolution?.action === Resolution.Skip) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setImportResult({
        importedCount: 0,
        skippedCount: categorizations.length,
        errorCount: 0,
        errors: [],
      });
      onComplete();
      isImportingRef.current = false;
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

      setImportResult({
        importedCount: result.imported,
        skippedCount: 0,
        errorCount: result.errors.length,
        errors: result.errors.map((err) => ({
          row: 0,
          message: err,
        })),
      });
      onComplete();
    } catch (error: any) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: rowsToImport.length,
        errors: [{ row: 0, message: error?.message || "Import failed" }],
      });
      onComplete();
    } finally {
      isImportingRef.current = false;
    }
  }, [
    accountId,
    categorizations,
    resolutions,
    setImportResult,
    onComplete,
    bulkImportMutation,
  ]);

  return {
    importTransactions,
    isImporting: bulkImportMutation.isPending,
  };
}
