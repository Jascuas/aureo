"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type AnalysisSectionProps = {
  isDetectingDuplicates: boolean;
  isCategorizing: boolean;
  isDuplicatesComplete?: boolean;
  isCategorizationStarted: boolean;
  duplicateError: string | null;
  categorizeError: string | null;
  onRetryDuplicates: () => void;
  onRetryCategorize: () => void;
  onSkipDuplicates?: () => void;
  onSkipCategorize?: () => void;
  batchProgress?: {
    current: number;
    total: number;
    stage: "duplicates" | "categorization";
  } | null;
  onCancelAnalysis?: () => void;
  simulatedProgress?: number;
  totalTransactions?: number;
};

export const AnalysisSection = ({
  isDetectingDuplicates,
  isCategorizing,
  isDuplicatesComplete = false,
  isCategorizationStarted,
  duplicateError,
  categorizeError,
  onRetryDuplicates,
  onRetryCategorize,
  batchProgress,
  simulatedProgress,
  totalTransactions,
}: AnalysisSectionProps) => {
  const getDynamicTitle = () => {
    if (isDetectingDuplicates) return "Detecting duplicates...";
    if (isCategorizing) return "Categorizing transactions with AI...";
    return "Analysis complete";
  };

  const progressValue = (() => {
    if (batchProgress != null) {
      if (batchProgress.stage === "duplicates") {
        return (
          simulatedProgress ??
          (batchProgress.current / batchProgress.total) * 100
        );
      }
      return (batchProgress.current / batchProgress.total) * 100;
    }
    if (isDetectingDuplicates && simulatedProgress != null) {
      return simulatedProgress;
    }
    return 100;
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
      {/* Row 1 — Dynamic Title */}
      <h3 className="text-lg font-medium">{getDynamicTitle()}</h3>

      {/* Row 2 — Progress Bar */}
      <div className="space-y-1">
        <Progress value={progressValue} className="h-2" />
        {progressLabel != null ? (
          <p className="text-muted-foreground text-xs">{progressLabel}</p>
        ) : null}
      </div>

      {/* Row 3 — Two Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Duplicate Detection Card */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Duplicate Detection</p>
              <p className="text-muted-foreground text-xs">
                Checking existing transactions
              </p>
            </div>
            {isDetectingDuplicates && (
              <Loader2 className="text-primary size-4 animate-spin" />
            )}
            {isDuplicatesComplete &&
              !isDetectingDuplicates &&
              !duplicateError && (
                <CheckCircle2 className="size-4 text-emerald-500" />
              )}
            {duplicateError && (
              <AlertCircle className="text-destructive size-4" />
            )}
          </div>

          {duplicateError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-xs">{duplicateError}</span>
                <Button size="sm" variant="outline" onClick={onRetryDuplicates}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* AI Categorization Card */}
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
            {!isCategorizationStarted && (
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
