import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories, transactionTypes } from "@/db/schema";

import {
  authorizeOwnedReferences,
  type OwnedReferenceAuthorization,
  type OwnedReferenceInput,
  type OwnedReferenceLookup,
} from "./owned-reference-authorization";

const ownedReferenceLookup: OwnedReferenceLookup = {
  findOwnedAccountIds: async (userId, ids) => {
    const rows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));

    return rows.map((row) => row.id);
  },
  findOwnedCategoryIds: async (userId, ids) => {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));

    return rows.map((row) => row.id);
  },
  findTransactionTypeIds: async (ids) => {
    const rows = await db
      .select({ id: transactionTypes.id })
      .from(transactionTypes)
      .where(inArray(transactionTypes.id, ids));

    return rows.map((row) => row.id);
  },
};

export const ensureOwnedReferences = (
  input: OwnedReferenceInput,
): Promise<OwnedReferenceAuthorization> =>
  authorizeOwnedReferences(ownedReferenceLookup, input);
