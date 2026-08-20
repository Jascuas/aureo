"use client";

import { getAccountSummaryMetrics } from "@/components/dashboard/accounts-card-lib";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAccountSummary } from "@/features/summary/api/use-get-account-summary";
import { formatCurrency } from "@/lib/utils";

/* ─── palette ────────────────────────────────────────────────────────── */

const PIE_COLORS = [
  "var(--crt-pie-1)",
  "var(--crt-pie-2)",
  "var(--crt-pie-3)",
  "var(--crt-pie-4)",
  "var(--crt-pie-5)",
  "var(--crt-pie-6)",
  "var(--crt-pie-7)",
  "var(--crt-pie-8)",
  "var(--crt-pie-9)",
  "var(--crt-pie-10)",
  "var(--crt-pie-11)",
  "var(--crt-pie-12)",
  "var(--crt-pie-13)",
  "var(--crt-pie-14)",
  "var(--crt-pie-15)",
];

function paletteColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length];
}

function fillColor(c: string): string {
  return `color-mix(in oklch, ${c} 8%, transparent)`;
}

function edgeColor(c: string): string {
  return `color-mix(in oklch, ${c} 40%, transparent)`;
}

function fillPct(absValue: number, maxAbs: number): number {
  if (maxAbs === 0) return 5;
  return Math.max(5, Math.min(95, (absValue / maxAbs) * 100));
}

function signColor(value: number): string {
  return value >= 0 ? "var(--crt-pos)" : "var(--crt-amber)";
}

/* ─── loading skeleton ───────────────────────────────────────────────── */

const AccountsCardLoading = () => (
  <Card className="border-border h-full border drop-shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3 lg:px-5 lg:pt-5">
      <span className="text-crt-muted text-2xs font-bold tracking-[0.1em] uppercase">
        <span className="text-crt-accent">▌</span> ACCOUNTS
      </span>
    </CardHeader>
    <CardContent className="px-4 pb-4 lg:px-5 lg:pb-5">
      <div className="acct-list-a">
        {[65, 100, 40].map((_, i) => (
          <Skeleton key={i} className="va-row-a" />
        ))}
      </div>
      <div className="acct-foot-a mt-3">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardContent>
  </Card>
);

/* ─── main component ─────────────────────────────────────────────────── */

export const AccountsCard = () => {
  const { data, isLoading } = useGetAccountSummary();

  if (isLoading) return <AccountsCardLoading />;

  const { rows, maxAbs, totalAbs, total } = getAccountSummaryMetrics(
    data ?? [],
  );

  return (
    <Card className="border-border h-full border drop-shadow-sm">
      {/* ── header ── */}
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3 lg:px-5 lg:pt-5">
        <span className="text-crt-muted text-2xs font-bold tracking-[0.1em] uppercase">
          <span className="text-crt-accent">▌</span> ACCOUNTS
        </span>
      </CardHeader>

      {/* ── body ── */}
      <CardContent className="px-4 pb-4 lg:px-5 lg:pb-5">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-2xs py-8 text-center tracking-widest uppercase">
            No accounts
          </p>
        ) : (
          <div className="acct-list-a">
            {rows.map((acct, i) => {
              const c = paletteColor(i);
              const pct = fillPct(Math.abs(acct.value), maxAbs);
              const sharePct =
                totalAbs > 0
                  ? ((Math.abs(acct.value) / totalAbs) * 100).toFixed(1)
                  : "0.0";

              return (
                <div
                  key={acct.id}
                  className="va-row-a"
                  style={
                    {
                      "--w": `${pct}%`,
                      "--fill": fillColor(c),
                      "--c-edge": edgeColor(c),
                      "--c": c,
                    } as React.CSSProperties
                  }
                >
                  <div className="va-label-a">
                    <span className="va-name">{acct.name}</span>
                    <div className="va-right">
                      <span className="va-balance" style={{ color: c }}>
                        {formatCurrency(acct.value)}
                      </span>
                      <span className="va-pct">{sharePct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── footer ── */}
        <div className="acct-foot-a">
          <span className="text-crt-muted text-2xs tracking-[0.1em] uppercase">
            TOTAL
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: signColor(total) }}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
