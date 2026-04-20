"use client";

import {
  IMPORT_STEPS,
  type ImportStep,
} from "@/features/csv-import/types/import-types";
import { cn } from "@/lib/utils";

type ImportStepperProps = {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
};

const STEPS: { key: ImportStep; label: string; order: number }[] = [
  { key: IMPORT_STEPS.UPLOAD, label: "Upload", order: 1 },
  { key: IMPORT_STEPS.MAPPING, label: "Map Columns", order: 2 },
  { key: IMPORT_STEPS.ANALYSIS, label: "Analyze", order: 3 },
  { key: IMPORT_STEPS.REVIEW, label: "Review", order: 4 },
  { key: IMPORT_STEPS.IMPORT, label: "Import", order: 5 },
];

export const ImportStepper = ({
  currentStep,
  onStepClick,
}: ImportStepperProps) => {
  const currentOrder = STEPS.find((s) => s.key === currentStep)?.order || 1;

  return (
    <div className="w-full pb-4">
      <div className="flex w-full items-center">
        {STEPS.map((step, index) => {
          const isComplete = step.order < currentOrder;
          const isCurrent = step.key === currentStep;
          const isPending = step.order > currentOrder;
          const isClickable = !!(onStepClick && isComplete);

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center",
                index < STEPS.length - 1 ? "flex-1" : "flex-none",
              )}
            >
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isComplete &&
                      "border-brand-green bg-brand-green text-white",
                    isCurrent &&
                      "border-brand-green bg-brand-green ring-brand-green/50 animate-pulse text-white ring-4",
                    isPending && "border-gray-300 bg-white text-gray-400",
                    isClickable && "hover:bg-brand-green/80 cursor-pointer",
                  )}
                  aria-label={`Step ${step.order}: ${step.label}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="text-sm font-semibold">{step.order}</span>
                </button>
              </div>

              {index < STEPS.length - 1 && (
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all",
                      step.order < currentOrder
                        ? "bg-brand-green"
                        : "bg-gray-300",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
