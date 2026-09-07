"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BatchProgress } from "@/features/csv-import/types/import-types";

type AnalysisSectionProps = {
  analyzeError: string | null;
  batchProgress?: BatchProgress | null;
  isAnalyzeComplete: boolean;
  isAnalyzing: boolean;
  onRetryAnalyze: () => void;
};

export const AnalysisSection = ({
  analyzeError,
  batchProgress,
  isAnalyzeComplete,
  isAnalyzing,
  onRetryAnalyze,
}: AnalysisSectionProps) => {
  const title = isAnalyzing
    ? "Analizando transacciones…"
    : isAnalyzeComplete
      ? "Análisis completado"
      : analyzeError
        ? "Análisis fallido"
        : "Preparando el análisis…";
  const progressValue = batchProgress
    ? (batchProgress.current / batchProgress.total) * 100
    : isAnalyzeComplete
      ? 100
      : 0;

  return (
    <div className="space-y-6">
      <h3 className="text-foreground text-lg font-medium">{title}</h3>
      <Progress value={progressValue} className="h-2 [&>div]:bg-accent" />
      <div className="border-border bg-card border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Análisis y categorización</p>
            <p className="text-muted-foreground text-xs">
              Detección de duplicados, coincidencias de beneficiarios y sugerencias de categorías
            </p>
          </div>
          {isAnalyzing ? (
            <Loader2 className="text-crt-accent size-4 animate-spin" />
          ) : isAnalyzeComplete && !analyzeError ? (
            <CheckCircle2 className="text-crt-pos size-4" />
          ) : analyzeError ? (
            <AlertCircle className="text-destructive size-4" />
          ) : null}
        </div>
        {analyzeError ? (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="size-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-xs">{analyzeError}</span>
              <Button size="sm" variant="outline" onClick={onRetryAnalyze}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
};
