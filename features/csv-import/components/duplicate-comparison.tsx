"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type DuplicateComparisonProps = {
  csvRow: {
    date: Date;
    payee: string;
    amount: number;
    category?: string;
  };
  existingTransaction: {
    date: Date;
    payee: string;
    amount: number;
  };
  matchType: 'exact' | 'fuzzy';
  score: number;
};

export const DuplicateComparison = ({
  csvRow,
  existingTransaction,
  matchType,
  score,
}: DuplicateComparisonProps) => {
  const scorePercent = Math.round(score * 100);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const getDifferences = () => {
    const diffs: string[] = [];
    
    if (csvRow.date.getTime() !== existingTransaction.date.getTime()) {
      diffs.push('date');
    }
    if (csvRow.payee !== existingTransaction.payee) {
      diffs.push('payee');
    }
    if (csvRow.amount !== existingTransaction.amount) {
      diffs.push('amount');
    }
    
    return diffs;
  };
  
  const differences = getDifferences();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={matchType === 'exact' ? 'destructive' : 'secondary'}>
            {matchType === 'exact' ? 'Exact Match' : 'Fuzzy Match'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {scorePercent}% similarity
          </span>
        </div>
        
        {differences.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Differences: {differences.join(', ')}
          </span>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-amber-600">CSV Row (New)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(csvRow.date)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Payee</p>
              <p className="font-medium">{csvRow.payee}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCurrency(csvRow.amount)}</p>
            </div>
            {csvRow.category && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{csvRow.category}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-center md:hidden">
          <ArrowRight className="size-6 text-muted-foreground" />
        </div>
        
        <Card className="border-2 border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-blue-600">Existing Transaction</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(existingTransaction.date)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Payee</p>
              <p className="font-medium">{existingTransaction.payee}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCurrency(existingTransaction.amount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
