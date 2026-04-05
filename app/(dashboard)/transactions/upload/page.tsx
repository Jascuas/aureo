"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { AiImportCard } from "@/features/csv-import/components/ai-import-card";

const UploadPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId") || undefined;

  const handleComplete = () => {
    router.push("/transactions");
  };

  const handleCancel = () => {
    router.push("/transactions");
  };

  return (
    <div className="mx-auto -mt-4 w-full max-w-screen-2xl pb-10 lg:-mt-20">
      <AiImportCard
        accountId={accountId}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default UploadPage;
