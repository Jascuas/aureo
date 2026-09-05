"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, isValid } from "date-fns";
import { InferResponseType } from "hono";

import { AccountColumn } from "@/app/(dashboard)/transactions/account-column";
import { Actions } from "@/app/(dashboard)/transactions/actions";
import { CategoryColumn } from "@/app/(dashboard)/transactions/category-column";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/lib/hono";
import { formatCurrency } from "@/lib/utils";

export type ResponseType = InferResponseType<
  typeof client.api.transactions.$get,
  200
>["data"][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    enableSorting: false,
    header: "Date",
    cell: ({ row }) => {
      const dateValue = new Date(row.getValue("date"));

      if (!isValid(dateValue)) {
        return <span>Invalid date</span>;
      }

      return <span>{format(dateValue, "dd MMMM, yyyy")}</span>;
    },
  },
  {
    accessorKey: "category",
    enableSorting: false,
    header: "Category",
    cell: ({ row }) => {
      return (
        <CategoryColumn
          id={row.original.id}
          category={row.original.category}
          categoryId={row.original.categoryId}
        />
      );
    },
  },
  {
    accessorKey: "payee",
    enableSorting: false,
    header: "Payee",
  },
  {
    accessorKey: "amount",
    enableSorting: false,
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));

      return (
        <Badge
          variant={amount < 0 ? "destructive" : "primary"}
          className="px-3 py-2 text-xs font-medium"
        >
          {formatCurrency(amount)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "account",
    enableSorting: false,
    header: "Account",
    cell: ({ row }) => {
      return (
        <AccountColumn
          account={row.original.account}
          accountId={row.original.accountId}
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <Actions id={row.original.id} />,
  },
];
