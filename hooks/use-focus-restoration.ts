"use client";

import { useCallback, useRef } from "react";

export const useFocusRestoration = () => {
  const restoreTargetRef = useRef<HTMLElement | null>(null);

  const onOpenAutoFocus = useCallback(() => {
    const activeElement = document.activeElement;

    restoreTargetRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault();

    const restoreTarget = restoreTargetRef.current;
    restoreTargetRef.current = null;

    requestAnimationFrame(() => {
      if (restoreTarget?.isConnected) {
        restoreTarget.focus();

        if (document.activeElement === restoreTarget) return;
      }

      document.body.focus();
    });
  }, []);

  return { onCloseAutoFocus, onOpenAutoFocus };
};
