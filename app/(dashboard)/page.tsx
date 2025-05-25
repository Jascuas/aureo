import { DataCharts } from "@/components/data-charts";
import { DataGrid } from "@/components/data-grid";

const DashboardPage = () => {
  return (
    <div className="mx-auto -mt-4 lg:-mt-20 w-full max-w-screen-2xl pb-10">
      <DataGrid />

      <DataCharts />
    </div>
  );
};

export default DashboardPage;
