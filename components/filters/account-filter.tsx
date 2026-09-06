"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import type { Account } from "@/lib/api-types";

export const AccountFilter = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountId = searchParams.get("accountId") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const onChange = (newValue: string) => {
    const query = {
      accountId: newValue,
      from,
      to,
    };

    if (newValue === "all") query.accountId = "";

    const url = qs.stringifyUrl(
      {
        url: pathname,
        query,
      },
      { skipNull: true, skipEmptyString: true },
    );

    router.push(url);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: accounts, isLoading } = useGetAccounts();
  return (
    <Select
      value={accountId}
      onValueChange={onChange}
      disabled={mounted && isLoading}
    >
      <SelectTrigger className="hover:border-crt-accent hover:text-crt-accent focus-visible:border-crt-accent h-9 w-full rounded-none border border-input bg-transparent px-3 text-[10px] font-bold tracking-[0.14em] text-foreground uppercase transition outline-none focus-visible:ring-1 focus-visible:ring-crt-accent focus-visible:ring-offset-0 lg:w-auto">
        <SelectValue placeholder="Seleccionar cuenta" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">Todas las cuentas</SelectItem>

        {accounts?.map((account: Account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
