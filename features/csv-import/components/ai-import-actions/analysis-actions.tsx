import { Button } from "@/components/ui/button";

interface AnalysisActionsProps {
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
  duplicatesCount: number;
  isAnalyzing: boolean;
  hasError: boolean;
}

export function AnalysisActions({
  onBack,
  onCancel,
  onContinue,
  duplicatesCount,
  isAnalyzing,
  hasError,
}: AnalysisActionsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onBack}>
        Back to Mapping
      </Button>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      {!isAnalyzing && !hasError && (
        <Button onClick={onContinue}>
          {duplicatesCount > 0
            ? `Review ${duplicatesCount} Duplicates`
            : "Continue to Review"}
        </Button>
      )}
    </div>
  );
}
