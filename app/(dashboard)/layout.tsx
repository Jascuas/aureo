import { type PropsWithChildren, Suspense } from "react";

import { Header } from "@/components/header";

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <Header />
      <main className="px-3 lg:px-14">{children}</main>
    </Suspense>
  );
};

export default DashboardLayout;
