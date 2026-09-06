import { type SQL, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categories } from "@/db/schema";
import { MatchType } from "@/features/csv-import/const/import-const";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import type {
  AICategorization,
  PayeeCategoryMatch,
  PayeeMatchResult,
  TransactionForAnalysis,
} from "@/features/csv-import/types/import-types";
import {
  getTransactionTypeForAmount,
  isSupportedTransactionTypeId,
  SUPPORTED_TRANSACTION_TYPE_IDS,
  type SupportedTransactionTypeId,
} from "@/features/transaction-types/lib/transaction-types";
import type { CategorizationResult as AIProviderCategorizationResult } from "@/lib/ai/types";
import { isRateLimitError } from "@/lib/errors";
import { normalizePayeeName } from "@/lib/utils";

const matchedTransactionRowSchema = z.object({
  accountId: z.string(),
  amount: z.coerce.number(),
  csvRowIndex: z.coerce.number(),
  date: z.coerce.date(),
  id: z.string(),
  payee: z.string(),
  similarity: z.coerce.number().optional(),
});

type MatchedTransactionRow = z.infer<typeof matchedTransactionRowSchema>;

const payeeMatchRowSchema = z.object({
  categoryId: z.string().nullable(),
  csvRowIndex: z.coerce.number(),
  matchCount: z.coerce.number(),
  transactionTypeId: z.string(),
});

type PayeeMatchRow = z.infer<typeof payeeMatchRowSchema>;

type CategoryRow = { id: string; name: string };

type HistoricalHint = {
  categoryId: string;
  confidence: number;
  matchCount: number;
  matchType: "exact" | "fuzzy";
  transactionTypeId: SupportedTransactionTypeId;
};

type AITransaction = TransactionForAnalysis & {
  historicalHint?: HistoricalHint;
};

type AutoResolvedTransaction = {
  categoryId: string;
  confidence: number;
  csvRowIndex: number;
  normalizedPayee: string;
  transactionTypeId: SupportedTransactionTypeId;
};

const fewShotRowSchema = z.object({
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  csvRowIndex: z.coerce.number(),
  description: z.string().nullable(),
  payee: z.string(),
});

type FewShotRow = z.infer<typeof fewShotRowSchema>;

type AnalysisDuplicate = {
  csvIndex: number;
  existingTransaction: {
    accountId: string;
    amount: number;
    date: string;
    id: string;
    payee: string;
  };
  matchType: MatchType;
  score: number;
};

export type CsvImportAnalysisMetrics = {
  elapsedMs: number;
  inputSize: number;
  persistencePhases: readonly string[];
  persistenceQueryCount: number;
};

export type CsvImportAnalysisResult = {
  categorizations: AICategorization[];
  duplicateSummary: {
    exactMatches: number;
    fuzzyMatches: number;
    totalChecked: number;
    totalDuplicates: number;
  };
  duplicates: AnalysisDuplicate[];
  payeeMatches: PayeeMatchResult[];
};

export type CsvImportAnalysisDependencies = {
  categorizeWithAI: (params: {
    availableCategories: CategoryRow[];
    fewShotExamples: Array<{
      categoryId: string;
      categoryName: string;
      description?: string;
      payee: string;
    }>;
    historicalHints: Array<{
      confidence: number;
      csvRowIndex: number;
      matchCount: number;
      matchType: "exact" | "fuzzy";
      topCategoryId: string;
    }>;
    transactions: Array<{
      csvRowIndex: number;
      description?: string;
      notes?: string;
      payee: string;
    }>;
  }) => Promise<AIProviderCategorizationResult[]>;
  findExactDuplicateRows: (
    userId: string,
    inputs: TransactionForAnalysis[],
  ) => Promise<MatchedTransactionRow[]>;
  findExactPayeeRows: (
    userId: string,
    inputs: TransactionForAnalysis[],
  ) => Promise<PayeeMatchRow[]>;
  findFewShotRows: (
    userId: string,
    inputs: TransactionForAnalysis[],
  ) => Promise<FewShotRow[]>;
  findFuzzyDuplicateRows: (
    userId: string,
    inputs: TransactionForAnalysis[],
  ) => Promise<MatchedTransactionRow[]>;
  findFuzzyPayeeRows: (
    userId: string,
    inputs: TransactionForAnalysis[],
  ) => Promise<PayeeMatchRow[]>;
  getUserCategories: (userId: string) => Promise<CategoryRow[]>;
  now: () => number;
  onComplete: (metrics: CsvImportAnalysisMetrics) => void;
};

