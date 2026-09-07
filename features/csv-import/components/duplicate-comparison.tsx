"use client";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MatchType } from "@/features/csv-import/const/import-const";
import { formatCurrency } from "@/lib/utils";

type DuplicateComparisonProps = {
  csvRow: {
    csvRowIndex: number;
    date: Date;
    payee: string;
    amount: number;
    category?: string;
  };
  existingTransaction: {
    date: Date;
    payee: string;
    amount: number;
  };
  matchType: MatchType;
  score: number;
};

const DIFFERENCE_LABELS = {
  amount: "importe",
  date: "fecha",
  payee: "beneficiario",
} as const;

export const DuplicateComparison = ({
  csvRow,
  existingTransaction,
  matchType,
  score,
}: DuplicateComparisonProps) => {
  const scorePercent = Math.round(score * 100);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDifferences = () => {
    const diffs: (keyof typeof DIFFERENCE_LABELS)[] = [];

    if (csvRow.date.getTime() !== existingTransaction.date.getTime()) {
      diffs.push("date");
    }
    if (csvRow.payee !== existingTransaction.payee) {
      diffs.push("payee");
    }
    if (csvRow.amount !== existingTransaction.amount) {
      diffs.push("amount");
    }

    return diffs;
  };

  const differences = getDifferences();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              matchType === MatchType.Exact ? "warning" : "secondary"
            }
          >
            {matchType === MatchType.Exact ? "Coincidencia exacta" : "Coincidencia aproximada"}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {scorePercent}% de similitud
          </span>
        </div>

        {differences.length > 0 && (
          <span className="text-muted-foreground text-xs">
            Diferencias: {differences.map((difference) => DIFFERENCE_LABELS[difference]).join(", ")}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-crt-amber/40 bg-crt-amber/5 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-crt-amber">
                Fila CSV {csvRow.csvRowIndex + 2} (nueva)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Fecha</p>
              <p className="font-medium">{formatDate(csvRow.date)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs">Beneficiario</p>
              <p className="font-medium">{csvRow.payee}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs">Importe</p>
              <p className="font-medium">
                {formatCurrency(csvRow.amount / 1000)}
              </p>
            </div>
            {csvRow.category && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs">Categoría</p>
                  <p className="font-medium">{csvRow.category}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center md:hidden">
          <ArrowRight className="text-muted-foreground size-6" />
        </div>

        <Card className="border-crt-accent/40 bg-accent/5 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-crt-accent">Transacción existente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Fecha</p>
              <p className="font-medium">
                {formatDate(existingTransaction.date)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs">Beneficiario</p>
              <p className="font-medium">{existingTransaction.payee}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs">Importe</p>
              <p className="font-medium">
                {formatCurrency(existingTransaction.amount / 1000)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
