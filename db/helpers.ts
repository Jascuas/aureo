import { sql } from "drizzle-orm";

import {
  getStoredTransactionTypeIdCandidates,
  SUPPORTED_TRANSACTION_TYPE_IDS,
  type SupportedTransactionTypeId,
} from "@/features/transaction-types/lib/transaction-types";

import { transactions } from "./schema";

const transactionTypeIdMatches = (id: SupportedTransactionTypeId) =>
  sql`${transactions.transactionTypeId} IN (${sql.join(
    getStoredTransactionTypeIdCandidates(id).map((candidate) => sql`${candidate}`),
    sql`, `,
  )})`;

export const incomeAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[0])}
      THEN ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const expensesAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[1])}
      THEN ABS(${transactions.amount})
      WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[2])}
      THEN -ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const transactionBalanceDeltaCaseSql = sql`
  CASE
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[0])}
      OR ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[2])}
    THEN ABS(${transactions.amount})
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[1])}
    THEN -ABS(${transactions.amount})
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[3])}
    THEN ${transactions.amount}
    ELSE 0
  END
`;

export const transactionBalanceDeltaSql = sql`
  SUM(${transactionBalanceDeltaCaseSql})
`.mapWith(Number);

export const categoryAmountSql = sql`
  CASE
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[0])} THEN ABS(${transactions.amount})
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[1])} THEN ABS(${transactions.amount})
    WHEN ${transactionTypeIdMatches(SUPPORTED_TRANSACTION_TYPE_IDS[2])} THEN -ABS(${transactions.amount})
    ELSE 0
  END
`;
