import type { AmountFormat } from "@/features/csv-import/types/import-types";

const currencyPrefix = /^[€$£]\s*/;
const currencySuffix = /\s*[€$£]$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseImportAmount(
  value: string,
  format: AmountFormat,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parenthesized = /^\((.*)\)$/.exec(trimmed);
  let signlessValue = (parenthesized?.[1] ?? trimmed).trim();
  const sign = /^[+-]/.exec(signlessValue)?.[0];
  if (sign) {
    signlessValue = signlessValue.slice(sign.length).trim();
  }
  signlessValue = signlessValue
    .replace(currencyPrefix, "")
    .replace(currencySuffix, "")
    .trim();
  const negative = parenthesized !== null || sign === "-";

  const escapedThousands = format.thousandsSeparator
    ? escapeRegExp(format.thousandsSeparator)
    : "";
  const integer = format.thousandsSeparator
    ? `(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d+)`
    : "\\d+";
  const escapedDecimal = escapeRegExp(format.decimalSeparator);
  const amountPattern = new RegExp(
    `^${integer}(?:${escapedDecimal}\\d{1,2})?$`,
  );

  if (!amountPattern.test(signlessValue)) return null;

  const normalized = signlessValue
    .replace(
      format.thousandsSeparator
        ? new RegExp(escapedThousands, "g")
        : /$^/g,
      "",
    )
    .replace(format.decimalSeparator, ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return null;

  const signedAmount = negative ? -parsed : parsed;
  return format.isNegativeExpense ? signedAmount : -signedAmount;
}