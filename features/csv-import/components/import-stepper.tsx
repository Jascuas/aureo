"use client";

import { ImportStep } from "@/features/csv-import/const/import-const";
import { cn } from "@/lib/utils";

type ImportStepperProps = {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
};

const STEPS: { key: ImportStep; label: string; order: number }[] = [
  { key: ImportStep.UPLOAD, label: "Subir", order: 1 },
  { key: ImportStep.MAPPING, label: "Mapear", order: 2 },
  { key: ImportStep.ANALYSIS, label: "Analizar", order: 3 },
  { key: ImportStep.REVIEW, label: "Revisar", order: 4 },
  { key: ImportStep.IMPORT, label: "Importar", order: 5 },
];

export const ImportStepper = ({
  currentStep,
  onStepClick,
}: ImportStepperProps) => {
  const currentOrder = STEPS.find((s) => s.key === currentStep)?.order || 1;

  return (
    <nav className="w-full pb-4" aria-label="Progreso de importación">
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
              <div className="flex min-w-12 flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-none border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isComplete &&
                      "border-crt-pos bg-crt-pos text-background",
                    isCurrent &&
                      "border-crt-accent bg-crt-accent text-background ring-2 ring-crt-accent/30",
                    isPending && "border-border bg-card text-muted-foreground",
                    isClickable && "hover:border-crt-accent hover:text-crt-accent cursor-pointer",
                  )}
                  aria-label={`Step ${step.order}: ${step.label}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="text-sm font-semibold">{step.order}</span>
                </button>
                <span
                  className={cn(
                    "mt-2 text-center text-[10px] tracking-[0.08em] uppercase",
                    isCurrent ? "text-crt-accent font-bold" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all",
                      step.order < currentOrder
                        ? "bg-crt-pos"
                        : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
