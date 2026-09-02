const accountsKey = ["accounts"] as const;

export const accountQueryKeys = {
  all: accountsKey,
  detail: (id?: string) => [...accountsKey, "detail", { id }] as const,
};
