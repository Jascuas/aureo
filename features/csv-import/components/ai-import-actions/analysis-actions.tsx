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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      <Button className="w-full sm:w-auto" variant="outline" onClick={onBack}>
        Volver al mapeo
      </Button>
      <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      {showCompletionActions && (
        <>
          <Button className="w-full sm:w-auto" variant="outline" onClick={onRerun}>
            Repetir análisis
          </Button>
          <Button className="w-full sm:w-auto" onClick={onContinue}>
            {duplicatesCount > 0
              ? `Revisar ${duplicatesCount} duplicados`
              : "Continuar a la revisión"}
          </Button>
        </>
      )}
    </div>
  );
}
