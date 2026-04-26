import { useCallback, useEffect, useRef } from "react";
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

  // Keep a stable ref to mutateAsync so it never appears in useCallback deps.
  // React Query recreates the mutation object on every render; without this,
  // importTransactions would get a new reference each render and the useEffect
  // in ImportStep would re-fire on every render, causing an infinite loop.
  const bulkImportMutateRef = useRef(bulkImportMutation.mutateAsync);
  useEffect(() => {
    bulkImportMutateRef.current = bulkImportMutation.mutateAsync;
  });

  // Guard against concurrent calls (e.g. StrictMode double-invoke or any
  // residual effect re-fire before importResult is set).
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
      if (resolution?.action === "skip") return false;
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
      const result = await bulkImportMutateRef.current({
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
    } finally {
      isImportingRef.current = false;
    }
  }, [accountId, categorizations, resolutions, setImportResult, onComplete]);

  return {
    importTransactions,
    isImporting: bulkImportMutation.isPending,
  };
}
