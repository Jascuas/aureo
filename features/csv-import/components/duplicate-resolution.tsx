"use client";

import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useDuplicateResolution } from "@/features/csv-import/hooks/use-duplicate-resolution";
import { DuplicateComparison } from "@/features/csv-import/components/duplicate-comparison";

type DuplicateResolutionProps = {
  csvRows: Array<{
    csvRowIndex: number;
    date: Date;
    payee: string;
    amount: number;
    category?: string;
  }>;
  pendingCount: number;
  onSkipAll?: () => void;
};

export const DuplicateResolution = ({
  csvRows,
  pendingCount,
  onSkipAll,
}: DuplicateResolutionProps) => {
  const { isOpen, currentDuplicate, closeResolution, resolveAs } =
    useDuplicateResolution();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !currentDuplicate) return;

      if (e.key === "Escape") {
        e.preventDefault();
        resolveAs(currentDuplicate.csvIndex, "skip");
        closeResolution();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        resolveAs(currentDuplicate.csvIndex, "import");
        closeResolution();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentDuplicate, resolveAs, closeResolution]);

  if (!currentDuplicate) return null;

  const csvRow = csvRows.find(
    (r) => r.csvRowIndex === currentDuplicate.csvIndex,
  );
  if (!csvRow) return null;

  const handleSkip = () => {
    resolveAs(currentDuplicate.csvIndex, "skip");
    closeResolution();
  };

  const handleImport = () => {
    resolveAs(currentDuplicate.csvIndex, "import");
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

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {onSkipAll && currentDuplicate.matchType === "exact" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSkipAll();
                  closeResolution();
                }}
              >
                Skip All Exact Duplicates
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip Import
              <span className="text-muted-foreground ml-2 text-xs">(Esc)</span>
            </Button>
            <Button onClick={handleImport}>
              Import Anyway
              <span className="text-muted-foreground ml-2 text-xs">
                (Enter)
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
