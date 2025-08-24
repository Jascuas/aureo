import { Suspense } from "react";

import { DataCharts } from "@/components/data-charts";
import { DataGrid } from "@/components/data-grid";

const DashboardPage = () => {
  return (
    <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
      <Suspense>
        <DataGrid />

        <DataCharts />
      </Suspense>
    </div>
  );
};

export default DashboardPage;
