import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories, transactionTypes } from "@/db/schema";
import {
  canonicalizeTransactionTypeId,
  getStoredTransactionTypeIdCandidates,
  type TransactionTypeInputId,
} from "@/features/transaction-types/lib/transaction-types";

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

// Prefer canonical IDs once the forward reconciliation has inserted them, but
// keep resolving the audited legacy IDs until that cutover has completed.
export const resolveStoredTransactionTypeIds = async (
  ids: readonly TransactionTypeInputId[],
): Promise<Map<TransactionTypeInputId, string>> => {
  const candidates = [...new Set(ids.flatMap(getStoredTransactionTypeIdCandidates))];
  const rows = await db
    .select({ id: transactionTypes.id })
    .from(transactionTypes)
    .where(inArray(transactionTypes.id, candidates));
  const available = new Set(rows.map((row) => row.id));

  return new Map(
    ids.flatMap((id) => {
      const canonicalId = canonicalizeTransactionTypeId(id);
      const storedId = available.has(canonicalId)
        ? canonicalId
        : getStoredTransactionTypeIdCandidates(id).find((candidate) => available.has(candidate));

      return storedId ? [[id, storedId] as const] : [];
    }),
  );
};
