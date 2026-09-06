import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts } from "@/db/schema";
import type { AccountFormValues } from "@/features/accounts/lib/account-form-schema";

export type AccountResponse = {
  id: string;
  name: string;
};

export type AccountDeleteResponse = {
  id: string;
};

export type AccountWriteResult =
  | { ok: true; data: AccountResponse }
  | { ok: false; reason: "not_found" };

export type AccountDeleteResult =
  | { ok: true; data: AccountDeleteResponse }
  | { ok: false; reason: "not_found" };

export type AccountOperationDependencies = {
  list: (userId: string) => Promise<AccountResponse[]>;
  get: (userId: string, id: string) => Promise<AccountResponse | undefined>;
  create: (userId: string, values: AccountFormValues) => Promise<AccountResponse>;
  deleteMany: (
    userId: string,
    ids: readonly string[],
  ) => Promise<AccountDeleteResponse[]>;
  update: (
    userId: string,
    id: string,
    values: AccountFormValues,
  ) => Promise<AccountResponse | undefined>;
  delete: (
    userId: string,
    id: string,
  ) => Promise<AccountDeleteResponse | undefined>;
};

const accountProjection = {
  id: accounts.id,
  name: accounts.name,
};

const accountIdProjection = {
  id: accounts.id,
};

const accountOperationDependencies: AccountOperationDependencies = {
  list: (userId) =>
    db
      .select(accountProjection)
      .from(accounts)
      .where(eq(accounts.userId, userId)),
  get: async (userId, id) => {
    const [account] = await db
      .select(accountProjection)
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));

    return account;
  },
  create: async (userId, values) => {
    const [account] = await db
      .insert(accounts)
      .values({
        id: createId(),
        userId,
        balance: 0,
        ...values,
      })
      .returning(accountProjection);

    if (!account) {
      throw new Error("Account insert returned no row");
    }

    return account;
  },
  deleteMany: (userId, ids) =>
    db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), inArray(accounts.id, [...ids])))
      .returning(accountIdProjection),
  update: async (userId, id, values) => {
    const [account] = await db
      .update(accounts)
      .set(values)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning(accountProjection);

    return account;
  },
  delete: async (userId, id) => {
    const [account] = await db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning(accountIdProjection);

    return account;
  },
};

export const createAccountOperations = (
  dependencies: AccountOperationDependencies = accountOperationDependencies,
) => ({
  listAccounts: (userId: string) => dependencies.list(userId),
  getAccount: (userId: string, id: string) => dependencies.get(userId, id),
  createAccount: async (
    userId: string,
    values: AccountFormValues,
  ): Promise<AccountResponse> => dependencies.create(userId, values),
  deleteAccounts: async (
    userId: string,
    ids: readonly string[],
  ): Promise<AccountDeleteResponse[]> => dependencies.deleteMany(userId, ids),
  updateAccount: async (
    userId: string,
    id: string,
    values: AccountFormValues,
  ): Promise<AccountWriteResult> => {
    const data = await dependencies.update(userId, id, values);

    return data ? { ok: true, data } : { ok: false, reason: "not_found" };
  },
  deleteAccount: async (
    userId: string,
    id: string,
  ): Promise<AccountDeleteResult> => {
    const data = await dependencies.delete(userId, id);

    return data ? { ok: true, data } : { ok: false, reason: "not_found" };
  },
});

const accountOperations = createAccountOperations();

export const listAccounts = accountOperations.listAccounts;
export const getAccount = accountOperations.getAccount;
export const createAccount = accountOperations.createAccount;
export const deleteAccounts = accountOperations.deleteAccounts;
export const updateAccount = accountOperations.updateAccount;
export const deleteAccount = accountOperations.deleteAccount;