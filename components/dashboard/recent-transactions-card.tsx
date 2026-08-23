"use client";

import Link from "next/link";

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
import { formatCurrency, formatDashboardDate } from "@/lib/utils";

const RecentTransactionsLoading = () => (
  <Card className="border-border border drop-shadow-sm">
    <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
      <CardTitle className="text-xs">
        <span className="text-crt-accent">▌</span> RECENT TRANSACTIONS
      </CardTitle>
      <Skeleton className="h-8 w-20" />
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-3xs uppercase tracking-widest">Payee</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Category</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Date</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Amount</TableHead>
            <TableHead className="text-3xs uppercase tracking-widest">Account</TableHead>
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
  const { data, isLoading } = useGetRecentTransactions();

  if (isLoading) return <RecentTransactionsLoading />;

  return (
    <Card className="border-border border drop-shadow-sm">
      <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-xs">
          <span className="text-crt-accent">▌</span> RECENT TRANSACTIONS
        </CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/transactions">VIEW ALL</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-xs uppercase tracking-widest">
            No transactions found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-3xs uppercase tracking-widest">Payee</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Amount</TableHead>
                <TableHead className="text-3xs uppercase tracking-widest">Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tx) => {
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
