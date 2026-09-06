# Balance verification operator check

## Purpose

This is an operator-only, read-only diagnostic for a single user's account balances. It is not an Aureo HTTP endpoint and must never be exposed through the product API.

The check uses the accounts-domain balance-verification operation. Its persistence query is scoped to the supplied user and has a hard maximum of 100 accounts; it reads at most one additional row to report whether the result was truncated.

## Invocation

A human operator with authorized database access supplies the target user through the process environment. Do not put user identifiers in source, tickets, logs, or shell scripts.

```bash
OPERATOR_USER_ID='<trusted-user-id>' pnpm operator:verify-balances
```

To request a lower cap, set `BALANCE_VERIFICATION_MAXIMUM_ACCOUNTS` to a positive integer. Values above 100 are capped at 100.

```bash
OPERATOR_USER_ID='<trusted-user-id>' BALANCE_VERIFICATION_MAXIMUM_ACCOUNTS=25 pnpm operator:verify-balances
```

## Output and exit status

The command prints only JSON aggregate status:

- `accountsInspected`
- `accountsWithDiscrepancies`
- `isTruncated`

It never prints tenant identifiers, account identifiers or names, balances, transaction records, or financial amounts.

- Exit `0`: no discrepancy and the result was not truncated.
- Exit `2`: a discrepancy was found or the account cap prevented a complete result.
- Exit `1`: configuration or infrastructure failure.

A non-zero result requires human investigation through approved operational procedures. This tool does not change balances, transactions, trigger semantics, or database schema.
