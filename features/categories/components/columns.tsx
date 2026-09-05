"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InferResponseType } from "hono";

import { Actions } from "@/app/(dashboard)/categories/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/lib/hono";

export type ResponseType = InferResponseType<
  typeof client.api.categories.$get,
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const hasParent = row.original.depth > 0;
      return (
        <div
          style={
            hasParent ? { paddingLeft: `${row.original.depth * 2}rem` } : undefined
          }
        >
          {hasParent && <span className="text-muted-foreground mr-2">└─</span>}
          {row.original.name}
        </div>
      );
    },
  },
  {
    accessorKey: "parentName",
    header: "Parent Category",
  },
  {
    id: "actions",
    cell: ({ row }) => <Actions id={row.original.id} />,
  },
];
