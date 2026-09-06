import { SignIn } from "@clerk/nextjs";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { HeaderLogo } from "@/components/layout/header-logo";

export default function Page() {
  return (
    <main className="bg-grid flex min-h-screen items-start justify-center px-4 py-8 sm:py-12 lg:items-center">
      <section className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <HeaderLogo />
        </div>

        <div className="border-border bg-card border p-4 sm:p-6">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-foreground text-xl font-bold tracking-[0.1em] uppercase">
              Inicia sesión en Aureo
            </h1>
            <p className="text-muted-foreground text-sm">
              Accede a tu espacio privado de finanzas.
            </p>
          </div>
          <div className="flex justify-center">
            <ClerkLoaded>
              <SignIn />
            </ClerkLoaded>
            <ClerkLoading>
              <Loader2 className="text-muted-foreground animate-spin" />
            </ClerkLoading>
          </div>
        </div>
      </section>
    </main>
  );
}
