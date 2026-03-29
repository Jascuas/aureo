import { sql } from "drizzle-orm";

import { transactions, transactionTypes } from "./schema";

export const incomeAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypes.name} = 'Income'
      THEN ${transactions.amount}
      ELSE 0
    END
  )
`.mapWith(Number);

export const expensesAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypes.name} = 'Expense'
      THEN ABS(${transactions.amount})      
      WHEN ${transactionTypes.name} = 'Refund'
      THEN -ABS(${transactions.amount})      
      ELSE 0
    END
  )
`.mapWith(Number);

export const incomeWithRefundAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypes.name} = 'Income'
      THEN ${transactions.amount}
      WHEN ${transactionTypes.name} = 'Refund'
      THEN ${transactions.amount}
      ELSE 0
    END
  )
`.mapWith(Number);

export const expenseOnlyAmountSql = sql`
  SUM(
    CASE
      WHEN ${transactionTypes.name} = 'Expense'
      THEN ABS(${transactions.amount})
      ELSE 0
    END
  )
`.mapWith(Number);

export const categoryAmountSql = sql`
  CASE
    WHEN ${transactionTypes.name} = 'Expense' THEN ABS(${transactions.amount})
    WHEN ${transactionTypes.name} = 'Refund'  THEN -ABS(${transactions.amount})
    ELSE ABS(${transactions.amount})
  END
`;
