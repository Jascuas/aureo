"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InferResponseType } from "hono";
import { ArrowUpDown } from "lucide-react";

import { Actions } from "@/app/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
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
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => {
            const sorted = column.getIsSorted();

            if (sorted === "desc") {
              column.clearSorting();
              return;
            }

            column.toggleSorting(sorted === "asc");
          }}
          aria-label={`Ordenar por nombre: ${
            column.getIsSorted() === "asc"
              ? "descendente"
              : column.getIsSorted() === "desc"
                ? "sin orden"
                : "ascendente"
          }`}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      );
    },
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
    header: "Categoría superior",
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => <Actions id={row.original.id} />,
  },
];
