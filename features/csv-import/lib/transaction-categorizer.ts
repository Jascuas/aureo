/**
 * Transaction Categorizer
 * 
 * Uses AI with few-shot learning from user's transaction history.
 */

import { db } from '@/db/drizzle';
import { accounts, categories, transactions, transactionTypes } from '@/db/schema';
import { createAIProvider } from '@/lib/ai';
import { createCategorizationPrompt, CATEGORIZATION_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { eq, sql } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export type TransactionInput = {
  csvRowIndex: number;
  date: string;
  amount: number; // In milliunits
  payee: string;
  description?: string;
  notes?: string;
};

export type CategorizationSuggestion = {
  categoryId: string | null;
  categoryName: string | null;
  transactionTypeId: string;
  transactionTypeName: string;
  confidence: number;
  reasoning: string;
  normalizedPayee: string;
};

export type CategorizationResult = {
  csvRowIndex: number;
  suggestion: CategorizationSuggestion;
};

// ============================================================================
// Merchant Name Normalization
// ============================================================================

/**
 * Normalize merchant names for better matching
 * Examples:
 * - "AMAZON MKTPLACE" → "Amazon"
 * - "STARBUCKS #1234" → "Starbucks"
 * - "MERCADONA S.A." → "Mercadona"
 */
export function normalizeMerchantName(payee: string): string {
  let normalized = payee.trim();

  // Remove common suffixes
  normalized = normalized
    .replace(/\s+(S\.?A\.?|LTD\.?|INC\.?|LLC|CORP\.?|CO\.?)$/i, '')
    .replace(/\s+#\d+$/, '') // Store numbers: "Starbucks #1234"
    .replace(/\s+\d{3,}$/, '') // Transaction IDs
    .replace(/\s+MKTPLACE$/i, '') // Amazon Marketplace
    .replace(/\s+MKTP$/i, '') // Marketplace abbreviation
    .trim();

  // Capitalize first letter of each word
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return normalized;
}

// ============================================================================
// Transaction Type Detection
// ============================================================================

/**
 * Detect transaction type from amount sign
 * - Negative amount → Expense
 * - Positive amount → Income
 */
async function detectTransactionType(amount: number): Promise<{
  id: string;
  name: string;
}> {
  const typeName = amount < 0 ? 'expense' : 'income';

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

// ============================================================================
// Few-Shot Learning
// ============================================================================

/**
 * Find similar transactions from user's history for few-shot learning
 * Uses ILIKE for fuzzy matching on payee
 */
async function findSimilarTransactions(
  userId: string,
  payee: string,
  limit: number = 10
): Promise<
  Array<{
    payee: string;
    description: string | null;
    categoryId: string | null;
    categoryName: string | null;
  }>
> {
  const normalizedPayee = normalizeMerchantName(payee);

  // Extract first significant word for ILIKE search
  const searchTerm = normalizedPayee.split(' ')[0];

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
          AND ${transactions.categoryId} IS NOT NULL`
    )
    .limit(limit);

  return results;
}

// ============================================================================
// Main Categorization Logic
// ============================================================================

/**
 * Categorize transactions using AI with few-shot learning
 */
export async function categorizeTransactions(
  userId: string,
  inputs: TransactionInput[]
): Promise<CategorizationResult[]> {
  // Validate batch size
  if (inputs.length > 50) {
    throw new Error('Maximum 50 transactions per batch');
  }

  // Get all available categories for this user
  const userCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .where(eq(categories.userId, userId));

  if (userCategories.length === 0) {
    throw new Error('No categories found for user. Please create categories first.');
  }

  // Collect few-shot examples for each transaction
  const fewShotMap = new Map<
    number,
    Array<{ payee: string; description?: string; categoryId: string; categoryName: string }>
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

  // Prepare AI prompt
  const prompt = createCategorizationPrompt({
    transactions: inputs.map((tx) => ({
      csvRowIndex: tx.csvRowIndex,
      date: tx.date,
      amount: tx.amount,
      payee: tx.payee,
      description: tx.description,
      notes: tx.notes,
    })),
    availableCategories: userCategories,
    fewShotExamples: Array.from(fewShotMap.values()).flat().slice(0, 20), // Max 20 examples total
  });

  // Call AI
  const aiProvider = createAIProvider();
  const aiResponse = await aiProvider.categorize(CATEGORIZATION_SYSTEM_PROMPT, prompt);

  // Map AI results to our format
  const results: CategorizationResult[] = [];

  for (const input of inputs) {
    const aiResult = aiResponse.results.find((r) => r.csvRowIndex === input.csvRowIndex);

    // Detect transaction type from amount
    const transactionType = await detectTransactionType(input.amount);

    if (!aiResult || !aiResult.topSuggestion) {
      // No AI suggestion → manual review required
      results.push({
        csvRowIndex: input.csvRowIndex,
        suggestion: {
          categoryId: null,
          categoryName: null,
          transactionTypeId: transactionType.id,
          transactionTypeName: transactionType.name,
          confidence: 0.0,
          reasoning: 'No similar transactions found. Manual categorization required.',
          normalizedPayee: normalizeMerchantName(input.payee),
        },
      });
      continue;
    }

    const topSuggestion = aiResult.topSuggestion;

    results.push({
      csvRowIndex: input.csvRowIndex,
      suggestion: {
        categoryId: topSuggestion.confidence >= 0.7 ? topSuggestion.categoryId : null,
        categoryName: topSuggestion.categoryName,
        transactionTypeId: transactionType.id,
        transactionTypeName: transactionType.name,
        confidence: topSuggestion.confidence,
        reasoning: topSuggestion.reasoning,
        normalizedPayee: normalizeMerchantName(input.payee),
      },
    });
  }

  return results;
}
