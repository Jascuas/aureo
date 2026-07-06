import type { PropsWithChildren } from "react";

export default function SpacingDemoLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-background text-foreground bg-grid min-h-screen font-mono will-change-transform">
      <div className="scanline" />
      {children}
    </div>
  );
}
