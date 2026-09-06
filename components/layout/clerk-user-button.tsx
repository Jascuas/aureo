"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const ClerkUserButton = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex size-8 items-center justify-center">
      {isMounted ? (
        <>
          <ClerkLoaded>
            <UserButton />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2
              className="text-muted-foreground size-5 animate-spin"
              aria-label="Cargando cuenta"
              role="status"
            />
          </ClerkLoading>
        </>
      ) : (
        <Loader2
          className="text-muted-foreground size-5 animate-spin"
          aria-label="Cargando cuenta"
          role="status"
        />
      )}
    </div>
  );
};
