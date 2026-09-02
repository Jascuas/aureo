import type { AmountFormat } from "@/features/csv-import/types/import-types";

const currencyPrefixOrSuffix = /^[€$£]\s*|\s*[€$£]$/g;

// The parsed CSV sign is authoritative. No downstream import step is allowed to invert it.
export function parseImportAmount(
  value: string,
  format: AmountFormat,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parenthesized = /^\((.*)\)$/.exec(trimmed);
  const unsignedValue = (parenthesized?.[1] ?? trimmed)
    .replace(currencyPrefixOrSuffix, "")
    .trim();
  const negative = parenthesized !== null || unsignedValue.startsWith("-");
  const signlessValue = unsignedValue.replace(/^[+-]/, "");

  const escapedThousands = format.thousandsSeparator
    ? format.thousandsSeparator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const integer = format.thousandsSeparator
    ? `(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d+)`
    : "\\d+";
  const escapedDecimal = format.decimalSeparator.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
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

  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}