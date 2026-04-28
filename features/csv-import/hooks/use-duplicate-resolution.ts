import { create } from "zustand";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";
import {
  MatchType,
  Resolution,
} from "@/features/csv-import/const/import-const";

type DuplicateResolution = {
  csvIndex: number;
  action: Resolution;
};

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
