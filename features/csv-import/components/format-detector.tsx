"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateFormat } from "../types/import-types";

const DATE_FORMATS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '31-12-2024' },
  { value: 'DD/MM/YY', label: 'DD/MM/YY', example: '31/12/24' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY', example: '31-Dec-2024' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/12/31' },
];

const AMOUNT_FORMATS = [
  { value: 'us', label: 'US Format (1,234.56)', decimal: '.' as const, thousands: ',' as const },
  { value: 'eu', label: 'EU Format (1.234,56)', decimal: ',' as const, thousands: '.' as const },
  { value: 'space', label: 'Space Format (1 234.56)', decimal: '.' as const, thousands: ' ' as const },
];

type FormatDetectorProps = {
  dateFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;
  
  amountFormat: {
    decimalSeparator: '.' | ',';
    thousandsSeparator: ',' | '.' | ' ' | '';
    isNegativeExpense: boolean;
  };
  onAmountFormatChange: (format: FormatDetectorProps['amountFormat']) => void;
  
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
    f => f.decimal === amountFormat.decimalSeparator && 
         f.thousands === amountFormat.thousandsSeparator
  );
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Date Format
          {isAutoDetected && (
            <span className="ml-2 text-xs text-muted-foreground">(auto-detected)</span>
          )}
        </label>
        <Select value={dateFormat} onValueChange={(value) => onDateFormatChange(value as DateFormat)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map(format => (
              <SelectItem key={format.value} value={format.value}>
                <div className="flex items-center justify-between gap-4">
                  <span>{format.label}</span>
                  <span className="text-xs text-muted-foreground">{format.example}</span>
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
            <span className="ml-2 text-xs text-muted-foreground">(auto-detected)</span>
          )}
        </label>
        <Select 
          value={selectedAmountFormat?.value || 'us'} 
          onValueChange={(value) => {
            const format = AMOUNT_FORMATS.find(f => f.value === value);
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
            {AMOUNT_FORMATS.map(format => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="negative-expense"
          checked={amountFormat.isNegativeExpense}
          onChange={(e) => onAmountFormatChange({
            ...amountFormat,
            isNegativeExpense: e.target.checked,
          })}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="negative-expense" className="text-sm">
          Expenses are negative numbers
        </label>
      </div>
    </div>
  );
};
