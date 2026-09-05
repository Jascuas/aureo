import { ImportSummary } from "@/features/csv-import/components/import-summary";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useUILoading } from "@/features/csv-import/store/import-ui-state";

interface ImportStepProps {
  onComplete?: () => void;
  onImportAnother?: () => void;
}

export function ImportStep({ onComplete, onImportAnother }: ImportStepProps) {
  const { importResult, reset } = useImportSession();
  const loading = useUILoading();

  if (loading.categorizing || loading.analyzing) return null;
  if (!importResult) return null;

  return (
    <ImportSummary
      outcomes={importResult.outcomes}
      onImportAnother={onImportAnother ?? reset}
      onViewTransactions={() => {
        reset();
        onComplete?.();
      }}
    />
  );
}
