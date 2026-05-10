import { Button } from "@/components/ui/button";

interface AnalysisActionsProps {
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
  onRerun: () => void;
  duplicatesCount: number;
  isAnalyzing: boolean;
  isAnalyzeComplete: boolean;
  hasError: boolean;
}

export function AnalysisActions({
  onBack,
  onCancel,
  onContinue,
  onRerun,
  duplicatesCount,
  isAnalyzing,
  isAnalyzeComplete,
  hasError,
}: AnalysisActionsProps) {
  const showCompletionActions = !isAnalyzing && !hasError && isAnalyzeComplete;

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onBack}>
        Back to Mapping
      </Button>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      {showCompletionActions && (
        <>
          <Button variant="outline" onClick={onRerun}>
            Re-run analysis
          </Button>
          <Button onClick={onContinue}>
            {duplicatesCount > 0
              ? `Review ${duplicatesCount} Duplicates`
              : "Continue to Review"}
          </Button>
        </>
      )}
    </div>
  );
}
