import { sql } from "drizzle-orm";

import { SUPPORTED_TRANSACTION_TYPE_IDS } from "@/features/transaction-types/lib/transaction-types";

import { transactions } from "./schema";

export const incomeAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[0]}
      THEN ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const expensesAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[1]}
      THEN ABS(${transactions.amount})
      WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[2]}
      THEN -ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const transactionBalanceDeltaSql = sql`
  SUM(
    CASE
      WHEN ${transactions.transactionTypeId} IN (${SUPPORTED_TRANSACTION_TYPE_IDS[0]}, ${SUPPORTED_TRANSACTION_TYPE_IDS[2]})
      THEN ABS(${transactions.amount})
      WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[1]}
      THEN -ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const categoryAmountSql = sql`
  CASE
    WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[0]} THEN ABS(${transactions.amount})
    WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[1]} THEN ABS(${transactions.amount})
    WHEN ${transactions.transactionTypeId} = ${SUPPORTED_TRANSACTION_TYPE_IDS[2]} THEN -ABS(${transactions.amount})
    ELSE 0
  END
`;
