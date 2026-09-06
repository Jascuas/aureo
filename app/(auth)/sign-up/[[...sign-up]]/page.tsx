import { ClerkAuthForm } from "@/app/(auth)/_components/clerk-auth-form";
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
              Crea tu cuenta de Aureo
            </h1>
            <p className="text-muted-foreground text-sm">
              Configura tu espacio privado de finanzas.
            </p>
          </div>
          <ClerkAuthForm mode="sign-up" />
        </div>
      </section>
    </main>
  );
}
