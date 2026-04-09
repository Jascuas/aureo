import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";
import { and, between, eq, sql } from "drizzle-orm";
import { CSV_IMPORT_CONFIG } from "./config";

export type TransactionInput = {
  date: Date;
  amount: number;
  payee: string;
};

export type MatchType = "exact" | "fuzzy";

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
  score: number;
};

export type DuplicateDetectionResult = {
  duplicates: DuplicateMatch[];
  totalChecked: number;
  exactMatches: number;
  fuzzyMatches: number;
};

async function findExactMatches(
  userId: string,
  inputs: TransactionInput[],
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
          sql`LOWER(${transactions.payee}) = LOWER(${input.payee})`,
        ),
      )
      .limit(1);

    if (results.length > 0) {
      matches.set(i, {
        csvIndex: i,
        existingTransaction: results[0],
        matchType: "exact",
        score: 1.0,
      });
    }
  }

  return matches;
}

async function findFuzzyMatches(
  userId: string,
  inputs: TransactionInput[],
  exactMatches: Map<number, DuplicateMatch>,
): Promise<Map<number, DuplicateMatch>> {
  const matches = new Map<number, DuplicateMatch>();

  for (let i = 0; i < inputs.length; i++) {
    if (exactMatches.has(i)) continue;

    const input = inputs[i];

    const dateMin = new Date(input.date);
    dateMin.setDate(
      dateMin.getDate() -
        CSV_IMPORT_CONFIG.DUPLICATE_DETECTION.DATE_TOLERANCE_DAYS,
    );
    const dateMax = new Date(input.date);
    dateMax.setDate(
      dateMax.getDate() +
        CSV_IMPORT_CONFIG.DUPLICATE_DETECTION.DATE_TOLERANCE_DAYS,
    );

    const amountMin = Math.floor(
      input.amount *
        (1 - CSV_IMPORT_CONFIG.DUPLICATE_DETECTION.AMOUNT_TOLERANCE_PERCENT),
    );
    const amountMax = Math.ceil(
      input.amount *
        (1 + CSV_IMPORT_CONFIG.DUPLICATE_DETECTION.AMOUNT_TOLERANCE_PERCENT),
    );

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
          sql`similarity(${transactions.payee}, ${input.payee}::text) > ${CSV_IMPORT_CONFIG.DUPLICATE_DETECTION.SIMILARITY_THRESHOLD}`,
        ),
      )
      .orderBy(
        sql`similarity(${transactions.payee}, ${input.payee}::text) DESC`,
      )
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
        matchType: "fuzzy",
        score: result.similarity,
      });
    }
  }

  return matches;
}

export async function detectDuplicates(
  userId: string,
  inputs: TransactionInput[],
): Promise<DuplicateDetectionResult> {
  // No batch limit - duplicate detection is deterministic SQL queries
  // TODO: Optimize to use bulk queries instead of N+1 pattern

  const exactMatches = await findExactMatches(userId, inputs);
  const fuzzyMatches = await findFuzzyMatches(userId, inputs, exactMatches);

  const allMatches = new Map([...exactMatches, ...fuzzyMatches]);
  const duplicates = Array.from(allMatches.values()).sort(
    (a, b) => a.csvIndex - b.csvIndex,
  );

  return {
    duplicates,
    totalChecked: inputs.length,
    exactMatches: exactMatches.size,
    fuzzyMatches: fuzzyMatches.size,
  };
}
