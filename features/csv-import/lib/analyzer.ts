import { normalizePayeeName } from "@/lib/utils";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { detectDuplicates } from "@/features/csv-import/lib/duplicate-matcher";
import {
  matchPayeesToCategories,
  type PayeeMatchResult,
} from "@/features/csv-import/lib/payee-category-matcher";
import type { TransactionForAnalysis } from "@/features/csv-import/types/import-types";

export type AITransaction = TransactionForAnalysis & {
  historicalHint?: {
    categoryId: string;
    transactionTypeId: string;
    confidence: number;
    matchCount: number;
    matchType: "exact" | "fuzzy";
  };
};

export type AutoResolvedTransaction = {
  csvRowIndex: number;
  categoryId: string;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

export type AnalyzeResult = {
  duplicates: Awaited<ReturnType<typeof detectDuplicates>>["duplicates"];
  duplicateSummary: {
    totalChecked: number;
    exactMatches: number;
    fuzzyMatches: number;
    totalDuplicates: number;
  };
  payeeMatches: PayeeMatchResult[];
  autoResolved: AutoResolvedTransaction[];
  aiTransactions: AITransaction[];
};

export async function analyze(
  userId: string,
  transactions: TransactionForAnalysis[],
): Promise<AnalyzeResult> {
  const { AUTO_RESOLVE_CONFIDENCE, MIN_MATCH_COUNT } =
    CSV_IMPORT_CONFIG.PAYEE_MATCHING;

  // Run duplicate detection and payee matching in parallel
  const [duplicateResult, payeeResult] = await Promise.all([
    detectDuplicates(
      userId,
      transactions.map((t) => ({
        date: new Date(t.date),
        amount: t.amount,
        payee: t.payee,
      })),
    ),
    matchPayeesToCategories(
      userId,
      transactions.map((t) => ({
        csvRowIndex: t.csvRowIndex,
        payee: t.payee,
      })),
    ),
  ]);

  const payeeMatchMap = new Map<number, PayeeMatchResult["matches"]>();
  for (const r of payeeResult.results) {
    if (r.matches.length > 0) {
      payeeMatchMap.set(r.csvRowIndex, r.matches);
    }
  }

  const autoResolved: AutoResolvedTransaction[] = [];
  const aiTransactions: AITransaction[] = [];

  for (const tx of transactions) {
    const matches = payeeMatchMap.get(tx.csvRowIndex);
    const top = matches?.[0];

    if (
      top &&
      top.confidence >= AUTO_RESOLVE_CONFIDENCE &&
      top.matchCount >= MIN_MATCH_COUNT
    ) {
      autoResolved.push({
        csvRowIndex: tx.csvRowIndex,
        categoryId: top.categoryId,
        transactionTypeId: top.transactionTypeId,
        confidence: top.confidence,
        normalizedPayee: normalizePayeeName(tx.payee),
      });
    } else {
      const aiTx: AITransaction = { ...tx };
      if (top && top.matchCount >= MIN_MATCH_COUNT) {
        aiTx.historicalHint = {
          categoryId: top.categoryId,
          transactionTypeId: top.transactionTypeId,
          confidence: top.confidence,
          matchCount: top.matchCount,
          matchType: top.matchType,
        };
      }
      aiTransactions.push(aiTx);
    }
  }

  return {
    duplicates: duplicateResult.duplicates,
    duplicateSummary: {
      totalChecked: duplicateResult.totalChecked,
      exactMatches: duplicateResult.exactMatches,
      fuzzyMatches: duplicateResult.fuzzyMatches,
      totalDuplicates: duplicateResult.duplicates.length,
    },
    payeeMatches: payeeResult.results,
    autoResolved,
    aiTransactions,
  };
}
