"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COLUMN_TYPES,
  ColumnMappingList,
} from "@/features/csv-import/components/column-mapping-list";
import { ColumnPreview } from "@/features/csv-import/components/column-preview";
import { FormatDetector } from "@/features/csv-import/components/format-detector";
import { TemplateControls } from "@/features/csv-import/components/template-controls";
import { ColumnType } from "@/features/csv-import/const/import-const";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";

type ColumnMappingProps = {
  accountId?: string;
  headers: string[];
  rows: ParsedCSVRow[];
  detectionResult?: ColumnDetectionResult;
  onMappingChange: (mapping: Record<string, number>) => void;
  onFormatChange: (dateFormat: DateFormat, amountFormat: AmountFormat) => void;
  onSaveTemplate?: (name: string) => void;
  onLoadTemplate?: (templateId: string) => void;
};

export const ColumnMapping = ({
  accountId,
  headers,
  rows,
  detectionResult,
  onMappingChange,
  onFormatChange,
  onLoadTemplate,
}: ColumnMappingProps) => {
  const [mapping, setMapping] = useState<Record<number, ColumnType>>(() => {
    const initialMapping: Record<number, ColumnType> = {};

    detectionResult?.columns.forEach((col) => {
      initialMapping[col.index] = col.type;
    });

    return initialMapping;
  });

  useEffect(() => {
    if (!detectionResult) return;

    setMapping(
      detectionResult.columns.reduce<Record<number, ColumnType>>(
        (nextMapping, column) => {
          nextMapping[column.index] = column.type;
          return nextMapping;
        },
        {},
      ),
    );
  }, [detectionResult?.columns]);

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

  const validationErrors = getValidationErrors();

  const reverseMapping: Record<string, number> = {};
  Object.entries(mapping).forEach(([idx, colType]) => {
    if (colType !== ColumnType.Unknown) {
      reverseMapping[colType] = parseInt(idx);
    }
  });

  return (
    <div className="space-y-6">
      <ColumnPreview
        headers={headers}
        rows={rows}
        mapping={reverseMapping}
        dateFormat={detectionResult?.dateFormat ?? "unknown"}
        amountFormat={
          detectionResult?.amountFormat ?? {
            decimalSeparator: ",",
            thousandsSeparator: ".",
            isNegativeExpense: true,
          }
        }
      />

      <ColumnMappingList
        headers={headers}
        sampleRows={rows.slice(0, 5).map((row) => row.data)}
        detectionResult={detectionResult}
        mapping={mapping}
        onMappingChange={handleMappingChange}
      />

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

      <TemplateControls
        accountId={accountId}
        columnMapping={reverseMapping}
        detectionResult={detectionResult}
        disableSave={validationErrors.length > 0}
        onLoadTemplate={onLoadTemplate}
      />
    </div>
  );
};
