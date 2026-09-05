"use client";

import { Loader2 } from "lucide-react";
import { type JSX, useState } from "react";

import { Select } from "@/components/inputs/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import type { Account } from "@/lib/api-types";

export const useSelectAccount = (): [
  () => JSX.Element,
  () => Promise<string | undefined>,
] => {
  const accountQuery = useGetAccounts();
  const accountMutation = useCreateAccount();

  const onCreateAccount = (name: string) => accountMutation.mutate({ name });

  const accountOptions = (accountQuery.data ?? []).map((account: Account) => ({
    label: account.name,
    value: account.id,
  }));

  const [promise, setPromise] = useState<{
    resolve: (value: string | undefined) => void;
  } | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState("");

  const confirm = () => {
    setSelectedAccountId("");

    return new Promise<string | undefined>((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setSelectedAccountId("");
    setPromise(null);
  };

  const handleConfirm = () => {
    if (!accountOptions.some((option) => option.value === selectedAccountId)) {
      return;
    }

    promise?.resolve(selectedAccountId);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(undefined);
    handleClose();
  };

  const ConfirmationDialog = () => (
    <Dialog
      open={promise !== null}
      onOpenChange={(open) => {
        if (!open && !accountMutation.isPending) handleCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecciona una cuenta</DialogTitle>
          <DialogDescription>
            Selecciona una cuenta para continuar.
          </DialogDescription>
        </DialogHeader>

        {accountQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </div>
        ) : accountQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            No se pudieron cargar las cuentas. Cierra la ventana e inténtalo de
            nuevo.
          </p>
        ) : accountOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crea una cuenta para continuar.
          </p>
        ) : (
          <Select
            placeholder="Selecciona una cuenta"
            options={accountOptions}
            onCreate={onCreateAccount}
            onChange={(value) => setSelectedAccountId(value ?? "")}
            value={selectedAccountId}
            disabled={accountMutation.isPending}
          />
        )}

        <DialogFooter className="pt-2">
          <Button
            disabled={accountMutation.isPending}
            onClick={handleCancel}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            disabled={
              accountMutation.isPending ||
              !accountOptions.some(
                (option) => option.value === selectedAccountId,
              )
            }
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [ConfirmationDialog, confirm];
};
