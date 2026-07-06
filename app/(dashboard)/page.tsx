import { Suspense } from "react";

import { OverviewCharts } from "@/components/charts/overview-charts";
import { DataGrid } from "@/components/dashboard/data-grid";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";

const DashboardPage = () => {
  return (
    <div className="w-full pb-10">
      <Suspense>
        <DataGrid />

        <OverviewCharts />

        <div className="mt-4 lg:mt-6">
          <RecentTransactionsCard />
        </div>
      </Suspense>
    </div>
  );
};

export default DashboardPage;
