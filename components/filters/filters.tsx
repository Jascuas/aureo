import { Suspense } from "react";

import { AccountFilter } from "@/components/filters/account-filter";
import { DateFilter } from "@/components/filters/date-filter";

export const Filters = () => {
  return (
    <div className="flex flex-col items-center gap-y-2 lg:flex-row lg:gap-x-2 lg:gap-y-0">
      <Suspense>
        <AccountFilter />
        <DateFilter />
      </Suspense>
    </div>
  );
};
