// hooks/useGroupedData.ts
import { useMemo } from "react";

import {
  Balance,
  GroupType,
  Transaction,
  TransactionOrBalance,
} from "@/lib/types";
import { balReducers, groupByPeriod, txReducers } from "@/lib/utils";

type Dataset = Transaction[] | Balance[];

export function useGroupedData(
  raw: TransactionOrBalance,
  groupBy: GroupType,
): Dataset {
  return useMemo(() => {
    if (!raw.length) return raw;

    if ("income" in raw[0]) {
      return groupByPeriod(
        raw as Transaction[],
        groupBy,
        txReducers,
      ) as Transaction[];
    }

    return groupByPeriod(raw as Balance[], groupBy, balReducers) as Balance[];
  }, [raw, groupBy]);
}
