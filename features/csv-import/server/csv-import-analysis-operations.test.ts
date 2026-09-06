import assert from "node:assert/strict";
import test from "node:test";

import { MatchType } from "@/features/csv-import/const/import-const";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import {
  createCsvImportAnalysisOperations,
  type CsvImportAnalysisDependencies,
  type CsvImportAnalysisMetrics,
  getFuzzyAmountBounds,
} from "@/features/csv-import/server/csv-import-analysis-operations";
import type { TransactionForAnalysis } from "@/features/csv-import/types/import-types";

const maximumImport = Array.from({ length: 1_000 }, (_, csvRowIndex) => ({
  amount: -10_000 - csvRowIndex,
  csvRowIndex,
  date: "2026-09-06",
  payee: `Payee ${csvRowIndex}`,
}));

const PERSISTENCE_ROUND_TRIP_DELAY_MS = 1;

const waitForPersistenceRoundTrip = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, PERSISTENCE_ROUND_TRIP_DELAY_MS);
  });

const measureLegacyPersistencePipeline = async (inputSize: number) => {
  const startedAt = performance.now();

  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Exact duplicate lookup.
  }
  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Fuzzy duplicate lookup.
  }
  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Exact payee lookup.
  }
  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Fuzzy payee lookup.
  }
  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Few-shot example lookup.
  }
  for (let index = 0; index < inputSize; index += 1) {
    await waitForPersistenceRoundTrip(); // Transaction-type lookup.
  }
  for (
    let index = 0;
    index < Math.ceil(inputSize / CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION);
    index += 1
  ) {
    await waitForPersistenceRoundTrip(); // Per-batch category lookup.
  }

  return {
    elapsedMs: performance.now() - startedAt,
    inputSize,
    persistencePhases: [
      "duplicate_exact_per_row",
      "duplicate_fuzzy_per_row",
      "payee_exact_per_row",
      "payee_fuzzy_per_row",
      "few_shot_per_row",
      "transaction_type_per_row",
      "categories_per_ai_batch",
    ],
    persistenceQueryCount:
      inputSize * 6 +
      Math.ceil(inputSize / CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION),
  };
};

test("preserves fuzzy duplicate amount bounds for negative and positive values", () => {
  assert.deepEqual(getFuzzyAmountBounds(-10_001), {
    amountMax: -9_900,
    amountMin: -10_102,
  });
  assert.deepEqual(getFuzzyAmountBounds(10_001), {
    amountMax: 10_102,
    amountMin: 9_900,
  });
});

test("normalizes confidence when AI returns a category outside the user category set", async () => {
  const dependencies: CsvImportAnalysisDependencies = {
    categorizeWithAI: async ({ transactions }) =>
      transactions.map((transaction) => ({
        csvRowIndex: transaction.csvRowIndex,
        topSuggestion: { categoryId: "other-users-category", confidence: 0.95 },
      })),
    findExactDuplicateRows: async () => [],
    findExactPayeeRows: async () => [],
    findFewShotRows: async () => [],
    findFuzzyDuplicateRows: async () => [],
    findFuzzyPayeeRows: async () => [],
    getUserCategories: async () => [{ id: "category-food", name: "Food" }],
    now: () => 0,
    onComplete: () => {},
  };
  const { analyzeCsvImport } = createCsvImportAnalysisOperations(dependencies);

  const result = await analyzeCsvImport("user-1", [{
    amount: -10_000,
    csvRowIndex: 0,
    date: "2026-09-06",
    payee: "Restaurant",
  }]);

  assert.deepEqual(result.categorizations, [{
    categoryId: null,
    confidence: 0,
    csvRowIndex: 0,
    normalizedPayee: "Restaurant",
    transactionTypeId: "expense",
  }]);
});

