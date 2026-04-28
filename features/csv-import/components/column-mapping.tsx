"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTemplates } from "@/features/csv-import/api/use-get-templates";
import { useSaveTemplate } from "@/features/csv-import/api/use-save-template";
import { AlertCircle, Check, Save } from "lucide-react";

import type { ColumnDetectionResult } from "@/features/csv-import/types/import-types";
import {
  ColumnType,
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DATE_FORMAT,
} from "@/features/csv-import/const/import-const";
import { ColumnPreview } from "@/features/csv-import/components/column-preview";
import { ConfidenceBadge } from "@/features/csv-import/components/confidence-badge";
import { FormatDetector } from "@/features/csv-import/components/format-detector";

type ColumnMappingProps = {
  accountId?: string;
  headers: string[];
  sampleRows: string[][];
  detectionResult?: ColumnDetectionResult;
  onMappingChange: (mapping: Record<string, number>) => void;
  onFormatChange: (
    dateFormat: string,
    amountFormat: {
      decimalSeparator: "." | ",";
      thousandsSeparator: "," | "." | " " | "";
      isNegativeExpense: boolean;
    },
  ) => void;
  onSaveTemplate?: (name: string) => void;
  onLoadTemplate?: (templateId: string) => void;
};

const COLUMN_TYPES: { value: ColumnType; label: string; required: boolean }[] =
  [
    { value: ColumnType.Date, label: "Date", required: true },
    { value: ColumnType.Amount, label: "Amount", required: true },
    { value: ColumnType.Payee, label: "Payee", required: true },
    { value: ColumnType.Description, label: "Description", required: false },
    { value: ColumnType.Notes, label: "Notes", required: false },
    { value: ColumnType.Category, label: "Category", required: false },
    { value: ColumnType.Balance, label: "Balance", required: false },
    { value: ColumnType.Unknown, label: "Ignore", required: false },
  ];

export const ColumnMapping = ({
  accountId,
  headers,
  sampleRows,
  detectionResult,
  onMappingChange,
  onFormatChange,
  onSaveTemplate,
  onLoadTemplate,
}: ColumnMappingProps) => {
  const [mapping, setMapping] = useState<Record<number, ColumnType>>(() => {
    const initialMapping: Record<number, ColumnType> = {};

    detectionResult?.columns.forEach((col) => {
      initialMapping[col.index] = col.type;
    });

    return initialMapping;
  });

  const [templateName, setTemplateName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const { data: templatesResponse } = useGetTemplates();
  const templates =
    templatesResponse && "data" in templatesResponse
      ? templatesResponse.data
      : [];
  const saveTemplateMutation = useSaveTemplate();

  const handleMappingChange = (columnIndex: number, type: ColumnType) => {
    const newMapping = { ...mapping, [columnIndex]: type };
    setMapping(newMapping);

    const reverseMapping: Record<string, number> = {};
    Object.entries(newMapping).forEach(([idx, colType]) => {
      if (colType !== ColumnType.Unknown) {
        reverseMapping[colType] = parseInt(idx);
      }
    });

    onMappingChange(reverseMapping);
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    const requiredTypes = COLUMN_TYPES.filter((t) => t.required).map(
      (t) => t.value,
    );
    const mappedTypes = Object.values(mapping).filter(
      (t): t is Exclude<ColumnType, ColumnType.Unknown> =>
        t !== ColumnType.Unknown,
    );

    requiredTypes.forEach((requiredType) => {
      if (
        requiredType !== ColumnType.Unknown &&
        !mappedTypes.includes(requiredType)
      ) {
        const label = COLUMN_TYPES.find((t) => t.value === requiredType)?.label;
        errors.push(`${label} column is required`);
      }
    });

    return errors;
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !accountId) return;

    const reverseMapping: Record<string, number> = {};
    Object.entries(mapping).forEach(([idx, colType]) => {
      if (colType !== ColumnType.Unknown) {
        reverseMapping[colType] = parseInt(idx);
      }
    });

    saveTemplateMutation.mutate({
      accountId,
      name: templateName,
      columnMapping: reverseMapping,
      dateFormat: detectionResult?.dateFormat || DEFAULT_DATE_FORMAT,
      amountFormat: detectionResult?.amountFormat || DEFAULT_AMOUNT_FORMAT,
    });

    setTemplateName("");
    setShowSaveInput(false);
  };

  const validationErrors = getValidationErrors();

  return (
    <div className="space-y-6">
      <ColumnPreview headers={headers} sampleRows={sampleRows} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {headers.map((header, idx) => {
            const detected = detectionResult?.columns.find(
              (c) => c.index === idx,
            );
            const currentType = mapping[idx] || ColumnType.Unknown;

            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {header || `Column ${idx + 1}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Sample: {sampleRows[0]?.[idx] || "-"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {detected && detected.type !== ColumnType.Unknown && (
                    <ConfidenceBadge confidence={detected.confidence} />
                  )}

                  <Select
                    value={currentType}
                    onValueChange={(value) =>
                      handleMappingChange(idx, value as ColumnType)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            {type.required && (
                              <span className="text-xs text-rose-500">*</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            <ul className="list-disc pl-4">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {detectionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Format Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <FormatDetector
              dateFormat={detectionResult.dateFormat}
              onDateFormatChange={(format) =>
                onFormatChange(format, detectionResult.amountFormat)
              }
              amountFormat={detectionResult.amountFormat}
              onAmountFormatChange={(format) =>
                onFormatChange(detectionResult.dateFormat, format)
              }
              isAutoDetected={
                detectionResult.method === "heuristic" ||
                detectionResult.method === "ai"
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {templates && templates.length > 0 && (
            <Select onValueChange={(value) => onLoadTemplate?.(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Load template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSaveInput ? (
            <>
              <Input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className="h-9 w-[200px]"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={
                  !templateName.trim() || saveTemplateMutation.isPending
                }
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowSaveInput(false);
                  setTemplateName("");
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSaveInput(true)}
              disabled={validationErrors.length > 0}
            >
              <Save className="mr-2 size-4" />
              Save as Template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
