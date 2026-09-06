"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ImportRowOutcome } from "@/features/csv-import/types/import-types";
import { cn } from "@/lib/utils";

type ImportSummaryProps = {
  outcomes: ImportRowOutcome[];
  onImportAnother: () => void;
  onViewTransactions: () => void;
};

const OUTCOME_STATUS_LABELS = {
  duplicate: "Duplicada",
  failed: "Fallida",
  imported: "Importada",
  skipped: "Omitida",
} as const;

const OUTCOME_STATUS_CLASSES = {
  duplicate: "text-crt-amber",
  failed: "text-destructive",
  imported: "text-crt-pos",
  skipped: "text-muted-foreground",
} as const;

export const ImportSummary = ({
  outcomes,
  onImportAnother,
  onViewTransactions,
}: ImportSummaryProps) => {
  const outcomeCounts = outcomes.reduce(
    (counts, outcome) => ({
      ...counts,
      [outcome.status]: counts[outcome.status] + 1,
    }),
    { duplicate: 0, failed: 0, imported: 0, skipped: 0 },
  );
  const skippedCount = outcomeCounts.skipped + outcomeCounts.duplicate;
  const hasErrors = outcomeCounts.failed > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8">
        {hasErrors ? (
          <XCircle className="text-destructive mb-4 size-16" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="text-crt-pos mb-4 size-16" aria-hidden="true" />
        )}
        <h2 className="text-foreground text-xl font-bold tracking-[0.1em] uppercase">
          {hasErrors ? "Importación incompleta" : "Importación completada"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {hasErrors
            ? "Revisa los resultados y corrige las filas que no se hayan importado."
            : "Las transacciones seleccionadas se han añadido a tu cuenta."}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Total procesado
              </span>
              <span className="text-2xl font-bold">{outcomes.length}</span>
            </div>

            <Separator />

            <div className="space-y-3">
              {outcomeCounts.imported > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-crt-pos size-4" />
                    <span className="text-sm">Importadas correctamente</span>
                  </div>
                  <span className="text-crt-pos font-medium">
                    {outcomeCounts.imported}
                  </span>
                </div>
              )}

              {skippedCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-crt-amber size-4" />
                    <span className="text-sm">Omitidas (duplicadas)</span>
                  </div>
                  <span className="text-crt-amber font-medium">
                    {skippedCount}
                  </span>
                </div>
              )}

              {outcomeCounts.failed > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="text-destructive size-4" />
                    <span className="text-sm">Errores</span>
                  </div>
                  <span className="text-destructive font-medium">
                    {outcomeCounts.failed}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {outcomes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold">
              Resultado de cada fila
            </h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {outcomes.map((outcome) => (
                <div key={outcome.csvRowIndex} className="border-border bg-muted/20 border p-3">
                  <p className={cn("text-xs font-medium", OUTCOME_STATUS_CLASSES[outcome.status])}>
                    Fila {outcome.csvRowIndex + 2}: {OUTCOME_STATUS_LABELS[outcome.status]}
                  </p>
                  {outcome.reason && (
                    <p className="text-muted-foreground text-xs">
                      {outcome.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onImportAnother} variant="outline" className="flex-1">
          Importar otro archivo
        </Button>
        <Button onClick={onViewTransactions} className="flex-1">
          Ver transacciones
        </Button>
      </div>
    </div>
  );
};
