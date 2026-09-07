"use client";
import { ColumnDef } from "@tanstack/react-table";
import { InferResponseType } from "hono";
import { ArrowUpDown } from "lucide-react";

import { Actions } from "@/app/(dashboard)/accounts/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/lib/hono";

export type ResponseType = InferResponseType<
  typeof client.api.accounts.$get,
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
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => <Actions id={row.original.id} />,
  },
];
