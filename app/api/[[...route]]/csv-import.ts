import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import {
  accounts,
  importTemplates,
  insertImportTemplateSchema,
  transactions,
} from "@/db/schema";
import { CSV_IMPORT_CONFIG } from "@/features/csv-import/lib/config";
import { detectDuplicates } from "@/features/csv-import/lib/duplicate-matcher";
import { categorizeTransactions } from "@/features/csv-import/lib/transaction-categorizer";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
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

// ============================================================================
// Routes
// ============================================================================

const app = new Hono<AppEnv>()
  .post(
    "/detect-duplicates",
    clerkMiddleware(),
    requireAuth,
    zValidator("json", detectDuplicatesSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      try {
        const result = await detectDuplicates(userId, transactions);

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
      } catch (error) {
        console.error("Duplicate detection error:", error);
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .post(
    "/categorize",
    clerkMiddleware(),
    requireAuth,
    zValidator("json", categorizeTransactionsSchema),
    async (c) => {
      const userId = c.var.userId;
      const { transactions } = c.req.valid("json");

      console.log("[CSV Import API] Categorize request:", {
        userId,
        transactionCount: transactions.length,
        firstTransaction: transactions[0],
      });

      try {
        const results = await categorizeTransactions(userId, transactions);

        return c.json({
          data: {
            results: results.map((result) => ({
              csvRowIndex: result.csvRowIndex,
              categoryId: result.suggestion.categoryId,
              categoryName: result.suggestion.categoryName,
              transactionTypeId: result.suggestion.transactionTypeId,
              transactionTypeName: result.suggestion.transactionTypeName,
              confidence: Math.round(result.suggestion.confidence * 100) / 100,
              reasoning: result.suggestion.reasoning,
              normalizedPayee: result.suggestion.normalizedPayee,
              requiresManualReview: result.suggestion.confidence < 0.7,
            })),
            summary: {
              totalProcessed: results.length,
              highConfidence: results.filter(
                (r) => r.suggestion.confidence >= 0.7,
              ).length,
              requiresReview: results.filter(
                (r) => r.suggestion.confidence < 0.7,
              ).length,
            },
          },
        });
      } catch (error) {
        console.error("Categorization error:", error);
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  // ============================================================================
  // Template Management
  // ============================================================================
  .get("/templates", clerkMiddleware(), requireAuth, async (c) => {
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
    } catch (error) {
      console.error("Get templates error:", error);
      return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
    }
  })
  .post(
    "/templates",
    clerkMiddleware(),
    requireAuth,
    zValidator("json", saveTemplateSchema),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      try {
        const [template] = await db
          .insert(importTemplates)
          .values({
            id: createId(),
            userId,
            ...values,
          })
          .returning();

        return c.json({ data: template });
      } catch (error: any) {
        console.error("Save template error:", error);

        if (error.code === "23505") {
          if (error.constraint === "import_templates_user_account_unique") {
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
    clerkMiddleware(),
    requireAuth,
    requireId,
    zValidator("json", updateTemplateSchema),
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;
      const values = c.req.valid("json");

      try {
        const [template] = await db
          .update(importTemplates)
          .set({
            ...values,
            updatedAt: new Date(),
          })
          .where(
            and(eq(importTemplates.id, id), eq(importTemplates.userId, userId)),
          )
          .returning();

        if (!template) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        return c.json({ data: template });
      } catch (error: any) {
        console.error("Update template error:", error);

        if (error.code === "23505") {
          return c.json(API_ERRORS.DUPLICATE_TEMPLATE_NAME, 409);
        }

        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  .delete(
    "/templates/:id",
    zValidator("param", z.object({ id: z.string().optional() })),
    clerkMiddleware(),
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
          .returning();

        if (!template) {
          return c.json(API_ERRORS.NOT_FOUND, 404);
        }

        return c.json({ data: template });
      } catch (error) {
        console.error("Delete template error:", error);
        return c.json(API_ERRORS.INTERNAL_SERVER_ERROR, 500);
      }
    },
  )
  // ============================================================================
  // Bulk Import
  // ============================================================================
  .post(
    "/import",
    clerkMiddleware(),
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
        // Validate account belongs to user
        const [account] = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
          .limit(1);

        if (!account) {
          return c.json(API_ERRORS.INVALID_ACCOUNT, 404);
        }

        // Check for duplicates before inserting
        const duplicateCheckResult = await detectDuplicates(
          userId,
          txs.map((tx) => ({
            date: tx.date,
            amount: tx.amount,
            payee: tx.payee,
          })),
        );

        if (duplicateCheckResult.duplicates.length > 0) {
          console.log(
            `⚠️  Found ${duplicateCheckResult.duplicates.length} duplicates`,
          );
          return c.json(
            {
              error: "Duplicate transactions detected",
              duplicates: duplicateCheckResult.duplicates.map((dup) => ({
                csvIndex: dup.csvIndex,
                matchType: dup.matchType,
                existingTransaction: {
                  id: dup.existingTransaction.id,
                  date: dup.existingTransaction.date
                    .toISOString()
                    .split("T")[0],
                  amount: dup.existingTransaction.amount,
                  payee: dup.existingTransaction.payee,
                },
              })),
            },
            409,
          );
        }

        const transactionsToInsert = txs.map((tx) => ({
          id: createId(),
          accountId,
          date: tx.date,
          amount: tx.amount,
          payee: tx.payee,
          notes: tx.notes || null,
          categoryId: tx.categoryId,
          transactionTypeId: tx.transactionTypeId,
        }));

        console.log("=".repeat(80));
        console.log("🔍 BULK IMPORT");
        console.log("=".repeat(80));
        console.log(`Account ID: ${accountId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Total transactions: ${transactionsToInsert.length}`);
        console.log("\n📋 Transactions to insert:\n");
        transactionsToInsert.forEach((tx, index) => {
          console.log(`\n--- Transaction ${index + 1} ---`);
          console.log(`ID: ${tx.id}`);
          console.log(`Date: ${tx.date.toISOString()}`);
          console.log(
            `Amount: ${tx.amount} milliunits (${tx.amount / 1000} EUR)`,
          );
          console.log(`Payee: ${tx.payee}`);
          console.log(`Notes: ${tx.notes || "(none)"}`);
          console.log(`Category ID: ${tx.categoryId || "(none)"}`);
          console.log(`Transaction Type ID: ${tx.transactionTypeId}`);
        });
        console.log("\n" + "=".repeat(80));
        console.log("✅ INSERTING TRANSACTIONS TO DATABASE");
        console.log("=".repeat(80) + "\n");

        const inserted = await db
          .insert(transactions)
          .values(transactionsToInsert)
          .returning({ id: transactions.id });

        return c.json({
          data: {
            imported: inserted.length,
            skipped: 0,
            errors: [],
          },
        });
      } catch (error: any) {
        console.error("Bulk import error:", error);

        // Drizzle/Neon wraps PostgreSQL errors - extract the real error
        const pgError = error.cause || error;
        const errorCode = pgError.code || error.code;
        const errorMessage = error.message || "";
        const errorDetail = pgError.detail || error.detail;
        const errorConstraint = pgError.constraint || error.constraint;

        console.error("Error details:", {
          code: errorCode,
          message: errorMessage,
          constraint: errorConstraint,
          detail: errorDetail,
          stack: error.stack?.split("\n").slice(0, 3),
        });

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
