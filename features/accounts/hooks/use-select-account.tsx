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

type AccountOption = {
  label: string;
  value: string;
};

type AccountSelectionDialogProps = {
  accountOptions: AccountOption[];
  isAccountCreationPending: boolean;
  isAccountQueryError: boolean;
  isAccountQueryLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onCreateAccount: (name: string) => void;
  onSelectAccount: (accountId?: string) => void;
  open: boolean;
  selectedAccountId: string;
};

const AccountSelectionDialog = ({
  accountOptions,
  isAccountCreationPending,
  isAccountQueryError,
  isAccountQueryLoading,
  onCancel,
  onConfirm,
  onCreateAccount,
  onSelectAccount,
  open,
  selectedAccountId,
}: AccountSelectionDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={(isOpen) => {
      if (!isOpen && !isAccountCreationPending) onCancel();
    }}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Selecciona una cuenta</DialogTitle>
        <DialogDescription>Selecciona una cuenta para continuar.</DialogDescription>
      </DialogHeader>

      {isAccountQueryLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        </div>
      ) : isAccountQueryError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudieron cargar las cuentas. Cierra la ventana e inténtalo de nuevo.
        </p>
      ) : accountOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crea una cuenta para continuar.</p>
      ) : (
        <Select
          placeholder="Selecciona una cuenta"
          options={accountOptions}
          onCreate={onCreateAccount}
          onChange={onSelectAccount}
          value={selectedAccountId}
          disabled={isAccountCreationPending}
        />
      )}

      <DialogFooter className="pt-2">
        <Button disabled={isAccountCreationPending} onClick={onCancel} variant="outline">
          Cancelar
        </Button>
        <Button
          disabled={
            isAccountCreationPending ||
            !accountOptions.some((option) => option.value === selectedAccountId)
          }
          onClick={onConfirm}
        >
          Confirmar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const useSelectAccount = (): [
  JSX.Element,
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

  const accountDialog = (
    <AccountSelectionDialog
      accountOptions={accountOptions}
      isAccountCreationPending={accountMutation.isPending}
      isAccountQueryError={accountQuery.isError}
      isAccountQueryLoading={accountQuery.isLoading}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      onCreateAccount={onCreateAccount}
      onSelectAccount={(value) => setSelectedAccountId(value ?? "")}
      open={promise !== null}
      selectedAccountId={selectedAccountId}
    />
  );

  return [accountDialog, confirm];
};
