"use client";
import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFocusRestoration } from "@/hooks/use-focus-restoration";

export const useConfirm = (
  title: string,
  message: string,
): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = () =>
    new Promise((resolve) => {
      setPromise({ resolve });
    });

  const handleClose = () => setPromise(null);

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = () => {
    const focusRestoration = useFocusRestoration();

    return (
      <Dialog open={promise !== null} onOpenChange={handleCancel}>
        <DialogContent
          onCloseAutoFocus={focusRestoration.onCloseAutoFocus}
          onOpenAutoFocus={focusRestoration.onOpenAutoFocus}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return [ConfirmationDialog, confirm];
};