const executeRows = async <T>(schema: z.ZodType<T>, query: SQL): Promise<T[]> => {
  const result = await db.execute(query);
  return z.array(schema).parse(result.rows);
};

const transactionInputPayload = (inputs: TransactionForAnalysis[]) =>
  inputs.map((input) => ({
    amount: input.amount,
    csvRowIndex: input.csvRowIndex,
    date: input.date,
    payee: input.payee,
  }));

const findExactDuplicateRows = (userId: string, inputs: TransactionForAnalysis[]) =>
  executeRows(
    matchedTransactionRowSchema,
    sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(transactionInputPayload(inputs))}::jsonb)
          AS input("csvRowIndex" integer, "date" timestamp, "amount" integer, "payee" text)
      )
      SELECT DISTINCT ON (input."csvRowIndex")
        input."csvRowIndex",
        transaction.id,
        transaction.date,
        transaction.amount,
        transaction.payee,
        transaction.account_id AS "accountId"
      FROM input
      INNER JOIN transactions AS transaction
        ON transaction.date = input."date"
        AND transaction.amount = input."amount"
        AND LOWER(transaction.payee) = LOWER(input."payee")
      INNER JOIN accounts AS account ON account.id = transaction.account_id
      WHERE account.user_id = ${userId}
      ORDER BY input."csvRowIndex", transaction.id
    `,
  );

const findFuzzyDuplicateRows = (userId: string, inputs: TransactionForAnalysis[]) => {
  if (inputs.length === 0) return Promise.resolve([]);

  const { AMOUNT_TOLERANCE_PERCENT, DATE_TOLERANCE_DAYS, SIMILARITY_THRESHOLD } =
    CSV_IMPORT_CONFIG.DUPLICATE_DETECTION;

  return executeRows(
    matchedTransactionRowSchema,
    sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(transactionInputPayload(inputs))}::jsonb)
          AS input("csvRowIndex" integer, "date" timestamp, "amount" integer, "payee" text)
      )
      SELECT
        input."csvRowIndex",
        candidate.id,
        candidate.date,
        candidate.amount,
        candidate.payee,
        candidate."accountId",
        candidate.similarity
      FROM input
      INNER JOIN LATERAL (
        SELECT
          transaction.id,
          transaction.date,
          transaction.amount,
          transaction.payee,
          transaction.account_id AS "accountId",
          similarity(transaction.payee, input."payee") AS similarity
        FROM transactions AS transaction
        INNER JOIN accounts AS account ON account.id = transaction.account_id
        WHERE account.user_id = ${userId}
          AND transaction.date BETWEEN input."date" - (${DATE_TOLERANCE_DAYS} * INTERVAL '1 day')
            AND input."date" + (${DATE_TOLERANCE_DAYS} * INTERVAL '1 day')
          AND transaction.amount BETWEEN LEAST(
            FLOOR(input."amount" * ${1 - AMOUNT_TOLERANCE_PERCENT}),
            CEIL(input."amount" * ${1 + AMOUNT_TOLERANCE_PERCENT})
          ) AND GREATEST(
            FLOOR(input."amount" * ${1 - AMOUNT_TOLERANCE_PERCENT}),
            CEIL(input."amount" * ${1 + AMOUNT_TOLERANCE_PERCENT})
          )
          AND similarity(transaction.payee, input."payee") > ${SIMILARITY_THRESHOLD}
        ORDER BY similarity(transaction.payee, input."payee") DESC, transaction.id
        LIMIT 1
      ) AS candidate ON TRUE
    `,
  );
};

