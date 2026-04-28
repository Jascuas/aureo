import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ColumnDetectionResult,
  EnrichedCategorization,
  ParsedCSVRow,
  ImportTemplate,
} from "@/features/csv-import/types/import-types";
import { ImportStep } from "@/features/csv-import/const/import-const";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";
import type { PayeeMatchResult } from "@/features/csv-import/lib/payee-category-matcher";
import type { AITransaction } from "@/features/csv-import/lib/analyzer";

export type { EnrichedCategorization };

type AutoResolved = {
  csvRowIndex: number;
  categoryId: string;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

type ImportSessionState = {
  currentStep: ImportStep;

  csvData: {
    fileName: string;
    headers: string[];
    rows: ParsedCSVRow[];
  } | null;

  columnMapping: {
    detectionResult: ColumnDetectionResult | null;
    selectedTemplate: ImportTemplate | null;
    finalMapping: Record<string, number> | null;
  };

  analyzedRows: {
    duplicates: DuplicateMatch[];
    categorizations: EnrichedCategorization[];
    // Legacy — kept for review step suggestions UI
    payeeMatches: PayeeMatchResult[];
    // New — from /analyze endpoint
    autoResolved: AutoResolved[];
    aiTransactions: AITransaction[];
  };

  importResult: {
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
  } | null;

  setCSVData: (
    fileName: string,
    headers: string[],
    rows: ParsedCSVRow[],
  ) => void;
  setDetectionResult: (result: ColumnDetectionResult) => void;
  setSelectedTemplate: (template: ImportTemplate | null) => void;
  setFinalMapping: (mapping: Record<string, number>) => void;

  setDuplicates: (duplicates: DuplicateMatch[]) => void;
  setCategorizations: (categorizations: EnrichedCategorization[]) => void;
  setPayeeMatches: (payeeMatches: PayeeMatchResult[]) => void;
  setAutoResolved: (autoResolved: AutoResolved[]) => void;
  setAITransactions: (aiTransactions: AITransaction[]) => void;
  setImportResult: (result: ImportSessionState["importResult"]) => void;

  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: ImportStep) => void;
  reset: () => void;
};

const STEP_ORDER: ImportStep[] = [
  ImportStep.UPLOAD,
  ImportStep.MAPPING,
  ImportStep.ANALYSIS,
  ImportStep.REVIEW,
  ImportStep.IMPORT,
];

const initialState = {
  currentStep: ImportStep.UPLOAD,
  csvData: null,
  columnMapping: {
    detectionResult: null,
    selectedTemplate: null,
    finalMapping: null,
  },
  analyzedRows: {
    duplicates: [],
    categorizations: [],
    payeeMatches: [],
    autoResolved: [],
    aiTransactions: [],
  },
  importResult: null,
};

export const useImportSession = create<ImportSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCSVData: (fileName, headers, rows) => {
        set({
          csvData: { fileName, headers, rows },
          currentStep: ImportStep.MAPPING,
        });
      },

      setDetectionResult: (result) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            detectionResult: result,
          },
        }));
      },

      setSelectedTemplate: (template) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            selectedTemplate: template,
          },
        }));
      },

      setFinalMapping: (mapping) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            finalMapping: mapping,
          },
        }));
      },

      setDuplicates: (duplicates) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            duplicates,
          },
        }));
      },

      setCategorizations: (categorizations) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            categorizations,
          },
        }));
      },

      setPayeeMatches: (payeeMatches) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            payeeMatches,
          },
        }));
      },

      setAutoResolved: (autoResolved) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            autoResolved,
          },
        }));
      },

      setAITransactions: (aiTransactions) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            aiTransactions,
          },
        }));
      },

      setImportResult: (result) => {
        set({
          importResult: result,
          currentStep: ImportStep.IMPORT,
        });
      },

      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },

      goToStep: (step) => {
        set({ currentStep: step });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "aureo-import-session",
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;

          const stored = JSON.parse(str);

          if (stored.state?.csvData?.rows) {
            stored.state.csvData.rows = stored.state.csvData.rows.map(
              (row: ParsedCSVRow) => ({
                ...row,
                mapped: row.mapped
                  ? {
                      ...row.mapped,
                      date: row.mapped.date ? new Date(row.mapped.date) : null,
                    }
                  : undefined,
              }),
            );
          }

          if (stored.state?.columnMapping?.selectedTemplate?.createdAt) {
            stored.state.columnMapping.selectedTemplate.createdAt = new Date(
              stored.state.columnMapping.selectedTemplate.createdAt,
            );
          }
          if (stored.state?.columnMapping?.selectedTemplate?.updatedAt) {
            stored.state.columnMapping.selectedTemplate.updatedAt = new Date(
              stored.state.columnMapping.selectedTemplate.updatedAt,
            );
          }

          if (stored.state?.analyzedRows?.duplicates) {
            stored.state.analyzedRows.duplicates =
              stored.state.analyzedRows.duplicates.map(
                (dup: DuplicateMatch) => ({
                  ...dup,
                  existingTransaction: {
                    ...dup.existingTransaction,
                    date: new Date(dup.existingTransaction.date),
                  },
                }),
              );
          }

          return stored;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    },
  ),
);
