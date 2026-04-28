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
  <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
    <div className="flex gap-2">
      {onSkipAll && matchType === MatchType.Exact && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSkipAll();
            onClose();
          }}
        >
          Skip All Exact Duplicates
        </Button>
      )}
    </div>

    <div className="flex gap-2">
      <Button variant="outline" onClick={onSkip}>
        Skip Import
        <span className="text-muted-foreground ml-2 text-xs">(Esc)</span>
      </Button>
      <Button onClick={onImport}>
        Import Anyway
        <span className="text-muted-foreground ml-2 text-xs">(Enter)</span>
      </Button>
    </div>
  </DialogFooter>
);