const findPayeeRows = (
  userId: string,
  inputs: TransactionForAnalysis[],
  matchCondition: SQL,
) => {
  if (inputs.length === 0) return Promise.resolve([]);

  return executeRows(
    payeeMatchRowSchema,
    sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(transactionInputPayload(inputs))}::jsonb)
          AS input("csvRowIndex" integer, "date" timestamp, "amount" integer, "payee" text)
      )
      SELECT
        input."csvRowIndex",
        transaction.category_id AS "categoryId",
        transaction.transaction_type_id AS "transactionTypeId",
        COUNT(*)::integer AS "matchCount"
      FROM input
      INNER JOIN transactions AS transaction ON ${matchCondition}
      INNER JOIN accounts AS account ON account.id = transaction.account_id
      WHERE account.user_id = ${userId}
        AND transaction.category_id IS NOT NULL
        AND transaction.transaction_type_id IN (${sql.join(
          SUPPORTED_TRANSACTION_TYPE_IDS.map((id) => sql`${id}`),
          sql`, `,
        )})
      GROUP BY input."csvRowIndex", transaction.category_id, transaction.transaction_type_id
      ORDER BY input."csvRowIndex", COUNT(*) DESC
    `,
  );
};

const findExactPayeeRows = (userId: string, inputs: TransactionForAnalysis[]) =>
  findPayeeRows(
    userId,
    inputs,
    sql`LOWER(transaction.payee) = LOWER(input."payee")`,
  );

const findFuzzyPayeeRows = (userId: string, inputs: TransactionForAnalysis[]) =>
  findPayeeRows(
    userId,
    inputs,
    sql`similarity(transaction.payee, input."payee") > ${CSV_IMPORT_CONFIG.PAYEE_MATCHING.SIMILARITY_THRESHOLD}`,
  );

const getUserCategories = (userId: string) =>
  db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(sql`${categories.userId} = ${userId}`);

const findFewShotRows = (userId: string, inputs: TransactionForAnalysis[]) => {
  if (inputs.length === 0) return Promise.resolve([]);

  const payload = inputs.map((input) => ({
    csvRowIndex: input.csvRowIndex,
    searchTerm: normalizePayeeName(input.payee).split(" ")[0],
  }));

  return executeRows(
    fewShotRowSchema,
    sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
          AS input("csvRowIndex" integer, "searchTerm" text)
      )
      SELECT
        input."csvRowIndex",
        example.payee,
        example.description,
        example."categoryId",
        example."categoryName"
      FROM input
      INNER JOIN LATERAL (
        SELECT
          transaction.payee,
          transaction.notes AS description,
          transaction.category_id AS "categoryId",
          category.name AS "categoryName"
        FROM transactions AS transaction
        INNER JOIN accounts AS account ON account.id = transaction.account_id
        LEFT JOIN categories AS category ON category.id = transaction.category_id
        WHERE account.user_id = ${userId}
          AND transaction.category_id IS NOT NULL
          AND transaction.payee ILIKE '%' || input."searchTerm" || '%'
        ORDER BY transaction.id
        LIMIT 10
      ) AS example ON TRUE
    `,
  );
};

const categorizeWithAI = async (
  params: Parameters<CsvImportAnalysisDependencies["categorizeWithAI"]>[0],
): Promise<AIProviderCategorizationResult[]> => {
  const { getDefaultAIProvider } = await import("@/lib/ai");
  return getDefaultAIProvider().categorizeTransactions(params);
};

const defaultDependencies: CsvImportAnalysisDependencies = {
  categorizeWithAI,
  findExactDuplicateRows,
  findExactPayeeRows,
  findFewShotRows,
  findFuzzyDuplicateRows,
  findFuzzyPayeeRows,
  getUserCategories,
  now: () => Date.now(),
  onComplete: (metrics) => {
    console.info("[CSV Import Analysis] completed", metrics);
  },
};

const toDuplicate = (
  row: MatchedTransactionRow,
  matchType: MatchType,
): AnalysisDuplicate => ({
  csvIndex: row.csvRowIndex,
  existingTransaction: {
    accountId: row.accountId,
    amount: row.amount,
    date: row.date.toISOString().slice(0, 10),
    id: row.id,
    payee: row.payee,
  },
  matchType,
  score: matchType === MatchType.Exact ? 1 : row.similarity ?? 0,
});

const toPayeeCategoryMatches = (
  rows: PayeeMatchRow[],
  matchType: MatchType,
): PayeeCategoryMatch[] => {
  const totalMatches = rows.reduce((sum, row) => sum + row.matchCount, 0);

  return rows.flatMap((row) => {
    if (
      row.categoryId === null ||
      !isSupportedTransactionTypeId(row.transactionTypeId)
    ) {
      return [];
    }

    return [{
      categoryId: row.categoryId,
      confidence: row.matchCount / totalMatches,
      matchCount: row.matchCount,
      matchType,
      totalMatches,
      transactionTypeId: row.transactionTypeId,
    }];
  });
};

const buildPayeeMatchResults = (
  inputs: TransactionForAnalysis[],
  exactRows: PayeeMatchRow[],
  fuzzyRows: PayeeMatchRow[],
): PayeeMatchResult[] => {
  const exactByRow = Map.groupBy(exactRows, (row) => row.csvRowIndex);
  const fuzzyByRow = Map.groupBy(fuzzyRows, (row) => row.csvRowIndex);
  const { MIN_MATCH_COUNT } = CSV_IMPORT_CONFIG.PAYEE_MATCHING;
  return inputs.map((input) => {
    const exactMatches = toPayeeCategoryMatches(
      exactByRow.get(input.csvRowIndex) ?? [],
      MatchType.Exact,
    );
    const matches =
      exactMatches.length > 0
        ? exactMatches
        : toPayeeCategoryMatches(
            fuzzyByRow.get(input.csvRowIndex) ?? [],
            MatchType.Fuzzy,
          );
    const qualifiedMatches = matches.filter(
      (match) => match.matchCount >= MIN_MATCH_COUNT,
    );

    return { csvRowIndex: input.csvRowIndex, matches: qualifiedMatches };
  });
};

