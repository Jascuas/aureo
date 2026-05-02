import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  MatchType,
  Resolution,
} from "@/features/csv-import/const/import-const";
import type {
  DuplicateMatch,
  DuplicateResolution,
} from "@/features/csv-import/types/import-types";

type DuplicateResolutionState = {
  isOpen: boolean;
  currentDuplicate: DuplicateMatch | null;
  resolutions: DuplicateResolution[];

  openResolution: (duplicate: DuplicateMatch) => void;
  closeResolution: () => void;

  resolveAs: (csvIndex: number, action: Resolution) => void;
  skipAllExact: (duplicates: DuplicateMatch[]) => void;

  getResolution: (csvIndex: number) => DuplicateResolution | undefined;
  getPendingCount: (duplicates: DuplicateMatch[]) => number;

  reset: () => void;
};

export const useDuplicateResolution = create<DuplicateResolutionState>(
  (set, get) => ({
    isOpen: false,
    currentDuplicate: null,
    resolutions: [],

    openResolution: (duplicate) => {
      set({
        isOpen: true,
        currentDuplicate: duplicate,
      });
    },

    closeResolution: () => {
      set({
        isOpen: false,
        currentDuplicate: null,
      });
    },

    resolveAs: (csvIndex, action) => {
      set((state) => {
        const existingIndex = state.resolutions.findIndex(
          (r) => r.csvIndex === csvIndex,
        );

        if (existingIndex >= 0) {
          const newResolutions = [...state.resolutions];
          newResolutions[existingIndex] = { csvIndex, action };
          return { resolutions: newResolutions };
        }

        return {
          resolutions: [...state.resolutions, { csvIndex, action }],
        };
      });
    },

    skipAllExact: (duplicates) => {
      const exactDuplicates = duplicates.filter(
        (d) => d.matchType === MatchType.Exact,
      );

      set((state) => {
        const newResolutions = [...state.resolutions];

        exactDuplicates.forEach((dup) => {
          const existingIndex = newResolutions.findIndex(
            (r) => r.csvIndex === dup.csvIndex,
          );

          if (existingIndex >= 0) {
            newResolutions[existingIndex] = {
              csvIndex: dup.csvIndex,
              action: Resolution.Skip,
            };
          } else {
            newResolutions.push({
              csvIndex: dup.csvIndex,
              action: Resolution.Skip,
            });
          }
        });

        return { resolutions: newResolutions };
      });
    },

    getResolution: (csvIndex) => {
      return get().resolutions.find((r) => r.csvIndex === csvIndex);
    },

    getPendingCount: (duplicates) => {
      const { resolutions } = get();
      return duplicates.filter(
        (dup) => !resolutions.find((r) => r.csvIndex === dup.csvIndex),
      ).length;
    },

    reset: () => {
      set({
        isOpen: false,
        currentDuplicate: null,
        resolutions: [],
      });
    },
  }),
);

// Selectors — granular subscriptions to avoid unnecessary re-renders.
export const useDuplicateDialog = () =>
  useDuplicateResolution(
    useShallow((s) => ({
      isOpen: s.isOpen,
      currentDuplicate: s.currentDuplicate,
    })),
  );

export const useDuplicateResolutions = () =>
  useDuplicateResolution((s) => s.resolutions);

export const useDuplicateResolutionActions = () =>
  useDuplicateResolution(
    useShallow((s) => ({
      openResolution: s.openResolution,
      closeResolution: s.closeResolution,
      resolveAs: s.resolveAs,
      skipAllExact: s.skipAllExact,
      getResolution: s.getResolution,
      getPendingCount: s.getPendingCount,
      reset: s.reset,
    })),
  );
