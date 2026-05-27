import { type PropsWithChildren, Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <div className="bg-background flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <ErrorBoundary>
            <main className="flex-1 overflow-y-auto p-3">{children}</main>
          </ErrorBoundary>
        </div>
      </div>
    </Suspense>
  );
};

export default DashboardLayout;
