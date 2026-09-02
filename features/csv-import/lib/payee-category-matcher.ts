import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";
import { MatchType } from "@/features/csv-import/const/import-const";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import type {
  PayeeCategoryMatch,
  PayeeMatchDetectionResult,
  PayeeMatchInput,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";
import type { SupportedTransactionTypeId } from "@/features/transaction-types/lib/transaction-types";
import {
  isSupportedTransactionTypeId,
  SUPPORTED_TRANSACTION_TYPE_IDS,
} from "@/features/transaction-types/lib/transaction-types";

type PayeeMatchRow = {
  categoryId: string | null;
  transactionTypeId: string;
  matchCount: number;
};

type SupportedPayeeMatchRow = PayeeMatchRow & {
  categoryId: string;
  transactionTypeId: SupportedTransactionTypeId;
};

const isSupportedPayeeMatchRow = (
  row: PayeeMatchRow,
): row is SupportedPayeeMatchRow =>
  row.categoryId !== null && isSupportedTransactionTypeId(row.transactionTypeId);

const toPayeeCategoryMatches = (
  rows: PayeeMatchRow[],
  matchType: MatchType,
): PayeeCategoryMatch[] => {
  const totalMatches = rows.reduce((sum, row) => sum + row.matchCount, 0);

  return rows.filter(isSupportedPayeeMatchRow).map((row) => ({
    categoryId: row.categoryId,
    transactionTypeId: row.transactionTypeId,
    matchCount: row.matchCount,
    totalMatches,
    confidence: row.matchCount / totalMatches,
    matchType,
  }));
};

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
      and(
        eq(accounts.userId, userId),
        sql`LOWER(${transactions.payee}) = LOWER(${input.payee})
          AND ${transactions.categoryId} IS NOT NULL`,
        inArray(transactions.transactionTypeId, SUPPORTED_TRANSACTION_TYPE_IDS),
      ),
    )
    .groupBy(transactions.categoryId, transactions.transactionTypeId)
    .orderBy(sql`COUNT(*) DESC`);

  return toPayeeCategoryMatches(rows, MatchType.Exact);
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
      and(
        eq(accounts.userId, userId),
        sql`similarity(${transactions.payee}, ${input.payee}::text) > ${threshold}
          AND ${transactions.categoryId} IS NOT NULL`,
        inArray(transactions.transactionTypeId, SUPPORTED_TRANSACTION_TYPE_IDS),
      ),
    )
    .groupBy(transactions.categoryId, transactions.transactionTypeId)
    .orderBy(sql`COUNT(*) DESC`);

  return toPayeeCategoryMatches(rows, MatchType.Fuzzy);
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

    const qualifiedMatches = matches.filter(
      (match) => match.matchCount >= MIN_MATCH_COUNT,
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
