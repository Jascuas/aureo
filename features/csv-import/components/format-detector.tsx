"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AmountFormat,
  DateFormat,
} from "@/features/csv-import/types/import-types";

const DATE_FORMATS: { value: DateFormat; label: string; example: string }[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "31/12/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "12/31/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2024-12-31" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY", example: "31-12-2024" },
  { value: "DD/MM/YY", label: "DD/MM/YY", example: "31/12/24" },
  { value: "MM/DD/YY", label: "MM/DD/YY", example: "12/31/24" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY", example: "31-Dec-2024" },
  { value: "DD-MMM-YY", label: "DD-MMM-YY", example: "31-Dec-24" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD", example: "2024/12/31" },
];

const AMOUNT_FORMATS = [
  {
    value: "us",
    label: "Formato EE. UU. (1,234.56)",
    decimal: "." as const,
    thousands: "," as const,
  },
  {
    value: "eu",
    label: "Formato europeo (1.234,56)",
    decimal: "," as const,
    thousands: "." as const,
  },
  {
    value: "space-dot",
    label: "Formato con espacio (1 234.56)",
    decimal: "." as const,
    thousands: " " as const,
  },
  {
    value: "space-comma",
    label: "Formato con espacio (1 234,56)",
    decimal: "," as const,
    thousands: " " as const,
  },
  {
    value: "plain-dot",
    label: "Punto decimal (1234.56)",
    decimal: "." as const,
    thousands: "" as const,
  },
  {
    value: "plain-comma",
    label: "Coma decimal (1234,56)",
    decimal: "," as const,
    thousands: "" as const,
  },
];

type FormatDetectorProps = {
  dateFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;

  amountFormat: AmountFormat;
  onAmountFormatChange: (format: FormatDetectorProps["amountFormat"]) => void;

  isAutoDetected?: boolean;
};

export const FormatDetector = ({
  dateFormat,
  onDateFormatChange,
  amountFormat,
  onAmountFormatChange,
  isAutoDetected = false,
}: FormatDetectorProps) => {
  const selectedAmountFormat = AMOUNT_FORMATS.find(
    (format) =>
      format.decimal === amountFormat.decimalSeparator &&
      format.thousands === amountFormat.thousandsSeparator,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="date-format">
          Formato de fecha
          {isAutoDetected && (
            <span className="text-muted-foreground ml-2 text-xs">
              (detectado automáticamente)
            </span>
          )}
        </label>
        <Select
          value={dateFormat}
          onValueChange={(value) => onDateFormatChange(value as DateFormat)}
        >
          <SelectTrigger id="date-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                <div className="flex items-center justify-between gap-4">
                  <span>{format.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {format.example}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="amount-format">
          Formato del importe
          {isAutoDetected && (
            <span className="text-muted-foreground ml-2 text-xs">
              (detectado automáticamente)
            </span>
          )}
        </label>
        <Select
          value={selectedAmountFormat?.value || "plain-dot"}
          onValueChange={(value) => {
            const format = AMOUNT_FORMATS.find((item) => item.value === value);
            if (format) {
              onAmountFormatChange({
                ...amountFormat,
                decimalSeparator: format.decimal,
                thousandsSeparator: format.thousands,
              });
            }
          }}
        >
          <SelectTrigger id="amount-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AMOUNT_FORMATS.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          checked={amountFormat.isNegativeExpense}
          className="border-border accent-crt-accent size-4 focus-visible:ring-2 focus-visible:ring-crt-accent focus-visible:outline-none"
          id="negative-expense"
          onChange={(event) =>
            onAmountFormatChange({
              ...amountFormat,
              isNegativeExpense: event.target.checked,
            })
          }
          type="checkbox"
        />
        <label className="text-sm" htmlFor="negative-expense">
          Los gastos son números negativos
        </label>
      </div>
    </div>
  );
};
