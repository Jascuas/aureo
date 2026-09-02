const categoriesKey = ["categories"] as const;

export const categoryQueryKeys = {
  all: categoriesKey,
  detail: (id?: string) => [...categoriesKey, "detail", { id }] as const,
};
