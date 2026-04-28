"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BatchProgress } from "@/features/csv-import/types/import-types";
import { cn } from "@/lib/utils";

type AnalysisSectionProps = {
  isAnalyzing: boolean;
  isCategorizing: boolean;
  isAnalyzeComplete: boolean;
  isCategorizationStarted: boolean;
  analyzeError: string | null;
  categorizeError: string | null;
  onRetryAnalyze: () => void;
  onRetryCategorize: () => void;
  onCancelAnalysis?: () => void;
  batchProgress?: BatchProgress | null;
  totalTransactions?: number;
};

export const AnalysisSection = ({
  isAnalyzing,
  isCategorizing,
  isAnalyzeComplete,
  isCategorizationStarted,
  analyzeError,
  categorizeError,
  onRetryAnalyze,
  onRetryCategorize,
  batchProgress,
  totalTransactions,
}: AnalysisSectionProps) => {
  const getDynamicTitle = () => {
    if (isAnalyzing) return "Analyzing transactions...";
    if (isCategorizing) return "Categorizing transactions with AI...";
    return "Analysis complete";
  };

  const progressValue = (() => {
    if (!batchProgress) return isAnalyzeComplete && !isCategorizing ? 100 : 0;
    if (batchProgress.stage === "analyzing")
      return (batchProgress.current / batchProgress.total) * 50;
    return 50 + (batchProgress.current / batchProgress.total) * 50;
  })();

  const progressLabel = (() => {
    if (
      batchProgress?.stage === "categorization" &&
      totalTransactions != null
    ) {
      const done = Math.min(batchProgress.current * 30, totalTransactions);
      return `${done} of ${totalTransactions} transactions`;
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* Title */}
      <h3 className="text-lg font-medium">{getDynamicTitle()}</h3>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress
          value={progressValue}
          className="[&>div]:bg-brand-green h-2"
        />
        {progressLabel != null ? (
          <p className="text-muted-foreground text-xs">{progressLabel}</p>
        ) : null}
      </div>

      {/* Two Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Phase 1 — Analysis Card */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Analysis</p>
              <p className="text-muted-foreground text-xs">
                Duplicate detection &amp; payee matching
              </p>
            </div>
            {isAnalyzing && (
              <Loader2 className="text-primary size-4 animate-spin" />
            )}
            {isAnalyzeComplete && !isAnalyzing && !analyzeError && (
              <CheckCircle2 className="size-4 text-emerald-500" />
            )}
            {analyzeError && (
              <AlertCircle className="text-destructive size-4" />
            )}
          </div>

          {analyzeError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-xs">{analyzeError}</span>
                <Button size="sm" variant="outline" onClick={onRetryAnalyze}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Phase 2 — AI Categorization Card */}
        <div
          className={cn(
            "rounded-lg border p-4 transition-opacity duration-300",
            !isCategorizationStarted && "opacity-50",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Categorization</p>
              <p className="text-muted-foreground text-xs">
                Suggesting categories
              </p>
            </div>
            {!isCategorizationStarted && !categorizeError && (
              <Clock className="text-muted-foreground size-4" />
            )}
            {isCategorizing && (
              <Loader2 className="text-primary size-4 animate-spin" />
            )}
            {!isCategorizing && isCategorizationStarted && !categorizeError && (
              <CheckCircle2 className="size-4 text-emerald-500" />
            )}
            {categorizeError && (
              <AlertCircle className="text-destructive size-4" />
            )}
          </div>

          {categorizeError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-xs">{categorizeError}</span>
                <Button size="sm" variant="outline" onClick={onRetryCategorize}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};
