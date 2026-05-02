import { ImportSummary } from "@/features/csv-import/components/import-summary";
import {
  useImportResult,
  useImportSessionActions,
} from "@/features/csv-import/store/import-session";
import { useUILoading } from "@/features/csv-import/store/import-ui-state";

interface ImportStepProps {
  onComplete?: () => void;
  onImportAnother?: () => void;
}

export function ImportStep({ onComplete, onImportAnother }: ImportStepProps) {
  const importResult = useImportResult();
  const { reset } = useImportSessionActions();
  const loading = useUILoading();

  if (loading.categorizing || loading.analyzing) return null;
  if (!importResult) return null;

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
