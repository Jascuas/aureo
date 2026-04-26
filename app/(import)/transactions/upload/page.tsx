"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { AiImportCard } from "@/features/csv-import/components/ai-import-card";
import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { toast } from "sonner";

const UploadPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId") || undefined;
  const [AccountDialog, confirm] = useSelectAccount();
  const { reset } = useImportSession();

  const handleComplete = () => {
    router.push("/transactions");
  };

  const handleCancel = () => {
    router.push("/transactions");
  };

  const handleImportAnother = async () => {
    const selectedAccountId = await confirm();
    if (!selectedAccountId) {
      toast.error("Please select an account to continue.");
      return;
    }
    reset();
    router.push(`/transactions/upload?accountId=${selectedAccountId}`);
  };

  return (
    <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
      <AccountDialog />
      <AiImportCard
        accountId={accountId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onImportAnother={handleImportAnother}
      />
    </div>
  );
};

export default UploadPage;
