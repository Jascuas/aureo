"use client";

import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ClerkAuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function ClerkAuthForm({ mode }: ClerkAuthFormProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex min-h-24 items-center justify-center">
      {isMounted ? (
        <>
          <ClerkLoaded>
            {mode === "sign-in" ? <SignIn /> : <SignUp />}
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2
              className="text-muted-foreground size-5 animate-spin"
              aria-label="Cargando autenticación"
              role="status"
            />
          </ClerkLoading>
        </>
      ) : (
        <Loader2
          className="text-muted-foreground size-5 animate-spin"
          aria-label="Cargando autenticación"
          role="status"
        />
      )}
    </div>
  );
}
