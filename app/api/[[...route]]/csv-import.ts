import { zValidator } from "@hono/zod-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";

import { insertImportTemplateSchema } from "@/db/schema";
import { analyze } from "@/features/csv-import/lib/analyzer";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { detectDuplicates } from "@/features/csv-import/lib/duplicate-matcher";
import { matchPayeesToCategories } from "@/features/csv-import/lib/payee-category-matcher";
import { categorizeTransactions } from "@/features/csv-import/lib/transaction-categorizer";
import {
  createImportTemplate,
  deleteImportTemplate,
  importTransactions,
  listImportTemplates,
  updateImportTemplate,
} from "@/features/csv-import/server/csv-import-write-operations";
import { supportedTransactionTypeIdSchema } from "@/features/transaction-types/lib/transaction-types";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth as defaultRequireAuth } from "@/lib/auth-middleware";
import { isRateLimitError } from "@/lib/errors";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

// ============================================================================
// Validation Schemas
// ============================================================================

const isoDateSchema = z
  .string()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid date")
  .refine(
    (value) => {
      const parsedDate = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === value
      );
    },
    "Invalid date",
  )
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const transactionInputSchema = z.object({
  date: isoDateSchema,
  amount: z.number().int(), // Milliunits
  payee: z.string().min(1),
});

