import "./globals.css";

import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/providers/query-provider";
import { SheetProvider } from "@/providers/sheet-provider";

export const metadata: Metadata = {
  title: "AUREO",
  description: "Personal finance platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        variables: {
          colorBackground: "var(--crt-surface)",
          colorInputBackground: "var(--crt-bg)",
          colorInputText: "var(--crt-fg)",
          colorPrimary: "var(--crt-accent)",
          colorText: "var(--crt-fg)",
          colorTextSecondary: "var(--crt-muted)",
          borderRadius: "0px",
          fontFamily:
            'ui-monospace, "IBM Plex Mono", "JetBrains Mono", Menlo, Consolas, monospace',
        },
        elements: {
          rootBox: "w-full",
          card: "border border-border bg-card shadow-none rounded-none",
          headerTitle: "text-foreground font-bold tracking-[0.1em] uppercase",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "border-border bg-transparent text-foreground rounded-none hover:bg-secondary",
          formFieldLabel: "text-foreground",
          formFieldInput:
            "border-input bg-background text-foreground rounded-none focus:border-crt-accent focus:ring-1 focus:ring-crt-accent",
          formButtonPrimary:
            "border border-crt-accent bg-crt-accent text-background rounded-none hover:bg-transparent hover:text-crt-accent",
          footerActionLink: "text-crt-accent",
          formFieldErrorText: "text-destructive",
          alert: "border-destructive bg-destructive/5 text-destructive rounded-none",
        },
      }}
    >
      <html lang="es" className="dark" data-scroll-behavior="smooth">
        <body>
          <QueryProvider>
            <SheetProvider />
            <Toaster />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
