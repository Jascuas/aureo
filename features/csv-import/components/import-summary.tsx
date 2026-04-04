"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type ImportSummaryProps = {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
  onImportAnother: () => void;
  onViewTransactions: () => void;
};

export const ImportSummary = ({
  importedCount,
  skippedCount,
  errorCount,
  errors,
  onImportAnother,
  onViewTransactions,
}: ImportSummaryProps) => {
  const totalProcessed = importedCount + skippedCount + errorCount;
  const hasErrors = errorCount > 0;
  const hasPartialSuccess = importedCount > 0 && errorCount > 0;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8">
        {!hasErrors && (
          <>
            <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-emerald-600">Import Complete!</h2>
          </>
        )}
        
        {hasPartialSuccess && (
          <>
            <AlertTriangle className="mb-4 h-16 w-16 text-amber-500" />
            <h2 className="text-2xl font-bold text-amber-600">Import Partially Complete</h2>
          </>
        )}
        
        {errorCount === totalProcessed && (
          <>
            <XCircle className="mb-4 h-16 w-16 text-rose-500" />
            <h2 className="text-2xl font-bold text-rose-600">Import Failed</h2>
          </>
        )}
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Processed</span>
              <span className="text-2xl font-bold">{totalProcessed}</span>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              {importedCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm">Successfully Imported</span>
                  </div>
                  <span className="font-medium text-emerald-600">{importedCount}</span>
                </div>
              )}
              
              {skippedCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Skipped (Duplicates)</span>
                  </div>
                  <span className="font-medium text-amber-600">{skippedCount}</span>
                </div>
              )}
              
              {errorCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-sm">Errors</span>
                  </div>
                  <span className="font-medium text-rose-600">{errorCount}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {errors.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold text-rose-600">Error Details</h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {errors.map((error, idx) => (
                <div key={idx} className="rounded-md bg-rose-50 p-3">
                  <p className="text-xs font-medium text-rose-900">Row {error.row}</p>
                  <p className="text-xs text-rose-700">{error.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-3">
        <Button onClick={onImportAnother} variant="outline" className="flex-1">
          Import Another File
        </Button>
        <Button onClick={onViewTransactions} className="flex-1">
          View Transactions
        </Button>
      </div>
    </div>
  );
};
