import "./globals.css";

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
    <ClerkProvider>
      <html lang="en" className="dark" data-scroll-behavior="smooth">
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
