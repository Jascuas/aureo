"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";
import { AiImportCard } from "@/features/csv-import/components/ai-import-card";
import {
  ImportSessionProvider,
  useImportSession,
} from "@/features/csv-import/hooks/use-import-session";

const UploadPageContent = () => {
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
      toast.error("Selecciona una cuenta para continuar.");
      return;
    }
    reset();
    router.push(`/transactions/upload?accountId=${selectedAccountId}`);
  };

  return (
    <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
      {AccountDialog}
      <AiImportCard
        accountId={accountId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onImportAnother={handleImportAnother}
      />
    </div>
  );
};

const UploadPage = () => (
  <ImportSessionProvider>
    <UploadPageContent />
  </ImportSessionProvider>
);

export default UploadPage;
