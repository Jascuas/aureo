import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import {
  importTemplates,
  insertImportTemplateSchema,
} from "@/db/schema";
import { analyze } from "@/features/csv-import/lib/analyzer";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { detectDuplicates } from "@/features/csv-import/lib/duplicate-matcher";
import { matchPayeesToCategories } from "@/features/csv-import/lib/payee-category-matcher";
import { categorizeTransactions } from "@/features/csv-import/lib/transaction-categorizer";
import {
  createImportTemplate,
  importTransactions,
  updateImportTemplate,
} from "@/features/csv-import/server/csv-import-write-operations";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import { isRateLimitError } from "@/lib/errors";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

// ============================================================================
// Validation Schemas
// ============================================================================

const transactionInputSchema = z.object({
  date: z.string().transform((val) => new Date(val)),
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
      transactionTypeId: z.string(),
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

const saveTemplateSchema = insertImportTemplateSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

const updateTemplateSchema = insertImportTemplateSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

type DatabaseError = {
  cause?: unknown;
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
  stack?: string;
};

const asDatabaseError = (error: unknown): DatabaseError =>
  typeof error === "object" && error !== null
    ? (error as DatabaseError)
    : {};

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

const app = new Hono<AppEnv>()
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
    zValidator("json", categorizeTransactionsSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      logCsvImportCount("categorize", transactions.length);

      try {
        const results = await categorizeTransactions(
          userId,
          transactions as Parameters<typeof categorizeTransactions>[1],
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
      const whereConditions = accountId
        ? and(
            eq(importTemplates.userId, userId),
            eq(importTemplates.accountId, accountId),
          )
        : eq(importTemplates.userId, userId);

      const templates = await db
        .select({
          id: importTemplates.id,
          accountId: importTemplates.accountId,
          name: importTemplates.name,
          columnMapping: importTemplates.columnMapping,
          dateFormat: importTemplates.dateFormat,
          amountFormat: importTemplates.amountFormat,
          createdAt: importTemplates.createdAt,
          updatedAt: importTemplates.updatedAt,
        })
        .from(importTemplates)
        .where(whereConditions)
        .orderBy(importTemplates.updatedAt);

      return c.json({ data: templates });
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
        const databaseError = asDatabaseError(error);
        logCsvImportFailure(
          "save_template",
          databaseError.code === "23505" ? "duplicate_key" : "unexpected",
        );

        if (databaseError.code === "23505") {
          if (
            databaseError.constraint === "import_templates_user_account_unique"
          ) {
            return c.json(
              {
                error:
                  "A template already exists for this account. Only one template per account is allowed.",
              },
              409,
            );
          }
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
        const databaseError = asDatabaseError(error);
        logCsvImportFailure(
          "update_template",
          databaseError.code === "23505" ? "duplicate_key" : "unexpected",
        );

        if (databaseError.code === "23505") {
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
        const [template] = await db
          .delete(importTemplates)
          .where(
            and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)),
          )
          .returning({ id: importTemplates.id });

        if (!template) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        return c.json({ data: template });
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
              date: z.string().transform((val) => new Date(val)),
              amount: z.number().int(), // Milliunits
              payee: z.string().min(1),
              notes: z.string().optional(),
              categoryId: z.string().nullable(),
              transactionTypeId: z.string().min(1),
            }),
          )
          .min(1)
          .max(
            CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT,
            `Maximum ${CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT} transactions per import`,
          ),
      }),
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
      } catch (error) {
        // Drizzle/Neon wraps PostgreSQL errors - extract the real error
        const databaseError = asDatabaseError(error);
        const pgError = asDatabaseError(databaseError.cause ?? error);
        const errorCode = pgError.code ?? databaseError.code;
        const errorMessage = databaseError.message ?? "";
        const errorDetail = pgError.detail ?? databaseError.detail;
        const errorConstraint = pgError.constraint ?? databaseError.constraint;

        const failureCategory =
          errorCode === "23503" ||
          errorMessage.includes("violates foreign key constraint") ||
          errorMessage.includes("foreign key")
            ? "foreign_key_violation"
            : errorCode === "23505" ||
                errorMessage.includes("duplicate key") ||
                errorMessage.includes("already exists")
              ? "duplicate_key"
              : "unexpected";

        logCsvImportFailure("bulk_import", failureCategory);

        // Foreign key constraint violation (invalid category/transaction type)
        if (
          errorCode === "23503" ||
          errorMessage.includes("violates foreign key constraint") ||
          errorMessage.includes("foreign key")
        ) {
          // Extract which constraint failed
          let fieldName = "category or transaction type";
          if (errorConstraint?.includes("category")) fieldName = "category";
          else if (errorConstraint?.includes("transaction_type"))
            fieldName = "transaction type";
          else if (errorConstraint?.includes("account")) fieldName = "account";

          return c.json(
            {
              error: `Invalid ${fieldName} ID. Please verify the ID exists in the database.`,
              detail: errorDetail || errorMessage,
              constraint: errorConstraint,
            },
            400,
          );
        }

        // Duplicate key violation
        if (
          errorCode === "23505" ||
          errorMessage.includes("duplicate key") ||
          errorMessage.includes("already exists")
        ) {
          return c.json(
            {
              error:
                "One or more transactions already exist (duplicates detected).",
              detail: errorDetail || errorMessage,
            },
            409,
          );
        }

        // Generic error with full details for debugging
        return c.json(
          {
            error: "Failed to import transactions",
            detail: errorMessage,
            code: errorCode,
          },
          500,
        );
      }
    },
  );

export default app;
