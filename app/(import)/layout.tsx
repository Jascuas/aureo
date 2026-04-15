import { type PropsWithChildren, Suspense } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/layout/header";

const ImportLayout = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <Header showFilters={false} />
      <ErrorBoundary>
        <main className="px-3 lg:px-14">{children}</main>
      </ErrorBoundary>
    </Suspense>
  );
};

export default ImportLayout;
