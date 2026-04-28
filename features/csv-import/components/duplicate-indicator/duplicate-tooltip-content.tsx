import { TooltipContent } from "@/components/ui/tooltip";
import { MatchType } from "@/features/csv-import/const/import-const";
import type { ExistingTransaction } from "@/features/csv-import/types/import-types";
import { formatCurrency } from "@/lib/utils";

type DuplicateTooltipContentProps = {
  matchType: MatchType;
  scorePercent: number;
  existingTransaction: ExistingTransaction;
};

export const DuplicateTooltipContent = ({
  matchType,
  scorePercent,
  existingTransaction,
}: DuplicateTooltipContentProps) => {
  const isExact = matchType === MatchType.Exact;

  return (
    <TooltipContent
      className="max-w-xs"
      aria-label="Duplicate transaction details"
    >
      <div className="space-y-2">
        <p className="font-semibold">
          {isExact ? "Exact Match" : "Fuzzy Match"} ({scorePercent}%)
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
  );
};
