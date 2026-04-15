import { useEffect } from "react";

import { ImportSummary } from "@/features/csv-import/components/import-summary";
import { useDuplicateResolution } from "@/features/csv-import/hooks/use-duplicate-resolution";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useTransactionImport } from "@/features/csv-import/hooks/use-transaction-import";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";

interface ImportStepProps {
  accountId?: string;
  onComplete?: () => void;
  onImportAnother?: () => void;
}

export function ImportStep({
  accountId,
  onComplete,
  onImportAnother,
}: ImportStepProps) {
  const { analyzedRows, importResult, setImportResult, reset } =
    useImportSession();
  const { resolutions } = useDuplicateResolution();
  const { loading } = useImportUIState();

  const { importTransactions } = useTransactionImport({
    accountId,
    categorizations: analyzedRows.categorizations,
    resolutions,
    setImportResult,
    onComplete: () => {},
  });

  useEffect(() => {
    if (!importResult && accountId) {
      importTransactions();
    }
  }, [importResult, accountId, importTransactions]);

  if (loading.categorizing || loading.detectingDuplicates) {
    return null;
  }

  if (!importResult) {
    return null;
  }

  return (
    <ImportSummary
      importedCount={importResult.importedCount}
      skippedCount={importResult.skippedCount}
      errorCount={importResult.errorCount}
      errors={importResult.errors}
      onImportAnother={onImportAnother ?? reset}
      onViewTransactions={() => {
        reset();
        onComplete?.();
      }}
    />
  );
}
