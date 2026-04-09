"use client";

import { AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { convertAmountToMilliunits, parseAmount } from "@/lib/utils";

import { useBulkImportTransactions } from "../api/use-bulk-import-transactions";
import { useCategorizeTransactions } from "../api/use-categorize-transactions";
import { useDetectDuplicates } from "../api/use-detect-duplicates";
import { useGetTemplates } from "../api/use-get-templates";
import { useDuplicateResolution } from "../hooks/use-duplicate-resolution";
import { useImportSession } from "../hooks/use-import-session";
import { parseDate } from "../lib/date-parser";
import type { ParsedCSVRow } from "../types/import-types";
import { AiPreviewTable } from "./ai-preview-table";
import { AnalysisSection } from "./analysis-section";
import { ColumnMapping } from "./column-mapping";
import { DuplicateResolution } from "./duplicate-resolution";
import { FileUploadSection } from "./file-upload-section";
import { ImportStepper } from "./import-stepper";
import { ImportSummary } from "./import-summary";

type AiImportCardProps = {
  accountId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
};

export const AiImportCard = ({
  accountId,
  onComplete,
  onCancel,
}: AiImportCardProps) => {
  const {
    currentStep,
    csvData,
    columnMapping,
    analyzedRows,
    importResult,
    setCSVData,
    setDetectionResult,
    setFinalMapping,
    setDuplicates,
    setCategorizations,
    setImportResult,
    nextStep,
    previousStep,
    reset,
  } = useImportSession();

  const {
    resolutions,
    skipAllExact,
    getPendingCount,
    reset: resetResolutions,
  } = useDuplicateResolution();
  const detectDuplicatesMutation = useDetectDuplicates();
  const categorizeMutation = useCategorizeTransactions();
  const bulkImportMutation = useBulkImportTransactions();
  const { data: templatesResponse } = useGetTemplates(accountId);

  const [isParsingCSV, setIsParsingCSV] = useState(false);
  const [isDetectingColumns, setIsDetectingColumns] = useState(false);
  const [isDetectingDuplicates, setIsDetectingDuplicates] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const pendingDuplicatesCount = getPendingCount(analyzedRows.duplicates);

  // ============================================================================
  // STEP 1: UPLOAD + Column Detection
  // ============================================================================

  const handleFileSelected = useCallback(
    async (file: File) => {
      setUploadError(null);
      setIsParsingCSV(true);

      try {
        // Parse CSV
        Papa.parse<string[]>(file, {
          complete: async (results) => {
            if (!results.data || results.data.length < 2) {
              setUploadError("CSV file is empty or has no data rows");
              setIsParsingCSV(false);
              return;
            }

            const headers = results.data[0];
            const rows: ParsedCSVRow[] = results.data
              .slice(1)
              .filter((row) => row.some((cell) => cell.trim())) // Filter empty rows
              .map((row, index) => ({
                index,
                data: row,
              }));

            if (rows.length === 0) {
              setUploadError("CSV contains only headers, no data rows");
              setIsParsingCSV(false);
              return;
            }

            setCSVData(file.name, headers, rows);
            resetResolutions(); // Reset duplicate resolutions for new import
            setIsParsingCSV(false);

            // Auto-trigger column detection
            handleColumnDetection(headers, rows);
          },
          error: (error) => {
            setUploadError(`Failed to parse CSV: ${error.message}`);
            setIsParsingCSV(false);
          },
          skipEmptyLines: true,
        });
      } catch (error: any) {
        setUploadError(error?.message || "Failed to process file");
        setIsParsingCSV(false);
      }
    },
    [setCSVData, resetResolutions],
  );

  const handleColumnDetection = async (
    headers: string[],
    rows: ParsedCSVRow[],
  ) => {
    setDetectionError(null);
    setIsDetectingColumns(true);

    try {
      // Simple heuristic detection
      const detectionResult = {
        columns: headers.map((header, index) => {
          let type:
            | "date"
            | "amount"
            | "payee"
            | "description"
            | "notes"
            | "category"
            | "balance"
            | "unknown" = "unknown";
          let confidence = 0;

          const lowerHeader = header.toLowerCase();

          if (/(date|fecha|datum)/i.test(lowerHeader)) {
            type = "date";
            confidence = 0.9;
          } else if (/(amount|importe|monto|valor)/i.test(lowerHeader)) {
            type = "amount";
            confidence = 0.9;
          } else if (
            /(payee|merchant|tienda|comercio|beneficiario)/i.test(lowerHeader)
          ) {
            type = "payee";
            confidence = 0.85;
          } else if (/(description|desc|concepto|detalle)/i.test(lowerHeader)) {
            type = "description";
            confidence = 0.8;
          } else if (/(note|nota)/i.test(lowerHeader)) {
            type = "notes";
            confidence = 0.75;
          } else if (/(category|categor)/i.test(lowerHeader)) {
            type = "category";
            confidence = 0.8;
          } else if (/(balance|saldo)/i.test(lowerHeader)) {
            type = "balance";
            confidence = 0.8;
          }

          const samples = rows.slice(0, 5).map((r) => r.data[index] || "");

          return {
            index,
            name: header,
            type,
            confidence,
            samples,
          };
        }),
        dateFormat: "DD/MM/YYYY" as const,
        amountFormat: {
          decimalSeparator: "," as const,
          thousandsSeparator: "." as const,
          isNegativeExpense: true,
        },
        confidence: 0.85,
        method: "heuristic" as const,
      };

      setDetectionResult(detectionResult);

      const autoMapping: Record<string, number> = {};
      detectionResult.columns.forEach((col) => {
        if (col.type !== "unknown") {
          autoMapping[col.type] = col.index;
        }
      });
      setFinalMapping(autoMapping);
    } catch (error) {
      setDetectionError("Failed to detect columns. Please map them manually.");
    } finally {
      setIsDetectingColumns(false);
    }
  };

  // ============================================================================
  // STEP 2: MAPPING
  // ============================================================================

  const handleMappingConfirm = useCallback(() => {
    if (!columnMapping.finalMapping) {
      setDetectionError("Please complete the column mapping");
      return;
    }

    // Validate required fields
    const { date, amount, payee } = columnMapping.finalMapping;
    if (date === undefined || amount === undefined || payee === undefined) {
      setDetectionError("Date, Amount, and Payee columns are required");
      return;
    }

    setDetectionError(null);
    nextStep();
  }, [columnMapping.finalMapping, nextStep]);

  // ============================================================================
  // STEP 3: ANALYSIS (Parallel: Duplicates + Categorization)
  // ============================================================================

  const handleAnalysis = useCallback(async () => {
    if (!csvData || !columnMapping.finalMapping) return;

    setAnalysisError(null);
    setIsDetectingDuplicates(true);
    setIsCategorizing(true);

    const mapping = columnMapping.finalMapping;
    const amountFormat = columnMapping.detectionResult?.amountFormat || {
      decimalSeparator: "," as const,
      thousandsSeparator: "." as const,
      isNegativeExpense: true,
    };
    const dateFormat = columnMapping.detectionResult?.dateFormat || "DD/MM/YY";

    const transactionsForAnalysis = csvData.rows.map((row) => {
      const amountValue = parseAmount(
        row.data[mapping.amount!],
        amountFormat.decimalSeparator,
        amountFormat.thousandsSeparator,
      );

      const dateValue = row.data[mapping.date!];
      let parsedDate = parseDate(dateValue, dateFormat);

      // Fallback: If format has YYYY but parsing fails, try YY variant
      if (!parsedDate && dateFormat.includes("YYYY")) {
        const yyFormat = dateFormat.replace("YYYY", "YY") as any;
        parsedDate = parseDate(dateValue, yyFormat);
      }

      const dateISO = parsedDate?.toISOString().split("T")[0] || dateValue;

      return {
        csvRowIndex: row.index,
        date: dateISO,
        amount: convertAmountToMilliunits(amountValue),
        payee: row.data[mapping.payee!],
        description:
          mapping.description !== undefined
            ? row.data[mapping.description]
            : undefined,
        notes:
          mapping.notes !== undefined ? row.data[mapping.notes] : undefined,
      };
    });

    try {
      // Batch processing to respect API limits
      const DUPLICATE_BATCH_SIZE = 100;
      const CATEGORIZE_BATCH_SIZE = 50;

      // Process duplicates in batches
      const duplicateBatches = [];
      for (
        let i = 0;
        i < transactionsForAnalysis.length;
        i += DUPLICATE_BATCH_SIZE
      ) {
        const batch = transactionsForAnalysis.slice(
          i,
          i + DUPLICATE_BATCH_SIZE,
        );
        duplicateBatches.push(
          detectDuplicatesMutation.mutateAsync({
            transactions: batch.map((t) => ({
              date: t.date,
              amount: t.amount,
              payee: t.payee,
            })),
          }),
        );
      }

      // Process categorization in batches
      const categorizeBatches = [];
      for (
        let i = 0;
        i < transactionsForAnalysis.length;
        i += CATEGORIZE_BATCH_SIZE
      ) {
        const batch = transactionsForAnalysis.slice(
          i,
          i + CATEGORIZE_BATCH_SIZE,
        );
        categorizeBatches.push(
          categorizeMutation.mutateAsync({
            transactions: batch,
          }),
        );
      }

      // Wait for all batches to complete
      const [duplicateResults, categorizeResults] = await Promise.all([
        Promise.all(duplicateBatches),
        Promise.all(categorizeBatches),
      ]);

      // Combine duplicate results
      const allDuplicates = duplicateResults.flatMap((result) => {
        if (!("data" in result))
          throw new Error("Invalid duplicate detection response");
        return result.data.duplicates;
      });

      // Combine categorization results
      const allCategorizations = categorizeResults.flatMap((result) => {
        if (!("data" in result))
          throw new Error("Invalid categorization response");
        return result.data.results;
      });

      // Enrich categorizations with original transaction data
      const enrichedCategorizations = allCategorizations.map((cat: any) => {
        const originalTx = transactionsForAnalysis.find(
          (t) => t.csvRowIndex === cat.csvRowIndex,
        );
        return {
          ...cat,
          date: originalTx?.date || "",
          amount: originalTx?.amount || 0,
          payee: originalTx?.payee || "",
          notes: originalTx?.notes,
        };
      });

      // Transform duplicates (date string → Date)
      const transformedDuplicates = allDuplicates.map((dup: any) => ({
        ...dup,
        existingTransaction: {
          ...dup.existingTransaction,
          date: new Date(dup.existingTransaction.date),
        },
      }));

      setDuplicates(transformedDuplicates);
      setCategorizations(enrichedCategorizations);
    } catch (error: any) {
      setAnalysisError(error?.message || "Failed to analyze transactions");
    } finally {
      setIsDetectingDuplicates(false);
      setIsCategorizing(false);
    }
  }, [
    csvData,
    columnMapping.finalMapping,
    detectDuplicatesMutation,
    categorizeMutation,
    setDuplicates,
    setCategorizations,
  ]);

  // Auto-apply template and skip to ANALYSIS if template exists for this account
  useEffect(() => {
    if (
      currentStep === "MAPPING" &&
      csvData &&
      accountId &&
      templatesResponse &&
      "data" in templatesResponse &&
      templatesResponse.data.length > 0
    ) {
      const template = templatesResponse.data[0]; // Use the most recent template

      // Validate template compatibility with current CSV
      const templateIndices = Object.values(
        template.columnMapping as Record<string, number>,
      );
      const maxIndex = Math.max(...templateIndices);

      if (maxIndex >= csvData.headers.length) {
        // Template incompatible - stay in MAPPING step
        return;
      }

      // Apply the template mapping
      setDetectionResult({
        columns: Object.entries(
          template.columnMapping as Record<string, number>,
        ).map(([type, index]) => ({
          index: index,
          name: csvData.headers[index] || `Column ${index}`,
          type: type as any,
          confidence: 1.0,
          samples: [],
        })),
        dateFormat: template.dateFormat as any,
        amountFormat: template.amountFormat as any,
        confidence: 1.0,
        method: "heuristic" as const,
      });

      setFinalMapping(template.columnMapping as Record<string, number>);

      // Skip to ANALYSIS
      nextStep();
    }
  }, [
    currentStep,
    csvData,
    accountId,
    templatesResponse,
    setDetectionResult,
    setFinalMapping,
    nextStep,
  ]);

  useEffect(() => {
    if (
      currentStep === "ANALYSIS" &&
      !isDetectingDuplicates &&
      !isCategorizing &&
      !analysisError &&
      analyzedRows.categorizations.length === 0
    ) {
      handleAnalysis();
    }
  }, [
    currentStep,
    handleAnalysis,
    isDetectingDuplicates,
    isCategorizing,
    analysisError,
    analyzedRows.categorizations.length,
  ]);

  useEffect(() => {
    if (
      currentStep === "ANALYSIS" &&
      !isDetectingDuplicates &&
      !isCategorizing &&
      !analysisError &&
      analyzedRows.categorizations.length > 0 &&
      analyzedRows.duplicates.length === 0
    ) {
      nextStep();
    }
  }, [
    currentStep,
    isDetectingDuplicates,
    isCategorizing,
    analysisError,
    analyzedRows,
    nextStep,
  ]);

  const handleRetryDuplicates = useCallback(async () => {
    if (!csvData || !columnMapping.finalMapping) return;

    setAnalysisError(null);
    setIsDetectingDuplicates(true);

    const mapping = columnMapping.finalMapping;
    const amountFormat = columnMapping.detectionResult?.amountFormat || {
      decimalSeparator: "," as const,
      thousandsSeparator: "." as const,
      isNegativeExpense: true,
    };
    const dateFormat = columnMapping.detectionResult?.dateFormat || "DD/MM/YY";

    const transactionsForDuplicates = csvData.rows.map((row) => {
      const dateValue = row.data[mapping.date!];
      let parsedDate = parseDate(dateValue, dateFormat);

      // Fallback: If format has YYYY but parsing fails, try YY variant
      if (!parsedDate && dateFormat.includes("YYYY")) {
        const yyFormat = dateFormat.replace("YYYY", "YY") as any;
        parsedDate = parseDate(dateValue, yyFormat);
      }

      const dateISO = parsedDate?.toISOString().split("T")[0] || dateValue;

      return {
        date: dateISO,
        amount: convertAmountToMilliunits(
          parseAmount(
            row.data[mapping.amount!],
            amountFormat.decimalSeparator,
            amountFormat.thousandsSeparator,
          ),
        ),
        payee: row.data[mapping.payee!],
      };
    });

    try {
      // Batch processing for duplicates (max 100 per batch)
      const BATCH_SIZE = 100;
      const batches = [];

      for (let i = 0; i < transactionsForDuplicates.length; i += BATCH_SIZE) {
        const batch = transactionsForDuplicates.slice(i, i + BATCH_SIZE);
        batches.push(
          detectDuplicatesMutation.mutateAsync({
            transactions: batch,
          }),
        );
      }

      const results = await Promise.all(batches);
      const allDuplicates = results.flatMap((result) => {
        if (!("data" in result))
          throw new Error("Invalid duplicate detection response");
        return result.data.duplicates;
      });

      const transformedDuplicates = allDuplicates.map((dup: any) => ({
        ...dup,
        existingTransaction: {
          ...dup.existingTransaction,
          date: new Date(dup.existingTransaction.date),
        },
      }));
      setDuplicates(transformedDuplicates);
    } catch (error: any) {
      setAnalysisError(error?.message || "Failed to detect duplicates");
    } finally {
      setIsDetectingDuplicates(false);
    }
  }, [
    csvData,
    columnMapping.finalMapping,
    detectDuplicatesMutation,
    setDuplicates,
  ]);

  const handleRetryCategorize = useCallback(async () => {
    if (!csvData || !columnMapping.finalMapping) return;

    setAnalysisError(null);
    setIsCategorizing(true);

    const mapping = columnMapping.finalMapping;
    const amountFormat = columnMapping.detectionResult?.amountFormat || {
      decimalSeparator: "," as const,
      thousandsSeparator: "." as const,
      isNegativeExpense: true,
    };
    const dateFormat = columnMapping.detectionResult?.dateFormat || "DD/MM/YY";

    const transactionsForCategorize = csvData.rows.map((row) => {
      const dateValue = row.data[mapping.date!];
      let parsedDate = parseDate(dateValue, dateFormat);

      // Fallback: If format has YYYY but parsing fails, try YY variant
      if (!parsedDate && dateFormat.includes("YYYY")) {
        const yyFormat = dateFormat.replace("YYYY", "YY") as any;
        parsedDate = parseDate(dateValue, yyFormat);
      }

      const dateISO = parsedDate?.toISOString().split("T")[0] || dateValue;

      return {
        csvRowIndex: row.index,
        date: dateISO,
        amount: convertAmountToMilliunits(
          parseAmount(
            row.data[mapping.amount!],
            amountFormat.decimalSeparator,
            amountFormat.thousandsSeparator,
          ),
        ),
        payee: row.data[mapping.payee!],
        description:
          mapping.description !== undefined
            ? row.data[mapping.description]
            : undefined,
        notes:
          mapping.notes !== undefined ? row.data[mapping.notes] : undefined,
      };
    });

    try {
      // Batch processing for categorization (max 50 per batch)
      const BATCH_SIZE = 50;
      const batches = [];

      for (let i = 0; i < transactionsForCategorize.length; i += BATCH_SIZE) {
        const batch = transactionsForCategorize.slice(i, i + BATCH_SIZE);
        batches.push(
          categorizeMutation.mutateAsync({
            transactions: batch,
          }),
        );
      }

      const results = await Promise.all(batches);
      const allCategorizations = results.flatMap((result) => {
        if (!("data" in result))
          throw new Error("Invalid categorization response");
        return result.data.results;
      });

      const enrichedCategorizations = allCategorizations.map((cat: any) => {
        const originalTx = transactionsForCategorize.find(
          (t) => t.csvRowIndex === cat.csvRowIndex,
        );
        return {
          ...cat,
          date: originalTx?.date || "",
          amount: originalTx?.amount || 0,
          payee: originalTx?.payee || "",
          notes: originalTx?.notes,
        };
      });
      setCategorizations(enrichedCategorizations);
    } catch (error: any) {
      setAnalysisError(error?.message || "Failed to categorize transactions");
    } finally {
      setIsCategorizing(false);
    }
  }, [
    csvData,
    columnMapping.finalMapping,
    categorizeMutation,
    setCategorizations,
  ]);

  // ============================================================================
  // STEP 4: REVIEW → IMPORT
  // ============================================================================

  const handleImport = useCallback(async () => {
    if (!accountId) {
      setAnalysisError("No account selected");
      return;
    }

    // Filter transactions to import (exclude skipped duplicates only)
    const rowsToImport = analyzedRows.categorizations.filter((cat) => {
      const resolution = resolutions.find(
        (r) => r.csvIndex === cat.csvRowIndex,
      );
      if (resolution?.action === "skip") return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setAnalysisError("No transactions to import");
      return;
    }

    try {
      const result = await bulkImportMutation.mutateAsync({
        accountId,
        transactions: rowsToImport.map((cat) => {
          return {
            date: cat.date,
            amount: cat.amount,
            payee: cat.payee,
            notes: cat.notes || undefined,
            categoryId: cat.categoryId,
            transactionTypeId: cat.transactionTypeId,
          };
        }),
      });

      if ("data" in result) {
        const skippedCount = analyzedRows.duplicates.filter(
          (dup) =>
            resolutions.find((r) => r.csvIndex === dup.csvIndex)?.action ===
            "skip",
        ).length;

        setImportResult({
          importedCount: result.data.imported,
          skippedCount,
          errorCount: result.data.errors.length,
          errors: result.data.errors.map((err: any) => ({
            row: 0,
            message: err,
          })),
        });

        nextStep(); // Go to IMPORT summary
      }
    } catch (error: any) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errorCount: rowsToImport.length,
        errors: [{ row: 0, message: error?.message || "Import failed" }],
      });
      nextStep(); // Show error summary
    }
  }, [
    accountId,
    analyzedRows,
    resolutions,
    bulkImportMutation,
    setImportResult,
    nextStep,
  ]);

  // ============================================================================
  // UI Handlers
  // ============================================================================

  const handleCancel = () => {
    if (currentStep !== "UPLOAD" && currentStep !== "IMPORT") {
      const confirmed = window.confirm(
        "Are you sure? All progress will be lost.",
      );
      if (!confirmed) return;
    }

    reset();
    resetResolutions(); // Clear duplicate resolution state
    onCancel?.();
  };

  // Warn before leaving during import
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep !== "UPLOAD" && currentStep !== "IMPORT") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep]);

  // ============================================================================
  // Render
  // ============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case "UPLOAD":
        return (
          <FileUploadSection
            onFileSelected={handleFileSelected}
            isProcessing={isParsingCSV || isDetectingColumns}
            error={uploadError}
          />
        );

      case "MAPPING":
        return (
          <>
            {detectionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription>{detectionError}</AlertDescription>
              </Alert>
            )}
            <ColumnMapping
              accountId={accountId}
              headers={csvData!.headers}
              sampleRows={csvData!.rows.slice(0, 5).map((r) => r.data)}
              detectionResult={columnMapping.detectionResult || undefined}
              onMappingChange={setFinalMapping}
              onFormatChange={() => {}}
            />
          </>
        );

      case "ANALYSIS":
        return (
          <AnalysisSection
            isDetectingDuplicates={isDetectingDuplicates}
            isCategorizing={isCategorizing}
            duplicateError={
              analysisError && isDetectingDuplicates ? analysisError : null
            }
            categorizeError={
              analysisError && isCategorizing ? analysisError : null
            }
            onRetryDuplicates={handleRetryDuplicates}
            onRetryCategorize={handleRetryCategorize}
          />
        );

      case "REVIEW":
        return (
          <>
            {analyzedRows.duplicates.length > 0 && (
              <DuplicateResolution
                csvRows={analyzedRows.categorizations.map((cat) => ({
                  csvRowIndex: cat.csvRowIndex,
                  date: new Date(cat.date),
                  payee: cat.payee,
                  amount: cat.amount,
                  category: cat.categoryName || undefined,
                }))}
                pendingCount={pendingDuplicatesCount}
                onSkipAll={() => skipAllExact(analyzedRows.duplicates)}
              />
            )}
            <AiPreviewTable
              rows={analyzedRows.categorizations.map((cat) => {
                const duplicate = analyzedRows.duplicates.find(
                  (dup) => dup.csvIndex === cat.csvRowIndex,
                );
                return {
                  csvRowIndex: cat.csvRowIndex,
                  date: new Date(cat.date),
                  payee: cat.payee,
                  amount: cat.amount,
                  categoryId: cat.categoryId,
                  categoryName: cat.categoryName,
                  confidence: cat.confidence,
                  duplicate: duplicate || null,
                };
              })}
              onCategoryChange={(csvRowIndex, categoryId) => {
                const updated = analyzedRows.categorizations.map((cat) =>
                  cat.csvRowIndex === csvRowIndex
                    ? { ...cat, categoryId }
                    : cat,
                );
                setCategorizations(updated);
              }}
            />
          </>
        );

      case "IMPORT":
        return (
          <ImportSummary
            importedCount={importResult?.importedCount || 0}
            skippedCount={importResult?.skippedCount || 0}
            errorCount={importResult?.errorCount || 0}
            errors={importResult?.errors || []}
            onImportAnother={reset}
            onViewTransactions={() => {
              reset();
              onComplete?.();
            }}
          />
        );
    }
  };

  const renderStepActions = () => {
    switch (currentStep) {
      case "UPLOAD":
        return (
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        );

      case "MAPPING":
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleMappingConfirm}>Continue</Button>
          </div>
        );

      case "ANALYSIS":
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={previousStep}>
              Back to Mapping
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {!isDetectingDuplicates && !isCategorizing && (
              <Button onClick={() => nextStep()}>
                {analyzedRows.duplicates.length > 0
                  ? `Review ${analyzedRows.duplicates.length} Duplicates`
                  : "Continue to Review"}
              </Button>
            )}
          </div>
        );

      case "REVIEW": {
        const transactionsToImport = analyzedRows.categorizations.filter(
          (cat) => {
            const resolution = resolutions.find(
              (r) => r.csvIndex === cat.csvRowIndex,
            );
            return resolution?.action !== "skip";
          },
        ).length;

        const hasUnresolvedDuplicates = pendingDuplicatesCount > 0;

        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={transactionsToImport === 0 || hasUnresolvedDuplicates}
            >
              Import {transactionsToImport}{" "}
              {transactionsToImport === 1 ? "Transaction" : "Transactions"}
            </Button>
          </div>
        );
      }

      case "IMPORT":
        return null;
    }
  };

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader>
        <CardTitle>AI-Powered CSV Import</CardTitle>
        <ImportStepper currentStep={currentStep} />
      </CardHeader>

      <CardContent className="min-h-[400px]">{renderStepContent()}</CardContent>

      {renderStepActions() && (
        <CardFooter className="flex justify-end">
          {renderStepActions()}
        </CardFooter>
      )}
    </Card>
  );
};
