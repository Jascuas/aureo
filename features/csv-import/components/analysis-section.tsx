"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, X } from "lucide-react";

type AnalysisSectionProps = {
  isDetectingDuplicates: boolean;
  isCategorizing: boolean;
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
};

export const AnalysisSection = ({
  isDetectingDuplicates,
  isCategorizing,
  duplicateError,
  categorizeError,
  onRetryDuplicates,
  onRetryCategorize,
  onSkipDuplicates,
  onSkipCategorize,
  batchProgress,
  onCancelAnalysis,
}: AnalysisSectionProps) => {
  const isProcessing = isDetectingDuplicates || isCategorizing;

  const getCurrentTask = () => {
    if (isDetectingDuplicates) return "Detecting duplicates...";
    if (isCategorizing) return "Categorizing transactions...";
    return "Analysis complete";
  };

  return (
    <div className="space-y-6">
      {/* Batch Progress UI */}
      {batchProgress && (
        <div className="border-border bg-muted/50 space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="text-primary size-4 animate-spin" />
              <span className="font-medium">
                {batchProgress.stage === "duplicates"
                  ? "Checking for duplicates..."
                  : "Categorizing with AI..."}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">
                Batch {batchProgress.current} of {batchProgress.total}
              </span>
              {onCancelAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelAnalysis}
                  className="h-8 px-3"
                >
                  <X className="mr-1 size-3" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <Progress
            value={(batchProgress.current / batchProgress.total) * 100}
            className="h-2"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Analyzing Transactions</h3>
          {isProcessing && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{getCurrentTask()}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Duplicate Detection</p>
                <p className="text-muted-foreground text-xs">
                  Checking existing transactions
                </p>
              </div>
              {isDetectingDuplicates && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {!isDetectingDuplicates && !duplicateError && (
                <span className="text-xs text-emerald-500">✓ Complete</span>
              )}
            </div>

            {duplicateError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="size-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-xs">{duplicateError}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetryDuplicates}
                    >
                      Retry
                    </Button>
                    {onSkipDuplicates && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onSkipDuplicates}
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">AI Categorization</p>
                <p className="text-muted-foreground text-xs">
                  Suggesting categories
                </p>
              </div>
              {isCategorizing && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {!isCategorizing && !categorizeError && (
                <span className="text-xs text-emerald-500">✓ Complete</span>
              )}
            </div>

            {categorizeError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="size-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-xs">{categorizeError}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetryCategorize}
                    >
                      Retry
                    </Button>
                    {onSkipCategorize && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onSkipCategorize}
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {!isProcessing && !duplicateError && !categorizeError && (
        <Alert>
          <AlertDescription className="text-sm">
            Analysis complete! Review the transactions below before importing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
