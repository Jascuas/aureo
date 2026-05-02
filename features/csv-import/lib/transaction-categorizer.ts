import { getDefaultAIProvider } from "@/lib/ai";
import { normalizePayeeName } from "@/lib/utils";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import {
  detectTransactionType,
  findSimilarTransactions,
  getUserCategories,
} from "@/features/csv-import/lib/categorization-db";
import type {
  CategorizationResult,
  CategorizationTxInput,
} from "@/features/csv-import/types/import-types";

export async function categorizeTransactions(
  userId: string,
  inputs: CategorizationTxInput[],
): Promise<CategorizationResult[]> {
  if (inputs.length > CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION) {
    throw new Error(
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION} transactions per batch`,
    );
  }

  const { MIN_MATCH_COUNT } = CSV_IMPORT_CONFIG.PAYEE_MATCHING;

  const userCategories = await getUserCategories(userId);

  if (userCategories.length === 0) {
    throw new Error(
      "No categories found for user. Please create categories first.",
    );
  }

  const fewShotMap = new Map<
    number,
    Array<{
      payee: string;
      description?: string;
      categoryId: string;
      categoryName: string;
    }>
  >();

  for (const input of inputs) {
    const similar = await findSimilarTransactions(userId, input.payee, 10);
    const examples = similar
      .filter((s) => s.categoryId && s.categoryName)
      .map((s) => ({
        payee: s.payee,
        description: s.description || undefined,
        categoryId: s.categoryId!,
        categoryName: s.categoryName!,
      }));

    fewShotMap.set(input.csvRowIndex, examples);
  }

  const historicalHints: Array<{
    csvRowIndex: number;
    topCategoryId: string;
    confidence: number;
    matchCount: number;
    matchType: "exact" | "fuzzy";
  }> = [];

  for (const input of inputs) {
    const hint = input.historicalHint;
    if (hint && hint.matchCount >= MIN_MATCH_COUNT) {
      historicalHints.push({
        csvRowIndex: input.csvRowIndex,
        topCategoryId: hint.categoryId,
        confidence: hint.confidence,
        matchCount: hint.matchCount,
        matchType: hint.matchType as "exact" | "fuzzy",
      });
    }
  }

  const aiProvider = getDefaultAIProvider();
  const aiResults = await aiProvider.categorizeTransactions({
    transactions: inputs.map((tx) => ({
      csvRowIndex: tx.csvRowIndex,
      payee: tx.payee,
      description: tx.description,
      notes: tx.notes,
    })),
    availableCategories: userCategories,
    fewShotExamples: Array.from(fewShotMap.values())
      .flat()
      .slice(0, CSV_IMPORT_CONFIG.AI.MAX_FEW_SHOT_EXAMPLES),
    historicalHints,
  });

  const aiResultsMap = new Map(aiResults.map((r) => [r.csvRowIndex, r]));

  const results: CategorizationResult[] = [];

  for (const input of inputs) {
    const aiResult = aiResultsMap.get(input.csvRowIndex);
    const transactionType = await detectTransactionType(input.amount);

    const hint = input.historicalHint;
    const resolvedTypeId =
      hint && hint.matchCount >= MIN_MATCH_COUNT
        ? hint.transactionTypeId
        : transactionType.id;

    if (!aiResult || !aiResult.topSuggestion) {
      results.push({
        csvRowIndex: input.csvRowIndex,
        suggestion: {
          categoryId: null,
          transactionTypeId: resolvedTypeId,
          confidence: 0.0,
          normalizedPayee: normalizePayeeName(input.payee),
        },
      });
      continue;
    }

    const topSuggestion = aiResult.topSuggestion;

    const categoryMatch = topSuggestion.categoryId
      ? userCategories.find((cat) => cat.id === topSuggestion.categoryId)
      : null;

    if (topSuggestion.categoryId && !categoryMatch) {
      console.error(
        `⚠️  AI returned invalid category ID: ${topSuggestion.categoryId} for transaction:`,
        input.payee,
      );

      results.push({
        csvRowIndex: input.csvRowIndex,
        suggestion: {
          categoryId: null,
          transactionTypeId: resolvedTypeId,
          confidence: 0.0,
          normalizedPayee: normalizePayeeName(input.payee),
        },
      });
      continue;
    }

    results.push({
      csvRowIndex: input.csvRowIndex,
      suggestion: {
        categoryId:
          topSuggestion.confidence >=
          CSV_IMPORT_CONFIG.AI.MIN_CONFIDENCE_THRESHOLD
            ? topSuggestion.categoryId
            : null,
        transactionTypeId: resolvedTypeId,
        confidence: topSuggestion.confidence,
        normalizedPayee: normalizePayeeName(input.payee),
      },
    });
  }

  return results.sort((a, b) => a.csvRowIndex - b.csvRowIndex);
}
