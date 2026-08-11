import { Upload } from "lucide-react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { useCSVReader } from "react-papaparse";

import { Button } from "@/components/ui/button";

type UploadButtonProps = {
  onUpload: (results: unknown) => void;
};

type CSVReaderProps = {
  onUploadAccepted: (results: unknown) => void;
  children: (props: {
    getRootProps: () => HTMLAttributes<HTMLButtonElement>;
  }) => ReactNode;
};

export const UploadButton = ({ onUpload }: UploadButtonProps) => {
  const CSVReader = useCSVReader().CSVReader as ComponentType<CSVReaderProps>;

  return (
    <CSVReader onUploadAccepted={onUpload}>
      {({ getRootProps }) => (
        <Button size="sm" className="w-full lg:w-auto" {...getRootProps()}>
          <Upload className="mr-2 size-4" />
          Import
        </Button>
      )}
    </CSVReader>
  );
};
