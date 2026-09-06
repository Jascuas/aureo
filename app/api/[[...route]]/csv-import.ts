import { zValidator } from "@hono/zod-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";

import { insertImportTemplateSchema } from "@/db/schema";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { analyzeCsvImport } from "@/features/csv-import/server/csv-import-analysis-operations";
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



const importTransactionsSchema = z.object({
  accountId: z.string().min(1),
  transactions: z
    .array(
      z.object({
        categoryId: z.string().nullable(),
        csvRowIndex: z.number().int().min(0),
        date: isoDateSchema,
        duplicateResolution: z.literal("import").optional(),
        idempotencyKey: z.string().min(1),
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
        const result = await analyzeCsvImport(userId, transactions);

        return c.json({ data: result });
      } catch (error) {
        if (isRateLimitError(error)) {
          logCsvImportFailure("analyze", "rate_limit");
          return c.json(
            {
              error: error.message,
              provider: error.provider,
              retryAfter: error.retryAfter,
            },
            429,
          );
        }

        logCsvImportFailure("analyze", "unexpected");
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
      importTransactionsSchema,
      (result, c) => {
        if (!result.success) {
          const hasBoundedTransactionsIssue = result.error.issues.some(
            (issue) =>
              issue.path.length === 1 &&
              issue.path[0] === "transactions" &&
              (issue.code === "too_big" || issue.code === "too_small"),
          );

          if (hasBoundedTransactionsIssue) {
            return c.json(
              {
                error: `Imports accept between 1 and ${CSV_IMPORT_CONFIG.BATCH_LIMITS.BULK_IMPORT} transactions per request.`,
              },
              400,
            );
          }

          const hasInvalidTransactionType = result.error.issues.some(
            (issue) => issue.path.at(-1) === "transactionTypeId",
          );

          if (hasInvalidTransactionType) {
            return c.json(API_ERRORS.INVALID_FOREIGN_KEY, 400);
          }

          return c.json(
            API_ERRORS.BAD_REQUEST,
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
