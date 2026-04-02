import { Suspense } from "react";

import { OverviewCharts } from "@/components/charts/overview-charts";
import { DataGrid } from "@/components/dashboard/data-grid";

const DashboardPage = () => {
  return (
    <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
      <Suspense>
        <DataGrid />

        <OverviewCharts />
      </Suspense>
    </div>
  );
};

export default DashboardPage;
