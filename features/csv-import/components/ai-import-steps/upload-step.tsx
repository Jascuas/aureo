import { FileUploadSection } from "@/features/csv-import/components/file-upload-section";
import { useCSVUpload } from "@/features/csv-import/hooks/use-csv-upload";

interface UploadStepProps {
  accountId?: string;
}

export function UploadStep({ accountId }: UploadStepProps) {
  const { uploadFile, isProcessing, error } = useCSVUpload({ accountId });

  return (
    <FileUploadSection
      onFileSelected={uploadFile}
      isProcessing={isProcessing}
      error={error}
    />
  );
}
