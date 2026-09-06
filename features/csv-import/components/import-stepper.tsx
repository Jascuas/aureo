"use client";

import { ImportStep } from "@/features/csv-import/const/import-const";
import { cn } from "@/lib/utils";

export type ImportStepStatus =
  | "completed"
  | "active"
  | "available"
  | "blocked"
  | "failed";

type ImportStepperProps = {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
  stepStatuses?: Partial<Record<ImportStep, ImportStepStatus>>;
};

type StepDefinition = {
  key: ImportStep;
  label: string;
  order: number;
};

const STEPS: StepDefinition[] = [
  { key: ImportStep.UPLOAD, label: "Subir", order: 1 },
  { key: ImportStep.MAPPING, label: "Mapear", order: 2 },
  { key: ImportStep.ANALYSIS, label: "Analizar", order: 3 },
  { key: ImportStep.REVIEW, label: "Revisar", order: 4 },
  { key: ImportStep.IMPORT, label: "Importar", order: 5 },
];

const STATUS_LABELS: Record<ImportStepStatus, string> = {
  completed: "Completado",
  active: "En curso",
  available: "Disponible",
  blocked: "Bloqueado",
  failed: "Error",
};

const STATUS_CLASSES: Record<ImportStepStatus, string> = {
  completed: "border-crt-pos bg-crt-pos text-background",
  active:
    "border-crt-accent bg-crt-accent text-background ring-2 ring-crt-accent/30",
  available: "border-crt-accent bg-card text-crt-accent",
  blocked: "border-border bg-card text-muted-foreground",
  failed:
    "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20",
};

const STATUS_TEXT_CLASSES: Record<ImportStepStatus, string> = {
  completed: "text-crt-pos",
  active: "text-crt-accent font-bold",
  available: "text-crt-accent",
  blocked: "text-muted-foreground",
  failed: "text-destructive font-bold",
};

const getDefaultStatus = (
  step: StepDefinition,
  currentOrder: number,
): ImportStepStatus => {
  if (step.order < currentOrder) return "completed";
  if (step.order === currentOrder) return "active";
  return "blocked";
};

export const ImportStepper = ({
  currentStep,
  onStepClick,
  stepStatuses,
}: ImportStepperProps) => {
  const currentOrder = STEPS.find((step) => step.key === currentStep)?.order ?? 1;

  return (
    <nav className="w-full pb-4" aria-label="Progreso de importación">
      <div className="flex w-full items-start">
        {STEPS.map((step, index) => {
          const status =
            stepStatuses?.[step.key] ?? getDefaultStatus(step, currentOrder);
          const isCurrent = step.key === currentStep;
          const isClickable =
            !!onStepClick && (status === "completed" || status === "available");
          const statusLabel = STATUS_LABELS[status];

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-start",
                index < STEPS.length - 1 ? "flex-1" : "flex-none",
              )}
            >
              <div className="flex min-w-12 flex-col items-center">
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-none border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    STATUS_CLASSES[status],
                    isClickable &&
                      "hover:border-crt-accent hover:text-crt-accent cursor-pointer",
                  )}
                  aria-label={`Paso ${step.order}: ${step.label}. Estado: ${statusLabel}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="text-sm font-semibold">{step.order}</span>
                </button>
                <span className="mt-2 text-center text-[10px] tracking-[0.08em] uppercase">
                  <span className="block">{step.label}</span>
                  <span className={cn("block text-3xs", STATUS_TEXT_CLASSES[status])}>
                    {statusLabel}
                  </span>
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="min-w-0 flex-1 pt-5">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all",
                      status === "completed" && "bg-crt-pos",
                      status === "failed" && "bg-destructive",
                      status !== "completed" &&
                        status !== "failed" &&
                        "bg-border",
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
