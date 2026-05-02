import { eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { MatchType } from "@/features/csv-import/const/import-const";
import type {
  PayeeCategoryMatch,
  PayeeMatchDetectionResult,
  PayeeMatchInput,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";

async function findExactPayeeMatches(
  userId: string,
  input: PayeeMatchInput,
): Promise<PayeeCategoryMatch[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      transactionTypeId: transactions.transactionTypeId,
      matchCount: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      sql`${accounts.userId} = ${userId}
          AND LOWER(${transactions.payee}) = LOWER(${input.payee})
          AND ${transactions.categoryId} IS NOT NULL`,
    )
    .groupBy(transactions.categoryId, transactions.transactionTypeId)
    .orderBy(sql`COUNT(*) DESC`);

  if (rows.length === 0) return [];

  const totalMatches = rows.reduce((sum, r) => sum + r.matchCount, 0);

  return rows
    .filter((r) => r.categoryId !== null)
    .map((r) => ({
      categoryId: r.categoryId!,
      transactionTypeId: r.transactionTypeId,
      matchCount: r.matchCount,
      totalMatches,
      confidence: r.matchCount / totalMatches,
      matchType: MatchType.Exact,
    }));
}

async function findFuzzyPayeeMatches(
  userId: string,
  input: PayeeMatchInput,
): Promise<PayeeCategoryMatch[]> {
  const threshold = CSV_IMPORT_CONFIG.PAYEE_MATCHING.SIMILARITY_THRESHOLD;

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      transactionTypeId: transactions.transactionTypeId,
      matchCount: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      sql`${accounts.userId} = ${userId}
          AND similarity(${transactions.payee}, ${input.payee}::text) > ${threshold}
          AND ${transactions.categoryId} IS NOT NULL`,
    )
    .groupBy(transactions.categoryId, transactions.transactionTypeId)
    .orderBy(sql`COUNT(*) DESC`);

  if (rows.length === 0) return [];

  const totalMatches = rows.reduce((sum, r) => sum + r.matchCount, 0);

  return rows
    .filter((r) => r.categoryId !== null)
    .map((r) => ({
      categoryId: r.categoryId!,
      transactionTypeId: r.transactionTypeId,
      matchCount: r.matchCount,
      totalMatches,
      confidence: r.matchCount / totalMatches,
      matchType: MatchType.Fuzzy,
    }));
}

async function resolveTransactionTypeByAmount(amount: number): Promise<string> {
  const typeName = amount < 0 ? "expense" : "income";
  const [type] = await db
    .select({ id: transactionTypes.id })
    .from(transactionTypes)
    .where(sql`LOWER(${transactionTypes.name}) = ${typeName}`)
    .limit(1);
  return type?.id ?? typeName;
}

export async function matchPayeesToCategories(
  userId: string,
  inputs: PayeeMatchInput[],
): Promise<PayeeMatchDetectionResult> {
  const { AUTO_RESOLVE_CONFIDENCE, MIN_MATCH_COUNT } =
    CSV_IMPORT_CONFIG.PAYEE_MATCHING;

  const results: PayeeMatchResult[] = [];
  let autoResolved = 0;
  let partialMatches = 0;
  let unmatched = 0;

  for (const input of inputs) {
    let matches = await findExactPayeeMatches(userId, input);

    if (matches.length === 0) {
      matches = await findFuzzyPayeeMatches(userId, input);
    }

    // Filter out matches that don't meet minimum count requirement
    const qualifiedMatches = matches.filter(
      (m) => m.matchCount >= MIN_MATCH_COUNT,
    );

    results.push({
      csvRowIndex: input.csvRowIndex,
      matches: qualifiedMatches,
    });

    if (qualifiedMatches.length === 0) {
      unmatched++;
    } else if (qualifiedMatches[0].confidence >= AUTO_RESOLVE_CONFIDENCE) {
      autoResolved++;
    } else {
      partialMatches++;
    }
  }

  return {
    results,
    summary: {
      totalChecked: inputs.length,
      autoResolved,
      partialMatches,
      unmatched,
    },
  };
}
