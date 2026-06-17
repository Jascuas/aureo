import type { PropsWithChildren } from "react";

export default function SpacingDemoLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-background text-foreground min-h-screen font-mono">
      {children}
    </div>
  );
}
