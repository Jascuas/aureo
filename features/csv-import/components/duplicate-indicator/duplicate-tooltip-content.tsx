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
      aria-label="Detalles de la transacción duplicada"
    >
      <div className="space-y-2">
        <p className="font-semibold">
          {isExact ? "Coincidencia exacta" : "Coincidencia aproximada"} ({scorePercent}%)
        </p>
        <div className="text-muted-foreground text-xs">
          <p>
            <span className="font-medium">Fecha:</span>{" "}
            {existingTransaction.date.toLocaleDateString("es-ES")}
          </p>
          <p>
            <span className="font-medium">Beneficiario:</span>{" "}
            {existingTransaction.payee}
          </p>
          <p>
            <span className="font-medium">Importe:</span>{" "}
            {formatCurrency(existingTransaction.amount / 1000)}
          </p>
        </div>
        <p className="text-xs text-crt-accent">Haz clic para resolver</p>
      </div>
    </TooltipContent>
  );
};
