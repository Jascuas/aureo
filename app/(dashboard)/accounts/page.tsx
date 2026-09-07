"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useRef } from "react";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBulkDeleteAccounts } from "@/features/accounts/api/use-bulk-delete-accounts";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { columns } from "@/features/accounts/components/columns";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";

const AccountsPage = () => {
  const newAccount = useNewAccount();
  const deleteAccounts = useBulkDeleteAccounts();
  const accountsQuery = useGetAccounts();
  const addAccountButtonRef = useRef<HTMLButtonElement>(null);
  const wasAccountSheetOpen = useRef(false);
  const accounts = accountsQuery.data || [];

  useEffect(() => {
    if (wasAccountSheetOpen.current && !newAccount.isOpen) {
      const frame = requestAnimationFrame(() => {
        addAccountButtonRef.current?.focus();
      });

      return () => cancelAnimationFrame(frame);
    }

    wasAccountSheetOpen.current = newAccount.isOpen;
  }, [newAccount.isOpen]);

  const isDisabled = accountsQuery.isLoading || deleteAccounts.isPending;

  if (accountsQuery.isLoading) {
    return (
      <div className="w-full pb-10">
        <Card className="border-border border drop-shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>

          <CardContent>
            <div className="flex h-[500px] w-full items-center justify-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <Card className="border-border border drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="line-clamp-1 text-xs">
            <span className="text-crt-accent">▌</span> Página de cuentas
          </CardTitle>

          <Button
            ref={addAccountButtonRef}
            size="sm"
            onClick={newAccount.onOpen}
            className="w-full lg:w-auto"
          >
            <Plus className="mr-2 size-4" /> Añadir cuenta
          </Button>
        </CardHeader>

        <CardContent>
          <DataTable
            filterKey="name"
            columns={columns}
            data={accounts}
            onDelete={(row) => {
              const ids = row.map((r) => r.original.id);

              deleteAccounts.mutate({ ids });
            }}
            disabled={isDisabled}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsPage;
