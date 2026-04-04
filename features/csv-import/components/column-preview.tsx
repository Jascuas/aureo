"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ColumnPreviewProps = {
  headers: string[];
  sampleRows: string[][];
  maxRows?: number;
};

export const ColumnPreview = ({
  headers,
  sampleRows,
  maxRows = 5,
}: ColumnPreviewProps) => {
  const rowsToShow = sampleRows.slice(0, maxRows);
  
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sample Data</p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              {headers.map((header, idx) => (
                <TableHead key={idx}>{header || `Column ${idx + 1}`}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsToShow.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {rowIdx + 1}
                </TableCell>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx} className="max-w-[200px] truncate">
                    {cell || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing first {rowsToShow.length} rows of {sampleRows.length} total
      </p>
    </div>
  );
};
