import { type PropsWithChildren, Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/layout/header";

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <Header />
      <ErrorBoundary>
        <main className="px-3 lg:px-14">{children}</main>
      </ErrorBoundary>
    </Suspense>
  );
};

export default DashboardLayout;