test("analyzes a maximum-size import with six persistence phases, not row queries", async () => {
  const calls = new Map<string, number>();
  const record = (name: string) => {
    calls.set(name, (calls.get(name) ?? 0) + 1);
  };
  const metrics: CsvImportAnalysisMetrics[] = [];
  let timestamp = 0;
  const dependencies: CsvImportAnalysisDependencies = {
    categorizeWithAI: async ({ transactions }) => {
      record("categorizeWithAI");
      return transactions.map((transaction) => ({
        csvRowIndex: transaction.csvRowIndex,
        topSuggestion: { categoryId: "category-food", confidence: 0.9 },
      }));
    },
    findExactDuplicateRows: async () => {
      record("findExactDuplicateRows");
      return [];
    },
    findExactPayeeRows: async () => {
      record("findExactPayeeRows");
      return [{
        categoryId: "category-groceries",
        csvRowIndex: 0,
        matchCount: 2,
        transactionTypeId: "expense",
      }];
    },
    findFewShotRows: async () => {
      record("findFewShotRows");
      return [{
        categoryId: "category-food",
        categoryName: "Food",
        csvRowIndex: 1,
        description: "Lunch",
        payee: "Restaurant",
      }];
    },
    findFuzzyDuplicateRows: async (userId, inputs) => {
      record("findFuzzyDuplicateRows");
      assert.equal(userId, "user-1");
      assert.equal(inputs.length, maximumImport.length);
      return [{
        accountId: "account-1",
        amount: inputs[1].amount,
        csvRowIndex: 1,
        date: new Date("2026-09-06T00:00:00.000Z"),
        id: "transaction-1",
        payee: inputs[1].payee,
        similarity: 0.91,
      }];
    },
    findFuzzyPayeeRows: async (userId, inputs) => {
      record("findFuzzyPayeeRows");
      assert.equal(userId, "user-1");
      assert.equal(inputs.length, maximumImport.length - 1);
      return [];
    },
    getUserCategories: async () => {
      record("getUserCategories");
      return [
        { id: "category-food", name: "Food" },
        { id: "category-groceries", name: "Groceries" },
      ];
    },
    now: () => {
      timestamp += 12;
      return timestamp;
    },
    onComplete: (analysisMetrics) => metrics.push(analysisMetrics),
  };

  const { analyzeCsvImport } = createCsvImportAnalysisOperations(dependencies);
  const result = await analyzeCsvImport(
    "user-1",
    maximumImport satisfies TransactionForAnalysis[],
  );

  assert.equal(result.categorizations.length, maximumImport.length);
  assert.deepEqual(result.categorizations[0], {
    categoryId: "category-groceries",
    confidence: 1,
    csvRowIndex: 0,
    normalizedPayee: "Payee 0",
    transactionTypeId: "expense",
  });
  assert.equal(result.categorizations[1].categoryId, "category-food");
  assert.deepEqual(result.duplicates, [{
    csvIndex: 1,
    existingTransaction: {
      accountId: "account-1",
      amount: maximumImport[1].amount,
      date: "2026-09-06",
      id: "transaction-1",
      payee: maximumImport[1].payee,
    },
    matchType: MatchType.Fuzzy,
    score: 0.91,
  }]);
  assert.equal(calls.get("findExactDuplicateRows"), 1);
  assert.equal(calls.get("findExactPayeeRows"), 1);
  assert.equal(calls.get("findFuzzyDuplicateRows"), 1);
  assert.equal(calls.get("findFuzzyPayeeRows"), 1);
  assert.equal(calls.get("findFewShotRows"), 1);
  assert.equal(calls.get("getUserCategories"), 1);
  assert.equal(calls.get("categorizeWithAI"), 34);
  assert.deepEqual(metrics, [{
    elapsedMs: 12,
    inputSize: 1_000,
    persistencePhases: [
      "duplicate_exact",
      "payee_exact",
      "duplicate_fuzzy",
      "payee_fuzzy",
      "categories",
      "few_shot_examples",
    ],
    persistenceQueryCount: 6,
  }]);
});

