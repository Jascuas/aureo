"use client";

import Link from "next/link";

import { getDashboardDataState } from "@/components/dashboard/dashboard-data-state";
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/dashboard/dashboard-state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetRecentTransactions } from "@/features/transactions/api/use-get-recent-transactions";
import { formatCurrency } from "@/lib/utils";

const DASHBOARD_TIME_ZONE = "Europe/Madrid";
const dashboardDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
});

function parseDashboardDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();
    const dateOnlyMatch = normalizedValue.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/,
    );

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day, 12));

      return parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
        ? parsed
        : null;
    }

    if (!normalizedValue) return null;
    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== "number") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDashboardDate(value: unknown): string {
  const date = parseDashboardDate(value);
  if (!date) return "—";

  const parts = dashboardDateFormatter.formatToParts(date);
  const day = parts.find(({ type }) => type === "day")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  const year = parts.find(({ type }) => type === "year")?.value;

  return day && month && year ? `${day} ${month} ${year}` : "—";
}

const RecentTransactionsLoading = () => (
  <Card className="border-border border drop-shadow-sm">
    <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
      <CardTitle className="text-xs">
        <span className="text-crt-accent">▌</span> TRANSACCIONES RECIENTES
      </CardTitle>
      <Skeleton className="h-8 w-20" />
    </CardHeader>
    <CardContent>
      <Table
        className="min-w-[620px]"
        containerProps={{
          role: "region",
          "aria-label": "Transacciones recientes",
          tabIndex: 0,
        }}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="text-3xs uppercase tracking-widest">Beneficiario</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Categoría</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Fecha</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Importe</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Cuenta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="p-2"><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell className="p-2"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="p-2"><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="p-2"><Skeleton className="h-6 w-20" /></TableCell>
              <TableCell className="p-2"><Skeleton className="h-4 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const RecentTransactionsCard = () => {
  const { data, isError, isLoading, refetch } = useGetRecentTransactions();
  const state = getDashboardDataState({
    data,
    isEmpty: (transactions) => transactions.length === 0,
    isError,
    isLoading,
  });

  if (state.kind === "loading") return <RecentTransactionsLoading />;

  return (
    <Card className="border-border border drop-shadow-sm">
      <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-xs">
          <span className="text-crt-accent">▌</span> TRANSACCIONES RECIENTES
        </CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/transactions">VER TODAS</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {state.kind === "error" ? (
          <DashboardErrorState
            title="TRANSACCIONES NO DISPONIBLES"
            description="No se han podido cargar las transacciones recientes. Inténtalo de nuevo."
            onRetry={() => void refetch()}
          />
        ) : state.kind === "empty" ? (
          <DashboardEmptyState message="No hay transacciones en este periodo" />
        ) : (
          <Table
            className="min-w-[620px]"
            containerProps={{
              role: "region",
              "aria-label": "Transacciones recientes",
              tabIndex: 0,
            }}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="text-3xs uppercase tracking-widest">Beneficiario</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Categoría</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Fecha</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Importe</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Cuenta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.data.map((tx) => {
                const formattedDate = formatDashboardDate(tx.date);

                return (
                  <TableRow key={tx.id}>
                    <TableCell className="p-2 text-3xs font-medium max-w-[320px] truncate">
                      {tx.payee}
                    </TableCell>
                    <TableCell className="p-2">
                      {tx.category ? (
                        <Badge variant="secondary" className="text-3xs uppercase tracking-widest px-2 py-0.5">
                          {tx.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-3xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-3xs text-muted-foreground whitespace-nowrap">
                      {formattedDate}
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge
                        variant={tx.amount < 0 ? "destructive" : "primary"}
                        className="px-2 py-0.5 text-3xs font-medium whitespace-nowrap"
                      >
                        {formatCurrency(tx.amount)}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 text-3xs text-muted-foreground max-w-[120px] truncate">
                      {tx.account}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
