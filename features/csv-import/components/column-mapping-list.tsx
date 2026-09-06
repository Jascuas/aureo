"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "@/features/csv-import/components/confidence-badge";
import { ColumnType } from "@/features/csv-import/const/import-const";
import type { ColumnDetectionResult } from "@/features/csv-import/types/import-types";

export const COLUMN_TYPES: {
  value: ColumnType;
  label: string;
  required: boolean;
}[] = [
  { value: ColumnType.Date, label: "Fecha", required: true },
  { value: ColumnType.Amount, label: "Importe", required: true },
  { value: ColumnType.Payee, label: "Beneficiario", required: true },
  { value: ColumnType.Description, label: "Descripción", required: false },
  { value: ColumnType.Notes, label: "Notas", required: false },
  { value: ColumnType.Category, label: "Categoría", required: false },
  { value: ColumnType.Balance, label: "Saldo", required: false },
  { value: ColumnType.Unknown, label: "Ignorar", required: false },
];

type ColumnMappingListProps = {
  headers: string[];
  sampleRows: string[][];
  detectionResult?: ColumnDetectionResult;
  mapping: Record<number, ColumnType>;
  onMappingChange: (columnIndex: number, type: ColumnType) => void;
};

export const ColumnMappingList = ({
  headers,
  sampleRows,
  detectionResult,
  mapping,
  onMappingChange,
}: ColumnMappingListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapeo de columnas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {headers.map((header, idx) => {
          const detected = detectionResult?.columns.find(
            (c) => c.index === idx,
          );
          const currentType = mapping[idx] || ColumnType.Unknown;

          return (
            <div key={idx} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {header || `Columna ${idx + 1}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Ejemplo: {sampleRows[0]?.[idx] || "-"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {detected && detected.type !== ColumnType.Unknown && (
                  <ConfidenceBadge confidence={detected.confidence} />
                )}

                <Select
                  value={currentType}
                  onValueChange={(value) =>
                    onMappingChange(idx, value as ColumnType)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.label}</span>
                          {type.required && (
                            <span className="text-destructive text-xs">*</span>
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
  );
};