const buildFewShotExamples = (fewShotRows: FewShotRow[]) =>
  fewShotRows
    .flatMap((row) => {
      if (row.categoryId === null || row.categoryName === null) return [];

      return [{
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        description: row.description ?? undefined,
        payee: row.payee,
      }];
    })
    .slice(0, CSV_IMPORT_CONFIG.AI.MAX_FEW_SHOT_EXAMPLES);

const createAICategorizations = (
  inputs: AITransaction[],
  aiResults: AIProviderCategorizationResult[],
  categoriesById: Set<string>,
): AICategorization[] => {
  const resultsByRow = new Map(
    aiResults.map((result) => [result.csvRowIndex, result]),
  );
  const { MIN_MATCH_COUNT } = CSV_IMPORT_CONFIG.PAYEE_MATCHING;

  return inputs.map((input) => {
    const result = resultsByRow.get(input.csvRowIndex);
    const hint = input.historicalHint;
    const transactionTypeId =
      hint && hint.matchCount >= MIN_MATCH_COUNT
        ? hint.transactionTypeId
        : getTransactionTypeForAmount(input.amount).id;
    const categoryId = result?.topSuggestion.categoryId;
    const validCategoryId =
      categoryId !== null && categoryId !== undefined && categoriesById.has(categoryId)
        ? categoryId
        : null;

    return {
      categoryId:
        result &&
        result.topSuggestion.confidence >=
          CSV_IMPORT_CONFIG.AI.MIN_CONFIDENCE_THRESHOLD
          ? validCategoryId
          : null,
      confidence: result?.topSuggestion.confidence ?? 0,
      csvRowIndex: input.csvRowIndex,
      normalizedPayee: normalizePayeeName(input.payee),
      transactionTypeId,
    };
  });
};

