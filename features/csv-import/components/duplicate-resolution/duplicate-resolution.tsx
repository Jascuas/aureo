"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DuplicateComparison } from "@/features/csv-import/components/duplicate-comparison";
import { Resolution } from "@/features/csv-import/const/import-const";
import { useResolutionKeyboard } from "@/features/csv-import/hooks/use-resolution-keyboard";
import {
  useDuplicateDialog,
  useDuplicateResolutionActions,
} from "@/features/csv-import/store/duplicate-resolution";
import type { DuplicateResolutionProps } from "@/features/csv-import/types/import-types";

import { ResolutionFooter } from "./resolution-footer";

export const DuplicateResolution = ({
  csvRows,
  pendingCount,
  onSkipAll,
}: DuplicateResolutionProps) => {
  const { isOpen, currentDuplicate } = useDuplicateDialog();
  const { closeResolution, resolveAs } = useDuplicateResolutionActions();

  useResolutionKeyboard({
    isOpen,
    currentDuplicate,
    resolveAs,
    closeResolution,
  });

  if (!currentDuplicate) return null;

  const csvRow = csvRows.find(
    (r) => r.csvRowIndex === currentDuplicate.csvIndex,
  );
  if (!csvRow) return null;

  const handleSkip = () => {
    resolveAs(currentDuplicate.csvIndex, Resolution.Skip);
    closeResolution();
  };

  const handleImport = () => {
    resolveAs(currentDuplicate.csvIndex, Resolution.Import);
    closeResolution();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeResolution()}>
      <DialogContent className="!flex max-h-[calc(100dvh-2rem)] !w-[calc(100%-2rem)] max-w-3xl !flex-col gap-4 overflow-hidden !p-4 sm:max-h-[calc(100dvh-4rem)] sm:!w-full sm:!p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Duplicate Transaction Detected</DialogTitle>
            {pendingCount > 1 && (
              <Badge variant="secondary">{pendingCount} pending</Badge>
            )}
          </div>
          <DialogDescription>
            This transaction might already exist in your account. Compare both
            versions and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          <DuplicateComparison
            csvRow={csvRow}
            existingTransaction={currentDuplicate.existingTransaction}
            matchType={currentDuplicate.matchType}
            score={currentDuplicate.score}
          />
        </div>

        <ResolutionFooter
          matchType={currentDuplicate.matchType}
          onSkipAll={onSkipAll}
          onSkip={handleSkip}
          onImport={handleImport}
          onClose={closeResolution}
        />
      </DialogContent>
    </Dialog>
  );
};
