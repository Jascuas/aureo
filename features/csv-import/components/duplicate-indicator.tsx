"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

type DuplicateIndicatorProps = {
  existingTransaction: {
    date: Date;
    amount: number;
    payee: string;
  };
  matchType: "exact" | "fuzzy";
  score: number;
  onResolve?: () => void;
  isResolved?: boolean;
  resolution?: "skip" | "import";
};

export const DuplicateIndicator = ({
  existingTransaction,
  matchType,
  score,
  onResolve,
  isResolved,
  resolution,
}: DuplicateIndicatorProps) => {
  const scorePercent = Math.round(score * 100);

  // Show resolved state if decided
  if (isResolved && resolution) {
    const displayText = resolution === "skip" ? "Skipped" : "Will Import";
    const colorClass =
      resolution === "skip" ? "text-muted-foreground" : "text-blue-600";

    return (
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${colorClass}`}>
          {displayText}
        </span>
        {onResolve && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onResolve}
          >
            Change
          </Button>
        )}
      </div>
    );
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
            <AlertCircle className="size-4" />
            <span className="text-xs font-medium">
              {matchType === "exact" ? "Duplicate" : "Possible"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs"
          aria-label="Duplicate transaction details"
        >
          <div className="space-y-2">
            <p className="font-semibold">
              {matchType === "exact" ? "Exact Match" : "Fuzzy Match"} (
              {scorePercent}%)
            </p>
            <div className="text-muted-foreground text-xs">
              <p>
                <span className="font-medium">Date:</span>{" "}
                {existingTransaction.date.toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Payee:</span>{" "}
                {existingTransaction.payee}
              </p>
              <p>
                <span className="font-medium">Amount:</span>{" "}
                {formatCurrency(existingTransaction.amount)}
              </p>
            </div>
            <p className="text-xs text-blue-600">Click to resolve</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