const categorizeInBatches = async (
  dependencies: CsvImportAnalysisDependencies,
  params: Parameters<CsvImportAnalysisDependencies["categorizeWithAI"]>[0],
) => {
  const batches = Array.from(
    { length: Math.ceil(params.transactions.length / CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION) },
    (_, index) =>
      params.transactions.slice(
        index * CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION,
        (index + 1) * CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION,
      ),
  );
  const results: AIProviderCategorizationResult[] = [];

  for (let index = 0; index < batches.length; index += 3) {
    const chunk = batches.slice(index, index + 3);
    const chunkResults = await Promise.all(
      chunk.map(async (transactions) => {
        let attempt = 0;
        while (true) {
          try {
            return await dependencies.categorizeWithAI({
              ...params,
              transactions,
            });
          } catch (error) {
            if (isRateLimitError(error) || attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
            attempt += 1;
          }
        }
      }),
    );
    results.push(...chunkResults.flat());
  }

  return results;
};

export const createCsvImportAnalysisOperations = (
  dependencies: CsvImportAnalysisDependencies = defaultDependencies,
) => ({
  analyzeCsvImport: async (
    userId: string,
    inputs: TransactionForAnalysis[],
  ): Promise<CsvImportAnalysisResult> => {
    const startedAt = dependencies.now();
    const phases: string[] = [];

    const [exactDuplicateRows, exactPayeeRows] = await Promise.all([
      dependencies.findExactDuplicateRows(userId, inputs),
      dependencies.findExactPayeeRows(userId, inputs),
    ]);
    phases.push("duplicate_exact", "payee_exact");

    const exactDuplicateIndices = new Set(
      exactDuplicateRows.map((row) => row.csvRowIndex),
    );
    const exactPayeeIndices = new Set(
      exactPayeeRows.map((row) => row.csvRowIndex),
    );
    const fuzzyDuplicateInputs = inputs.filter(
      (input) => !exactDuplicateIndices.has(input.csvRowIndex),
    );
    const fuzzyPayeeInputs = inputs.filter(
      (input) => !exactPayeeIndices.has(input.csvRowIndex),
    );
    const [fuzzyDuplicateRows, fuzzyPayeeRows] = await Promise.all([
      fuzzyDuplicateInputs.length > 0
        ? dependencies.findFuzzyDuplicateRows(userId, fuzzyDuplicateInputs)
        : Promise.resolve([]),
      fuzzyPayeeInputs.length > 0
        ? dependencies.findFuzzyPayeeRows(userId, fuzzyPayeeInputs)
        : Promise.resolve([]),
    ]);
    if (fuzzyDuplicateInputs.length > 0) phases.push("duplicate_fuzzy");
    if (fuzzyPayeeInputs.length > 0) phases.push("payee_fuzzy");

    const payeeMatches = buildPayeeMatchResults(
      inputs,
      exactPayeeRows,
      fuzzyPayeeRows,
    );
    const payeeMatchesByRow = new Map(
      payeeMatches.map((match) => [match.csvRowIndex, match.matches]),
    );
    const { AUTO_RESOLVE_CONFIDENCE, MIN_MATCH_COUNT } =
      CSV_IMPORT_CONFIG.PAYEE_MATCHING;
    const autoResolved: AutoResolvedTransaction[] = [];
    const aiTransactions: AITransaction[] = [];

    for (const input of inputs) {
      const top = payeeMatchesByRow.get(input.csvRowIndex)?.[0];
      if (
        top &&
        top.confidence >= AUTO_RESOLVE_CONFIDENCE &&
        top.matchCount >= MIN_MATCH_COUNT
      ) {
        autoResolved.push({
          categoryId: top.categoryId,
          confidence: top.confidence,
          csvRowIndex: input.csvRowIndex,
          normalizedPayee: normalizePayeeName(input.payee),
          transactionTypeId: top.transactionTypeId,
        });
        continue;
      }

      aiTransactions.push({
        ...input,
        historicalHint:
          top && top.matchCount >= MIN_MATCH_COUNT
            ? {
                categoryId: top.categoryId,
                confidence: top.confidence,
                matchCount: top.matchCount,
                matchType: top.matchType,
                transactionTypeId: top.transactionTypeId,
              }
            : undefined,
      });
    }

    let aiCategorizations: AICategorization[] = [];
    if (aiTransactions.length > 0) {
      const [userCategories, fewShotRows] = await Promise.all([
        dependencies.getUserCategories(userId),
        dependencies.findFewShotRows(userId, aiTransactions),
      ]);
      phases.push("categories", "few_shot_examples");

      if (userCategories.length === 0) {
        throw new Error("No categories found for user. Please create categories first.");
      }

      const historicalHints = aiTransactions.flatMap((input) => {
        const hint = input.historicalHint;
        return hint && hint.matchCount >= MIN_MATCH_COUNT
          ? [{
              confidence: hint.confidence,
              csvRowIndex: input.csvRowIndex,
              matchCount: hint.matchCount,
              matchType: hint.matchType,
              topCategoryId: hint.categoryId,
            }]
          : [];
      });
      const aiResults = await categorizeInBatches(dependencies, {
        availableCategories: userCategories,
        fewShotExamples: buildFewShotExamples(fewShotRows),
        historicalHints,
        transactions: aiTransactions.map((input) => ({
          csvRowIndex: input.csvRowIndex,
          description: input.description,
          notes: input.notes,
          payee: input.payee,
        })),
      });
      aiCategorizations = createAICategorizations(
        aiTransactions,
        aiResults,
        new Set(userCategories.map((category) => category.id)),
      );
    }

    const duplicates = [
      ...exactDuplicateRows.map((row) => toDuplicate(row, MatchType.Exact)),
      ...fuzzyDuplicateRows.map((row) => toDuplicate(row, MatchType.Fuzzy)),
    ].sort((left, right) => left.csvIndex - right.csvIndex);
    const categorizations = [...autoResolved, ...aiCategorizations]
      .sort((left, right) => left.csvRowIndex - right.csvRowIndex)
      .map((categorization) => ({ ...categorization }));
    const metrics = {
      elapsedMs: dependencies.now() - startedAt,
      inputSize: inputs.length,
      persistencePhases: phases,
      persistenceQueryCount: phases.length,
    };
    dependencies.onComplete(metrics);

    return {
      categorizations,
      duplicateSummary: {
        exactMatches: exactDuplicateRows.length,
        fuzzyMatches: fuzzyDuplicateRows.length,
        totalChecked: inputs.length,
        totalDuplicates: duplicates.length,
      },
      duplicates,
      payeeMatches,
    };
  },
});

const csvImportAnalysisOperations = createCsvImportAnalysisOperations();

export const analyzeCsvImport = csvImportAnalysisOperations.analyzeCsvImport;
