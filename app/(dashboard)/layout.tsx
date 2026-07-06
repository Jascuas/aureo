import { type PropsWithChildren, Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { FiltersBar } from "@/components/layout/filters-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";
import { Topbar } from "@/components/layout/topbar";

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <div className="bg-background flex h-screen w-full overflow-hidden">
        <Sidebar />
        <SidebarToggleButton />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden will-change-transform">
          <div className="scanline" />
          <Topbar />
          <FiltersBar />
          <ErrorBoundary>
            <main className="bg-grid relative z-10 flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </ErrorBoundary>
        </div>
      </div>
    </Suspense>
  );
};

export default DashboardLayout;
