"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DuplicateTooltipContent } from "@/features/csv-import/components/duplicate-indicator/duplicate-tooltip-content";
import { ResolvedBadge } from "@/features/csv-import/components/duplicate-indicator/resolved-badge";
import { MatchType } from "@/features/csv-import/const/import-const";
import type { DuplicateIndicatorProps } from "@/features/csv-import/types/import-types";

export const DuplicateIndicator = ({
  existingTransaction,
  matchType,
  score,
  onResolve,
  isResolved,
  resolution,
}: DuplicateIndicatorProps) => {
  const scorePercent = Math.round(score * 100);

  if (isResolved && resolution) {
    return <ResolvedBadge resolution={resolution} onResolve={onResolve} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-amber-500 hover:text-amber-600"
            onClick={onResolve}
          >
            <span className="text-xs font-medium">
              {matchType === MatchType.Exact ? "Duplicate" : "Possible"}
            </span>
            <AlertCircle className="size-4" />
          </Button>
        </TooltipTrigger>
        <DuplicateTooltipContent
          matchType={matchType}
          scorePercent={scorePercent}
          existingTransaction={existingTransaction}
        />
      </Tooltip>
    </TooltipProvider>
  );
};
