import { useCallback, useRef } from "react";

import { useBulkImportTransactions } from "@/features/csv-import/api/use-bulk-import-transactions";
import { Resolution } from "@/features/csv-import/const/import-const";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import type {
  DuplicateResolution,
  EnrichedCategorization,
  ImportResult,
  ImportRowOutcome,
} from "@/features/csv-import/types/import-types";

type UseTransactionImportOptions = {
  accountId: string | undefined;
  categorizations: EnrichedCategorization[];
  importAttemptId: string;
  preImportFailedOutcomes: ImportRowOutcome[];
  resolutions: DuplicateResolution[];
  setImportResult: (result: ImportResult) => void;
  onComplete: () => void;
};

type UseTransactionImportReturn = {
  importTransactions: () => Promise<void>;
  isImporting: boolean;
};

export function useTransactionImport({
  accountId,
  categorizations,
  importAttemptId,
  preImportFailedOutcomes,
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
      setImportResult(
        buildImportResult(
          preImportFailedOutcomes.concat(
            categorizations.map((categorization) => ({
              csvRowIndex: categorization.csvRowIndex,
              reason: "No se ha seleccionado ninguna cuenta.",
              status: "failed" as const,
            })),
          ),
        ),
      );
      isImportingRef.current = false;
      return;
    }

    const skippedOutcomes: ImportRowOutcome[] = [];
    const rowsToImport = categorizations.filter((categorization) => {
      const resolution = resolutions.find(
        (item) => item.csvIndex === categorization.csvRowIndex,
      );
      if (resolution?.action !== Resolution.Skip) return true;

      skippedOutcomes.push({
        csvRowIndex: categorization.csvRowIndex,
        reason: "Omitida durante la revisión de duplicados.",
        status: "skipped",
      });
      return false;
    });

    if (rowsToImport.length === 0) {
      setImportResult(
        buildImportResult([...preImportFailedOutcomes, ...skippedOutcomes]),
      );
      onComplete();
      isImportingRef.current = false;
      return;
    }

    const outcomes = [...preImportFailedOutcomes, ...skippedOutcomes];
    try {
      for (
        let start = 0;
        start < rowsToImport.length;
        start += CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT
      ) {
        const batch = rowsToImport.slice(
          start,
          start + CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT,
        );

        try {
          const result = await bulkImportMutation.mutateAsync({
            accountId,
            transactions: batch.map((categorization) => {
              const resolution = resolutions.find(
                (item) => item.csvIndex === categorization.csvRowIndex,
              );

              return {
                amount: categorization.amount,
                categoryId: categorization.categoryId,
                csvRowIndex: categorization.csvRowIndex,
                date: categorization.date,
                duplicateResolution:
                  resolution?.action === Resolution.Import
                    ? ("import" as const)
                    : undefined,
                idempotencyKey: `${importAttemptId}:${categorization.csvRowIndex}`,
                notes: categorization.notes || undefined,
                payee: categorization.payee,
                transactionTypeId: categorization.transactionTypeId,
              };
            }),
          });
          outcomes.push(...result.outcomes);
        } catch (error: unknown) {
          const reason =
            error instanceof Error
              ? error.message
              : "Se ha producido un error durante la importación.";
          outcomes.push(
            ...batch.map((categorization) => ({
              csvRowIndex: categorization.csvRowIndex,
              reason,
              status: "failed" as const,
            })),
          );
        }
      }

      setImportResult(buildImportResult(outcomes));
      onComplete();
    } finally {
      isImportingRef.current = false;
    }
  }, [
    accountId,
    bulkImportMutation,
    categorizations,
    importAttemptId,
    onComplete,
    preImportFailedOutcomes,
    resolutions,
    setImportResult,
  ]);

  return {
    importTransactions,
    isImporting: bulkImportMutation.isPending,
  };
}

function buildImportResult(outcomes: ImportRowOutcome[]): ImportResult {
  return [...outcomes]
    .sort((first, second) => first.csvRowIndex - second.csvRowIndex)
    .reduce<ImportResult>(
      (result, outcome) => ({
        ...result,
        errorCount: result.errorCount + (outcome.status === "failed" ? 1 : 0),
        importedCount:
          result.importedCount + (outcome.status === "imported" ? 1 : 0),
        outcomes: [...result.outcomes, outcome],
        skippedCount:
          result.skippedCount +
          (outcome.status === "skipped" || outcome.status === "duplicate" ? 1 : 0),
      }),
      { errorCount: 0, importedCount: 0, outcomes: [], skippedCount: 0 },
    );
}
