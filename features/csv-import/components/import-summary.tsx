"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ImportRowOutcome } from "@/features/csv-import/types/import-types";

type ImportSummaryProps = {
  outcomes: ImportRowOutcome[];
  onImportAnother: () => void;
  onViewTransactions: () => void;
};

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
        {!hasErrors ? (
          <>
            <DotLottieReact
              src="/sucess.lottie"
              autoplay
              loop={true}
              segment={[0, 58]}
              className="mb-4 h-32 w-32"
            />

            <h2 className="text-2xl font-bold text-emerald-600">
              Import Complete!
            </h2>
          </>
        ) : (
          <>
            <DotLottieReact
              src="/error.lottie"
              autoplay
              loop={true}
              className="mb-4 h-32 w-32"
            />
            <h2 className="text-2xl font-bold text-rose-600">Import Failed</h2>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Total Processed
              </span>
              <span className="text-2xl font-bold">{outcomes.length}</span>
            </div>

            <Separator />

            <div className="space-y-3">
              {outcomeCounts.imported > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm">Successfully Imported</span>
                  </div>
                  <span className="font-medium text-emerald-600">
                    {outcomeCounts.imported}
                  </span>
                </div>
              )}

              {skippedCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Skipped (Duplicates)</span>
                  </div>
                  <span className="font-medium text-amber-600">
                    {skippedCount}
                  </span>
                </div>
              )}

              {outcomeCounts.failed > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-sm">Errors</span>
                  </div>
                  <span className="font-medium text-rose-600">
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
              Row outcomes
            </h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {outcomes.map((outcome) => (
                <div key={outcome.csvRowIndex} className="rounded-md p-3">
                  <p className="text-xs font-medium">
                    Row {outcome.csvRowIndex + 2}: {outcome.status}
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