const analyzeTransactionSchema = z.object({
  csvRowIndex: z.number().int().min(0),
  date: z.string(),
  amount: z.number().int(),
  payee: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const analyzeSchema = z.object({
  transactions: z
    .array(analyzeTransactionSchema)
    .min(1, "At least one transaction required")
    .max(
      CSV_IMPORT_CONFIG.BATCH_LIMITS.DUPLICATE_CHECK,
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.DUPLICATE_CHECK} transactions per batch`,
    ),
});

const detectDuplicatesSchema = z.object({
  transactions: z
    .array(transactionInputSchema)
    .min(1, "At least one transaction required")
    .max(
      CSV_IMPORT_CONFIG.BATCH_LIMITS.DUPLICATE_CHECK,
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.DUPLICATE_CHECK} transactions per batch`,
    ),
});

const categorizeTransactionSchema = z.object({
  csvRowIndex: z.number().int().min(0),
  date: z.string(), // ISO date string
  amount: z.number().int(), // Milliunits
  payee: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  historicalHint: z
    .object({
      categoryId: z.string(),
      transactionTypeId: supportedTransactionTypeIdSchema,
      confidence: z.number(),
      matchCount: z.number().int(),
      matchType: z.enum(["exact", "fuzzy"]),
    })
    .optional(),
});

const categorizeTransactionsSchema = z.object({
  transactions: z
    .array(categorizeTransactionSchema)
    .min(1, "At least one transaction required")
    .max(
      CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION,
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.CATEGORIZATION} transactions per batch`,
    ),
});

const matchPayeesSchema = z.object({
  transactions: z
    .array(
      z.object({
        csvRowIndex: z.number().int().min(0),
        payee: z.string().min(1),
      }),
    )
    .min(1, "At least one transaction required")
    .max(
      CSV_IMPORT_CONFIG.BATCH_LIMITS.PAYEE_MATCH,
      `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.PAYEE_MATCH} transactions per batch`,
    ),
});

const importTemplateFields = {
  amountFormat: z.object({
    decimalSeparator: z.enum([".", ","]),
    isNegativeExpense: z.boolean(),
    thousandsSeparator: z.enum([".", ",", " ", ""]),
  }),
  columnMapping: z.record(z.string(), z.number()),
  dateFormat: z.enum([
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "DD/MM/YY",
    "MM/DD/YY",
    "DD-MMM-YYYY",
    "DD-MMM-YY",
    "YYYY/MM/DD",
    "unknown",
  ]),
};

const saveTemplateSchema = insertImportTemplateSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend(importTemplateFields);

const updateTemplateSchema = insertImportTemplateSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amountFormat: importTemplateFields.amountFormat.optional(),
  columnMapping: importTemplateFields.columnMapping.optional(),
  dateFormat: importTemplateFields.dateFormat.optional(),
});

const databaseErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
};

type CsvImportOperation =
  | "analyze"
  | "detect_duplicates"
  | "categorize"
  | "match_payees"
  | "get_templates"
  | "save_template"
  | "update_template"
  | "delete_template"
  | "bulk_import";

type CsvImportFailureCategory =
  | "unexpected"
  | "rate_limit"
  | "foreign_key_violation"
  | "duplicate_key";

const logCsvImportFailure = (
  operation: CsvImportOperation,
  category: CsvImportFailureCategory,
) => {
  console.error("[CSV Import API] operation failed", { operation, category });
};

const logCsvImportCount = (operation: CsvImportOperation, count: number) => {
  console.info("[CSV Import API] operation", { operation, count });
};

// ============================================================================
// Routes
// ============================================================================

export const createCsvImportApp = (
  authMiddleware: MiddlewareHandler<AppEnv> = defaultRequireAuth,
) => {
  const requireAuth = authMiddleware;

  return new Hono<AppEnv>()
  .post(
    "/analyze",
    requireAuth,
    zValidator("json", analyzeSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      try {
        const result = await analyze(userId, transactions);

        return c.json({
          data: {
            duplicates: result.duplicates.map((dup) => ({
              csvIndex: dup.csvIndex,
              existingTransaction: {
                id: dup.existingTransaction.id,
                date: dup.existingTransaction.date.toISOString().split("T")[0],
                amount: dup.existingTransaction.amount,
                payee: dup.existingTransaction.payee,
                accountId: dup.existingTransaction.accountId,
              },
              matchType: dup.matchType,
              score: Math.round(dup.score * 100) / 100,
            })),
            duplicateSummary: result.duplicateSummary,
            payeeMatches: result.payeeMatches.map((r) => ({
              csvRowIndex: r.csvRowIndex,
              matches: r.matches.map((m) => ({
                categoryId: m.categoryId,
                transactionTypeId: m.transactionTypeId,
                matchCount: m.matchCount,
                totalMatches: m.totalMatches,
                confidence: Math.round(m.confidence * 100) / 100,
                matchType: m.matchType,
              })),
            })),
            autoResolved: result.autoResolved,
            aiTransactions: result.aiTransactions,
          },
        });
      } catch {
        logCsvImportFailure("analyze", "unexpected");
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .post(
    "/detect-duplicates",
    requireAuth,
    zValidator("json", detectDuplicatesSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      try {
        const result = await detectDuplicates(
          userId,
          transactions.map((transaction, csvRowIndex) => ({
            ...transaction,
            csvRowIndex,
          })),
        );

        return c.json({
          data: {
            duplicates: result.duplicates.map((dup) => ({
              csvIndex: dup.csvIndex,
              existingTransaction: {
                id: dup.existingTransaction.id,
                date: dup.existingTransaction.date.toISOString().split("T")[0],
                amount: dup.existingTransaction.amount,
                payee: dup.existingTransaction.payee,
                accountId: dup.existingTransaction.accountId,
              },
              matchType: dup.matchType,
              score: Math.round(dup.score * 100) / 100, // Round to 2 decimals
            })),
            summary: {
              totalChecked: result.totalChecked,
              exactMatches: result.exactMatches,
              fuzzyMatches: result.fuzzyMatches,
              totalDuplicates: result.duplicates.length,
            },
          },
        });
      } catch {
        logCsvImportFailure("detect_duplicates", "unexpected");
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .post(
    "/categorize",
    requireAuth,
    zValidator("json", categorizeTransactionsSchema, (result, c) => {
      if (!result.success) {
        return c.json(API_ERRORS.INVALID_FOREIGN_KEY, 400);
      }
    }),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      logCsvImportCount("categorize", transactions.length);

      try {
        const results = await categorizeTransactions(
          userId,
          transactions,
        );

        return c.json({
          data: {
            results: results.map((result) => ({
              csvRowIndex: result.csvRowIndex,
              categoryId: result.suggestion.categoryId,
              transactionTypeId: result.suggestion.transactionTypeId,
              confidence: Math.round(result.suggestion.confidence * 100) / 100,
              normalizedPayee: result.suggestion.normalizedPayee,
            })),
          },
        });
      } catch (error) {
        logCsvImportFailure(
          "categorize",
          isRateLimitError(error) ? "rate_limit" : "unexpected",
        );

        // Handle rate limit errors specifically
        if (isRateLimitError(error)) {
          return c.json(
            {
              error: error.message,
              retryAfter: error.retryAfter,
              provider: error.provider,
            },
            429,
          );
        }

        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .post(
    "/match-payees",
    requireAuth,
    zValidator("json", matchPayeesSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      try {
        const result = await matchPayeesToCategories(userId, transactions);

        return c.json({
          data: {
            results: result.results.map((r) => ({
              csvRowIndex: r.csvRowIndex,
              matches: r.matches.map((m) => ({
                categoryId: m.categoryId,
                transactionTypeId: m.transactionTypeId,
                matchCount: m.matchCount,
                totalMatches: m.totalMatches,
                confidence: Math.round(m.confidence * 100) / 100,
                matchType: m.matchType,
              })),
            })),
            summary: result.summary,
          },
        });
      } catch {
        logCsvImportFailure("match_payees", "unexpected");
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  // ============================================================================
  // Template Management
  // ============================================================================
  .get("/templates", requireAuth, async (c) => {
    const userId = c.var.userId;
    const accountId = c.req.query("accountId");

    try {
      const result = await listImportTemplates(userId, accountId);

      if (!result.ok) return c.json(API_ERRORS.NOT_FOUND, 404);
      return c.json({ data: result.data });
    } catch {
      logCsvImportFailure("get_templates", "unexpected");
      return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
    }
  })
  .post(
    "/templates",
    requireAuth,
    zValidator("json", saveTemplateSchema),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      try {
        const result = await createImportTemplate(userId, values);

        if (!result.ok) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        return c.json({ data: result.data });
      } catch (error) {
        logCsvImportFailure(
          "save_template",
          databaseErrorCode(error) === "23505" ? "duplicate_key" : "unexpected",
        );

        if (databaseErrorCode(error) === "23505") {
          return c.json(API_ERRORS.DUPLICATE_TEMPLATE_NAME, 409);
        }

        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .patch(
    "/templates/:id",
    zValidator("param", z.object({ id: z.string().optional() })),
    requireAuth,
    requireId,
    zValidator("json", updateTemplateSchema),
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;
      const values = c.req.valid("json");

      try {
        const result = await updateImportTemplate(userId, id, values);

        if (!result.ok) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        return c.json({ data: result.data });
      } catch (error) {
        logCsvImportFailure(
          "update_template",
          databaseErrorCode(error) === "23505" ? "duplicate_key" : "unexpected",
        );

        if (databaseErrorCode(error) === "23505") {
          return c.json(API_ERRORS.DUPLICATE_TEMPLATE_NAME, 409);
        }

        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .delete(
    "/templates/:id",
    zValidator("param", z.object({ id: z.string().optional() })),
    requireAuth,
    requireId,
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;

      try {
        const result = await deleteImportTemplate(userId, id);
        if (!result.ok) return c.json(API_ERRORS.NOT_FOUND, 404);

        return c.json({ data: result.data });
      } catch {
        logCsvImportFailure("delete_template", "unexpected");
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  // ============================================================================
  // Bulk Import
  // ============================================================================
  .post(
    "/import",
    requireAuth,
    zValidator(
      "json",
      z.object({
        accountId: z.string().min(1),
        transactions: z
          .array(
            z.object({
              categoryId: z.string().nullable(),
              csvRowIndex: z.number().int().min(0),
              date: isoDateSchema,
              amount: z.number().int(), // Milliunits
              notes: z.string().optional(),
              payee: z.string().min(1),
              transactionTypeId: supportedTransactionTypeIdSchema,
            }),
          )
          .min(1)
          .max(
            CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT,
            `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT} transactions per import`,
          ),
      }),
      (result, c) => {
        if (!result.success) {
          return c.json(
            {
              error: `Imports accept between 1 and ${CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT} transactions per request.`,
            },
            400,
          );
        }
      },
    ),
    async (c) => {
      const userId = c.var.userId;
      const { accountId, transactions: txs } = c.req.valid("json");

      try {
        const result = await importTransactions(userId, accountId, txs);

        if (!result.ok) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        logCsvImportCount("bulk_import", txs.length);

        return c.json({ data: result.data });
      } catch {
        logCsvImportFailure("bulk_import", "unexpected");
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  );
};

export default createCsvImportApp();
