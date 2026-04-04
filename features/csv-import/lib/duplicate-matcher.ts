/**
 * Duplicate Matcher
 * 
 * Detects duplicate transactions using exact and fuzzy matching.
 */

import { db } from '@/db/drizzle';
import { accounts, transactions } from '@/db/schema';
import { and, between, eq, sql } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export type TransactionInput = {
  date: Date;
  amount: number; // In milliunits
  payee: string;
};

export type MatchType = 'exact' | 'fuzzy';

export type DuplicateMatch = {
  csvIndex: number;
  existingTransaction: {
    id: string;
    date: Date;
    amount: number;
    payee: string;
    accountId: string;
  };
  matchType: MatchType;
  score: number; // 0-1 (1 = perfect match)
};

export type DuplicateDetectionResult = {
  duplicates: DuplicateMatch[];
  totalChecked: number;
  exactMatches: number;
  fuzzyMatches: number;
};

// ============================================================================
// Configuration
// ============================================================================

const FUZZY_CONFIG = {
  dateTolerance: 2, // ±2 days
  amountTolerance: 0.01, // ±1%
  similarityThreshold: 0.85, // 85% similarity
};

// ============================================================================
// Exact Match
// ============================================================================

/**
 * Find exact duplicates
 * Matches: same date, same amount, same payee (case-insensitive)
 */
async function findExactMatches(
  userId: string,
  inputs: TransactionInput[]
): Promise<Map<number, DuplicateMatch>> {
  const matches = new Map<number, DuplicateMatch>();

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];

    const results = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payee: transactions.payee,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          eq(transactions.date, input.date),
          eq(transactions.amount, input.amount),
          sql`LOWER(${transactions.payee}) = LOWER(${input.payee})`
        )
      )
      .limit(1);

    if (results.length > 0) {
      matches.set(i, {
        csvIndex: i,
        existingTransaction: results[0],
        matchType: 'exact',
        score: 1.0,
      });
    }
  }

  return matches;
}

// ============================================================================
// Fuzzy Match
// ============================================================================

/**
 * Find fuzzy duplicates using pg_trgm similarity
 * Matches: date ±2 days, amount ±1%, payee similarity >85%
 */
async function findFuzzyMatches(
  userId: string,
  inputs: TransactionInput[],
  exactMatches: Map<number, DuplicateMatch>
): Promise<Map<number, DuplicateMatch>> {
  const matches = new Map<number, DuplicateMatch>();

  for (let i = 0; i < inputs.length; i++) {
    // Skip if already has exact match
    if (exactMatches.has(i)) continue;

    const input = inputs[i];

    // Date range: ±2 days
    const dateMin = new Date(input.date);
    dateMin.setDate(dateMin.getDate() - FUZZY_CONFIG.dateTolerance);
    const dateMax = new Date(input.date);
    dateMax.setDate(dateMax.getDate() + FUZZY_CONFIG.dateTolerance);

    // Amount range: ±1%
    const amountMin = Math.floor(input.amount * (1 - FUZZY_CONFIG.amountTolerance));
    const amountMax = Math.ceil(input.amount * (1 + FUZZY_CONFIG.amountTolerance));

    const results = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payee: transactions.payee,
        accountId: transactions.accountId,
        similarity: sql<number>`similarity(${transactions.payee}, ${input.payee}::text)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          between(transactions.date, dateMin, dateMax),
          between(transactions.amount, amountMin, amountMax),
          sql`similarity(${transactions.payee}, ${input.payee}::text) > ${FUZZY_CONFIG.similarityThreshold}`
        )
      )
      .orderBy(sql`similarity(${transactions.payee}, ${input.payee}::text) DESC`)
      .limit(1);

    if (results.length > 0) {
      const result = results[0];
      matches.set(i, {
        csvIndex: i,
        existingTransaction: {
          id: result.id,
          date: result.date,
          amount: result.amount,
          payee: result.payee,
          accountId: result.accountId,
        },
        matchType: 'fuzzy',
        score: result.similarity,
      });
    }
  }

  return matches;
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Detect duplicates in batch
 * Returns all matches (exact + fuzzy)
 */
export async function detectDuplicates(
  userId: string,
  inputs: TransactionInput[]
): Promise<DuplicateDetectionResult> {
  // Validate batch size
  if (inputs.length > 100) {
    throw new Error('Maximum 100 transactions per batch');
  }

  // Find exact matches first
  const exactMatches = await findExactMatches(userId, inputs);

  // Find fuzzy matches (excluding exact matches)
  const fuzzyMatches = await findFuzzyMatches(userId, inputs, exactMatches);

  // Combine results
  const allMatches = new Map([...exactMatches, ...fuzzyMatches]);
  const duplicates = Array.from(allMatches.values()).sort(
    (a, b) => a.csvIndex - b.csvIndex
  );

  return {
    duplicates,
    totalChecked: inputs.length,
    exactMatches: exactMatches.size,
    fuzzyMatches: fuzzyMatches.size,
  };
}
