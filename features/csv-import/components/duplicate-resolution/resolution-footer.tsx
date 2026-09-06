import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { MatchType } from "@/features/csv-import/const/import-const";

type ResolutionFooterProps = {
  matchType: MatchType;
  onSkipAll?: () => void;
  onSkip: () => void;
  onImport: () => void;
  onClose: () => void;
};

export const ResolutionFooter = ({
  matchType,
  onSkipAll,
  onSkip,
  onImport,
  onClose,
}: ResolutionFooterProps) => (
  <DialogFooter className="shrink-0 !flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
    <div className="flex w-full gap-2 sm:w-auto">
      {onSkipAll && matchType === MatchType.Exact && (
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => {
            onSkipAll();
            onClose();
          }}
        >
          Omitir todas las duplicadas exactas
        </Button>
      )}
    </div>

    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      <Button className="min-h-11 w-full" variant="outline" onClick={onSkip}>
        Omitir importación
        <span className="text-muted-foreground ml-2 text-xs">(Esc)</span>
      </Button>
      <Button className="min-h-11 w-full" onClick={onImport}>
        Importar de todos modos
        <span className="text-muted-foreground ml-2 text-xs">(Enter)</span>
      </Button>
    </div>
  </DialogFooter>
);
