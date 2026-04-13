"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  IMPORT_STEPS,
  type ImportStep,
} from "@/features/csv-import/types/import-types";

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
    <div className="w-full py-4">
      <div className="flex w-full items-center">
        {STEPS.map((step, index) => {
          const isComplete = step.order < currentOrder;
          const isCurrent = step.key === currentStep;
          const isPending = step.order > currentOrder;
          const isClickable = !!(onStepClick && isComplete);

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isComplete &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    isCurrent &&
                      "animate-pulse border-blue-500 bg-blue-500 text-white",
                    isPending && "border-gray-300 bg-white text-gray-400",
                    isClickable &&
                      "cursor-pointer hover:border-blue-400 hover:bg-emerald-400",
                  )}
                  aria-label={`Step ${step.order}: ${step.label}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.order}</span>
                  )}
                </button>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-medium",
                    (isComplete || isCurrent) && "text-foreground",
                    isPending && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="min-w-0 flex-1 px-2">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all",
                      step.order < currentOrder
                        ? "bg-emerald-500"
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
