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
import { useDuplicateResolution } from "@/features/csv-import/hooks/use-duplicate-resolution";
import { useResolutionKeyboard } from "@/features/csv-import/hooks/use-resolution-keyboard";
import { Resolution } from "@/features/csv-import/const/import-const";
import type { DuplicateResolutionProps } from "@/features/csv-import/types/import-types";

import { ResolutionFooter } from "./resolution-footer";

export const DuplicateResolution = ({
  csvRows,
  pendingCount,
  onSkipAll,
}: DuplicateResolutionProps) => {
  const { isOpen, currentDuplicate, closeResolution, resolveAs } =
    useDuplicateResolution();

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
      <DialogContent className="max-w-3xl">
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

        <DuplicateComparison
          csvRow={csvRow}
          existingTransaction={currentDuplicate.existingTransaction}
          matchType={currentDuplicate.matchType}
          score={currentDuplicate.score}
        />

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
