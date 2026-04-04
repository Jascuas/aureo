"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2 } from "lucide-react";

type AnalysisSectionProps = {
  isDetectingDuplicates: boolean;
  isCategorizing: boolean;
  duplicateError: string | null;
  categorizeError: string | null;
  onRetryDuplicates: () => void;
  onRetryCategorize: () => void;
  onSkipDuplicates?: () => void;
  onSkipCategorize?: () => void;
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
}: AnalysisSectionProps) => {
  const isProcessing = isDetectingDuplicates || isCategorizing;
  
  const getProgress = () => {
    if (!isDetectingDuplicates && !isCategorizing) return 100;
    if (isDetectingDuplicates && isCategorizing) return 25;
    if (!isDetectingDuplicates && isCategorizing) return 75;
    return 50;
  };
  
  const getCurrentTask = () => {
    if (isDetectingDuplicates) return 'Detecting duplicates...';
    if (isCategorizing) return 'Categorizing transactions...';
    return 'Analysis complete';
  };
  
  return (
    <div className="space-y-6">
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
            <span className="font-medium">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Duplicate Detection</p>
                <p className="text-xs text-muted-foreground">Checking existing transactions</p>
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
                    <Button size="sm" variant="outline" onClick={onRetryDuplicates}>
                      Retry
                    </Button>
                    {onSkipDuplicates && (
                      <Button size="sm" variant="ghost" onClick={onSkipDuplicates}>
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
                <p className="text-xs text-muted-foreground">Suggesting categories</p>
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
                    <Button size="sm" variant="outline" onClick={onRetryCategorize}>
                      Retry
                    </Button>
                    {onSkipCategorize && (
                      <Button size="sm" variant="ghost" onClick={onSkipCategorize}>
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
