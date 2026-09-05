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
    label: "US Format (1,234.56)",
    decimal: "." as const,
    thousands: "," as const,
  },
  {
    value: "eu",
    label: "EU Format (1.234,56)",
    decimal: "," as const,
    thousands: "." as const,
  },
  {
    value: "space-dot",
    label: "Space Format (1 234.56)",
    decimal: "." as const,
    thousands: " " as const,
  },
  {
    value: "space-comma",
    label: "Space Format (1 234,56)",
    decimal: "," as const,
    thousands: " " as const,
  },
  {
    value: "plain-dot",
    label: "Decimal point (1234.56)",
    decimal: "." as const,
    thousands: "" as const,
  },
  {
    value: "plain-comma",
    label: "Decimal comma (1234,56)",
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
    (f) =>
      f.decimal === amountFormat.decimalSeparator &&
      f.thousands === amountFormat.thousandsSeparator,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Date Format
          {isAutoDetected && (
            <span className="text-muted-foreground ml-2 text-xs">
              (auto-detected)
            </span>
          )}
        </label>
        <Select
          value={dateFormat}
          onValueChange={(value) => onDateFormatChange(value as DateFormat)}
        >
          <SelectTrigger>
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
        <label className="text-sm font-medium">
          Amount Format
          {isAutoDetected && (
            <span className="text-muted-foreground ml-2 text-xs">
              (auto-detected)
            </span>
          )}
        </label>
        <Select
          value={selectedAmountFormat?.value || "plain-dot"}
          onValueChange={(value) => {
            const format = AMOUNT_FORMATS.find((f) => f.value === value);
            if (format) {
              onAmountFormatChange({
                ...amountFormat,
                decimalSeparator: format.decimal,
                thousandsSeparator: format.thousands,
              });
            }
          }}
        >
          <SelectTrigger>
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
          className="size-4 border-border"
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
          Expenses are negative numbers
        </label>
      </div>
    </div>
  );
};
