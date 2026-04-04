import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { detectDuplicates } from "@/features/csv-import/lib/duplicate-matcher";
import { categorizeTransactions } from "@/features/csv-import/lib/transaction-categorizer";

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
    .max(100, "Maximum 100 transactions per batch"),
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
    .max(50, "Maximum 50 transactions per batch"),
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
        return c.json(
          {
            error: API_ERRORS.INTERNAL_ERROR,
          },
          500,
        );
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
              highConfidence: results.filter((r) => r.suggestion.confidence >= 0.7).length,
              requiresReview: results.filter((r) => r.suggestion.confidence < 0.7).length,
            },
          },
        });
      } catch (error) {
        console.error("Categorization error:", error);
        return c.json(
          {
            error: API_ERRORS.INTERNAL_ERROR,
          },
          500,
        );
      }
    },
  );

export default app;
