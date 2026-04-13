import { db } from "@/db/drizzle";
import {
  accounts,
  categories,
  transactions,
  transactionTypes,
} from "@/db/schema";
import { getDefaultAIProvider } from "@/lib/ai";
import { normalizePayeeName } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";

export type TransactionInput = {
  csvRowIndex: number;
  date: string;
  amount: number;
  payee: string;
  description?: string;
  notes?: string;
};

export type CategorizationSuggestion = {
  categoryId: string | null;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

export type CategorizationResult = {
  csvRowIndex: number;
  suggestion: CategorizationSuggestion;
};

async function detectTransactionType(amount: number): Promise<{
  id: string;
  name: string;
}> {
  const typeName = amount < 0 ? "expense" : "income";

  const [type] = await db
    .select({
      id: transactionTypes.id,
      name: transactionTypes.name,
    })
    .from(transactionTypes)
    .where(sql`LOWER(${transactionTypes.name}) = ${typeName}`)
    .limit(1);

  if (!type) {
    throw new Error(`Transaction type '${typeName}' not found in database`);
  }

  return type;
}

async function findSimilarTransactions(
  userId: string,
  payee: string,
  limit: number = 10,
): Promise<
  Array<{
    payee: string;
    description: string | null;
    categoryId: string | null;
    categoryName: string | null;
  }>
> {
  const normalizedPayee = normalizePayeeName(payee);
  const searchTerm = normalizedPayee.split(" ")[0];

  const results = await db
    .select({
      payee: transactions.payee,
      description: transactions.notes,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      sql`${accounts.userId} = ${userId} 
          AND ${transactions.payee} ILIKE ${`%${searchTerm}%`}
          AND ${transactions.categoryId} IS NOT NULL`,
    )
    .limit(limit);

  return results;
}

export async function categorizeTransactions(
  userId: string,
  inputs: TransactionInput[],
): Promise<CategorizationResult[]> {
  if (inputs.length > CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION) {
    throw new Error(
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION} transactions per batch`,
    );
  }

  const userCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .where(eq(categories.userId, userId));

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
  });

  const results: CategorizationResult[] = [];

  for (const input of inputs) {
    const aiResult = aiResults.find((r) => r.csvRowIndex === input.csvRowIndex);
    const transactionType = await detectTransactionType(input.amount);

    if (!aiResult || !aiResult.topSuggestion) {
      results.push({
        csvRowIndex: input.csvRowIndex,
        suggestion: {
          categoryId: null,
          transactionTypeId: transactionType.id,
          confidence: 0.0,
          normalizedPayee: normalizePayeeName(input.payee),
        },
      });
      continue;
    }

    const topSuggestion = aiResult.topSuggestion;

    // CRITICAL: Validate that AI returned a valid category ID
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
          transactionTypeId: transactionType.id,
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
        transactionTypeId: transactionType.id,
        confidence: topSuggestion.confidence,
        normalizedPayee: normalizePayeeName(input.payee),
      },
    });
  }

  return results;
}
