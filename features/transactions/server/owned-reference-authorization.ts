export type OwnedReferenceLookup = {
  findOwnedAccountIds: (userId: string, ids: readonly string[]) => Promise<string[]>;
  findOwnedCategoryIds: (userId: string, ids: readonly string[]) => Promise<string[]>;
  findTransactionTypeIds: (ids: readonly string[]) => Promise<string[]>;
};

export type OwnedReferenceInput = {
  userId: string;
  accountIds?: readonly string[];
  categoryIds?: readonly (string | null | undefined)[];
  transactionTypeIds?: readonly string[];
};

export type OwnedReferenceAuthorization =
  | { ok: true }
  | { ok: false; reason: "not_found" };

const uniqueIds = (ids: readonly (string | null | undefined)[]) =>
  [...new Set(ids.filter((id): id is string => id !== null && id !== undefined))];

const allIdsAreAuthorized = (ids: readonly string[], foundIds: string[]) => {
  const foundIdSet = new Set(foundIds);

  return ids.every((id) => foundIdSet.has(id));
};

export const authorizeOwnedReferences = async (
  lookup: OwnedReferenceLookup,
  input: OwnedReferenceInput,
): Promise<OwnedReferenceAuthorization> => {
  const accountIds = uniqueIds(input.accountIds ?? []);
  const categoryIds = uniqueIds(input.categoryIds ?? []);
  const transactionTypeIds = uniqueIds(input.transactionTypeIds ?? []);

  const [ownedAccountIds, ownedCategoryIds, existingTransactionTypeIds] =
    await Promise.all([
      accountIds.length
        ? lookup.findOwnedAccountIds(input.userId, accountIds)
        : Promise.resolve([]),
      categoryIds.length
        ? lookup.findOwnedCategoryIds(input.userId, categoryIds)
        : Promise.resolve([]),
      transactionTypeIds.length
        ? lookup.findTransactionTypeIds(transactionTypeIds)
        : Promise.resolve([]),
    ]);

  if (
    !allIdsAreAuthorized(accountIds, ownedAccountIds) ||
    !allIdsAreAuthorized(categoryIds, ownedCategoryIds) ||
    !allIdsAreAuthorized(transactionTypeIds, existingTransactionTypeIds)
  ) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true };
};
