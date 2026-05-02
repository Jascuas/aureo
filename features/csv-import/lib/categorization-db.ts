import { db } from "@/db/drizzle";
import {
  accounts,
  categories,
  transactions,
  transactionTypes,
} from "@/db/schema";
import { normalizePayeeName } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";

export async function detectTransactionType(amount: number): Promise<{
  id: string;
  name: string;
}> {
  const typeName = amount < 0 ? "expense" : "income";

  const [type] = await db
    .select({
      id: transactionTypes.id,
      name: transactionTypes.name,
    })
    .from(transactionTypes)
    .where(sql`LOWER(${transactionTypes.name}) = ${typeName}`)
    .limit(1);

  if (!type) {
    throw new Error(`Transaction type '${typeName}' not found in database`);
  }

  return type;
}

export async function findSimilarTransactions(
  userId: string,
  payee: string,
  limit: number = 10,
): Promise<
  Array<{
    payee: string;
    description: string | null;
    categoryId: string | null;
    categoryName: string | null;
  }>
> {
  const normalizedPayee = normalizePayeeName(payee);
  const searchTerm = normalizedPayee.split(" ")[0];

  const results = await db
    .select({
      payee: transactions.payee,
      description: transactions.notes,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      sql`${accounts.userId} = ${userId}
          AND ${transactions.payee} ILIKE ${`%${searchTerm}%`}
          AND ${transactions.categoryId} IS NOT NULL`,
    )
    .limit(limit);

  return results;
}

export async function getUserCategories(userId: string): Promise<
  Array<{
    id: string;
    name: string;
  }>
> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .where(eq(categories.userId, userId));
}
