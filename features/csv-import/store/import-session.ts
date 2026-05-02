import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  AITransaction,
  AutoResolvedTransaction,
  ColumnDetectionResult,
  DuplicateMatch,
  EnrichedCategorization,
  ParsedCSVRow,
  ImportTemplate,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { createSessionStorage } from "@/features/csv-import/lib/session-storage";

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
    autoResolved: AutoResolvedTransaction[];
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
  setAutoResolved: (autoResolved: AutoResolvedTransaction[]) => void;
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
      storage: createSessionStorage<ImportSessionState>(),
    },
  ),
);

// Selectors — granular subscriptions to avoid unnecessary re-renders.
export const useCurrentStep = () => useImportSession((s) => s.currentStep);

export const useCSVData = () => useImportSession((s) => s.csvData);

export const useColumnMapping = () => useImportSession((s) => s.columnMapping);

export const useAnalyzedRows = () => useImportSession((s) => s.analyzedRows);

export const useImportResult = () => useImportSession((s) => s.importResult);

export const useImportSessionActions = () =>
  useImportSession(
    useShallow((s) => ({
      setCSVData: s.setCSVData,
      setDetectionResult: s.setDetectionResult,
      setSelectedTemplate: s.setSelectedTemplate,
      setFinalMapping: s.setFinalMapping,
      setDuplicates: s.setDuplicates,
      setCategorizations: s.setCategorizations,
      setPayeeMatches: s.setPayeeMatches,
      setAutoResolved: s.setAutoResolved,
      setAITransactions: s.setAITransactions,
      setImportResult: s.setImportResult,
      nextStep: s.nextStep,
      previousStep: s.previousStep,
      goToStep: s.goToStep,
      reset: s.reset,
    })),
  );
