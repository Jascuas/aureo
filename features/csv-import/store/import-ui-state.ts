import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { BatchProgress } from "@/features/csv-import/types/import-types";

type ImportUIState = {
  loading: {
    parsingCSV: boolean;
    detectingColumns: boolean;
    analyzing: boolean;
    categorizing: boolean;
  };

  errors: {
    upload: string | null;
    detection: string | null;
    analyze: string | null;
    categorize: string | null;
  };

  batchProgress: BatchProgress | null;
  analyzeComplete: boolean;

  setLoading: (key: keyof ImportUIState["loading"], value: boolean) => void;
  setError: (
    key: keyof ImportUIState["errors"],
    message: string | null,
  ) => void;
  clearErrors: () => void;
  setBatchProgress: (progress: BatchProgress | null) => void;
  setAnalyzeComplete: (value: boolean) => void;
  reset: () => void;
};

const initialState = {
  loading: {
    parsingCSV: false,
    detectingColumns: false,
    analyzing: false,
    categorizing: false,
  },
  errors: {
    upload: null,
    detection: null,
    analyze: null,
    categorize: null,
  },
  batchProgress: null,
  analyzeComplete: false,
};

export const useImportUIState = create<ImportUIState>((set) => ({
  ...initialState,

  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),

  setError: (key, message) =>
    set((state) => ({
      errors: { ...state.errors, [key]: message },
    })),

  clearErrors: () =>
    set({
      errors: {
        upload: null,
        detection: null,
        analyze: null,
        categorize: null,
      },
    }),

  setBatchProgress: (progress) => set({ batchProgress: progress }),

  setAnalyzeComplete: (value) => set({ analyzeComplete: value }),

  reset: () => set(initialState),
}));

// Selectors — granular subscriptions to avoid unnecessary re-renders.
export const useUILoading = () => useImportUIState((s) => s.loading);

export const useUIErrors = () => useImportUIState((s) => s.errors);

export const useBatchProgress = () => useImportUIState((s) => s.batchProgress);

export const useAnalyzeComplete = () =>
  useImportUIState((s) => s.analyzeComplete);

export const useImportUIActions = () =>
  useImportUIState(
    useShallow((s) => ({
      setLoading: s.setLoading,
      setError: s.setError,
      clearErrors: s.clearErrors,
      setBatchProgress: s.setBatchProgress,
      setAnalyzeComplete: s.setAnalyzeComplete,
      reset: s.reset,
    })),
  );
