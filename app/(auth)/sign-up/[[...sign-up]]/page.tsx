import { SignUp } from "@clerk/nextjs";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { HeaderLogo } from "@/components/header-logo";

export default function Page() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="h-full flex-col items-center justify-center bg-[#F5F5F5] px-4 lg:flex">
        <div className="space-y-4 pt-16 text-center">
          <h1 className="text-3xl font-bold text-[#2e2a47]">
            Welcome to Aureo
          </h1>
          <p className="text-base text-[#7e8ca0]">
            Create your account to get started
          </p>
        </div>
        <div className="mt-8 flex items-center justify-center">
          <ClerkLoaded>
            <SignUp />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className="text-muted-foreground animate-spin" />
          </ClerkLoading>
        </div>
      </div>

      <div className="dark:to-background hidden h-full items-center justify-center bg-gradient-to-b from-teal-700 to-teal-500 lg:flex dark:from-[hsl(210_60%_10%)]">
        <HeaderLogo size="large" />
      </div>
    </div>
  );
}
