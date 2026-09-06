export type DashboardDataState<T> =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "populated"; data: T };

type DashboardQueryState<T> = {
  data?: T;
  isError: boolean;
  isLoading: boolean;
  isEmpty: (data: T) => boolean;
};

export function getDashboardDataState<T>({
  data,
  isError,
  isLoading,
  isEmpty,
}: DashboardQueryState<T>): DashboardDataState<T> {
  if (isError) return { kind: "error" };
  if (isLoading) return { kind: "loading" };
  if (data === undefined || isEmpty(data)) return { kind: "empty" };

  return { data, kind: "populated" };
}
