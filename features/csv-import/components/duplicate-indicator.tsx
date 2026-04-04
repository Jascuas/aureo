"use client";

import { AlertCircle } from "lucide-react";

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
  matchType: 'exact' | 'fuzzy';
  score: number;
};

export const DuplicateIndicator = ({ 
  existingTransaction, 
  matchType,
  score,
}: DuplicateIndicatorProps) => {
  const scorePercent = Math.round(score * 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="size-4" />
            <span className="text-xs font-medium">
              {matchType === 'exact' ? 'Duplicate' : 'Possible'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs"
          aria-label="Duplicate transaction details"
        >
          <div className="space-y-1">
            <p className="font-semibold">
              {matchType === 'exact' ? 'Exact Match' : 'Fuzzy Match'} ({scorePercent}%)
            </p>
            <div className="text-xs text-muted-foreground">
              <p><span className="font-medium">Date:</span> {existingTransaction.date.toLocaleDateString()}</p>
              <p><span className="font-medium">Payee:</span> {existingTransaction.payee}</p>
              <p><span className="font-medium">Amount:</span> {formatCurrency(existingTransaction.amount)}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