test("records representative maximum-size persistence evidence before and after batching", async () => {
  const before = await measureLegacyPersistencePipeline(maximumImport.length);
  const metrics: CsvImportAnalysisMetrics[] = [];
  const dependencies: CsvImportAnalysisDependencies = {
    categorizeWithAI: async ({ transactions }) =>
      transactions.map((transaction) => ({
        csvRowIndex: transaction.csvRowIndex,
        topSuggestion: { categoryId: "category-food", confidence: 0.9 },
      })),
    findExactDuplicateRows: async () => {
      await waitForPersistenceRoundTrip();
      return [];
    },
    findExactPayeeRows: async () => {
      await waitForPersistenceRoundTrip();
      return [];
    },
    findFewShotRows: async () => {
      await waitForPersistenceRoundTrip();
      return [];
    },
    findFuzzyDuplicateRows: async () => {
      await waitForPersistenceRoundTrip();
      return [];
    },
    findFuzzyPayeeRows: async () => {
      await waitForPersistenceRoundTrip();
      return [];
    },
    getUserCategories: async () => {
      await waitForPersistenceRoundTrip();
      return [{ id: "category-food", name: "Food" }];
    },
    now: () => performance.now(),
    onComplete: (analysisMetrics) => metrics.push(analysisMetrics),
  };
  const { analyzeCsvImport } = createCsvImportAnalysisOperations(dependencies);

  await analyzeCsvImport(
    "user-1",
    maximumImport satisfies TransactionForAnalysis[],
  );

  const [after] = metrics;
  assert.ok(after);
  assert.equal(before.inputSize, after.inputSize);
  assert.equal(before.persistenceQueryCount, 6_034);
  assert.equal(after.persistenceQueryCount, 6);
  assert.equal(before.persistencePhases.length, 7);
  assert.deepEqual(after.persistencePhases, [
    "duplicate_exact",
    "payee_exact",
    "duplicate_fuzzy",
    "payee_fuzzy",
    "categories",
    "few_shot_examples",
  ]);
  assert.ok(before.elapsedMs > after.elapsedMs);

  console.info(
    `CSV_IMPORT_ANALYSIS_PERFORMANCE_EVIDENCE=${JSON.stringify({
      before,
      after,
      roundTripDelayMs: PERSISTENCE_ROUND_TRIP_DELAY_MS,
    })}`,
  );
});

test("records only the persistence phases executed for fully auto-resolved input", async () => {
  const calls = new Map<string, number>();
  const record = (name: string) => {
    calls.set(name, (calls.get(name) ?? 0) + 1);
  };
  const metrics: CsvImportAnalysisMetrics[] = [];
  const input: TransactionForAnalysis[] = [{
    amount: -10_000,
    csvRowIndex: 0,
    date: "2026-09-06",
    payee: "Payee",
  }];
  const dependencies: CsvImportAnalysisDependencies = {
    categorizeWithAI: async () => {
      throw new Error("AI must not run for an auto-resolved transaction");
    },
    findExactDuplicateRows: async () => {
      record("findExactDuplicateRows");
      return [{
        accountId: "account-1",
        amount: -10_000,
        csvRowIndex: 0,
        date: new Date("2026-09-06T00:00:00.000Z"),
        id: "transaction-1",
        payee: "Payee",
      }];
    },
    findExactPayeeRows: async () => {
      record("findExactPayeeRows");
      return [{
        categoryId: "category-groceries",
        csvRowIndex: 0,
        matchCount: 2,
        transactionTypeId: "expense",
      }];
    },
    findFewShotRows: async () => {
      throw new Error("Few-shot lookup must not run for an auto-resolved transaction");
    },
    findFuzzyDuplicateRows: async () => {
      record("findFuzzyDuplicateRows");
      return [];
    },
    findFuzzyPayeeRows: async () => {
      record("findFuzzyPayeeRows");
      return [];
    },
    getUserCategories: async () => {
      throw new Error("Category lookup must not run for an auto-resolved transaction");
    },
    now: (() => {
      let timestamp = 0;
      return () => {
        timestamp += 10;
        return timestamp;
      };
    })(),
    onComplete: (analysisMetrics) => metrics.push(analysisMetrics),
  };

  const { analyzeCsvImport } = createCsvImportAnalysisOperations(dependencies);
  await analyzeCsvImport("user-1", input);

  assert.equal(calls.get("findExactDuplicateRows"), 1);
  assert.equal(calls.get("findExactPayeeRows"), 1);
  assert.equal(calls.get("findFuzzyDuplicateRows"), undefined);
  assert.equal(calls.get("findFuzzyPayeeRows"), undefined);
  assert.deepEqual(metrics, [{
    elapsedMs: 10,
    inputSize: 1,
    persistencePhases: ["duplicate_exact", "payee_exact"],
    persistenceQueryCount: 2,
  }]);
});
