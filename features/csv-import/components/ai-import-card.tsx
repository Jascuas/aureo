"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { useImportSession } from "../hooks/use-import-session";
import { ImportStepper } from "./import-stepper";
import { FileUploadSection } from "./file-upload-section";
import { ImportSummary } from "./import-summary";

type AiImportCardProps = {
  accountId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
};

export const AiImportCard = ({
  accountId,
  onComplete,
  onCancel,
}: AiImportCardProps) => {
  const {
    currentStep,
    reset,
  } = useImportSession();
  
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const handleFileSelected = async (file: File) => {
    // TODO: Implement CSV parsing and column detection
    setUploadError("CSV import not yet implemented");
  };
  
  const handleCancel = () => {
    if (currentStep !== 'UPLOAD' && currentStep !== 'IMPORT') {
      const confirmed = window.confirm('Are you sure? All progress will be lost.');
      if (!confirmed) return;
    }
    
    reset();
    onCancel?.();
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 'UPLOAD':
        return (
          <FileUploadSection
            onFileSelected={handleFileSelected}
            isProcessing={false}
            error={uploadError}
          />
        );
      
      case 'MAPPING':
        return <div>Column Mapping - Not Implemented</div>;
      
      case 'ANALYSIS':
        return <div>Analysis - Not Implemented</div>;
      
      case 'REVIEW':
        return <div>Review - Not Implemented</div>;
      
      case 'IMPORT':
        return (
          <ImportSummary
            importedCount={0}
            skippedCount={0}
            errorCount={0}
            errors={[]}
            onImportAnother={reset}
            onViewTransactions={() => {
              reset();
              onComplete?.();
            }}
          />
        );
    }
  };
  
  const renderStepActions = () => {
    switch (currentStep) {
      case 'UPLOAD':
        return (
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        );
      
      case 'IMPORT':
        return null;
      
      default:
        return (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button disabled>
              Continue (Not Implemented)
            </Button>
          </div>
        );
    }
  };
  
  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader>
        <CardTitle>AI-Powered CSV Import</CardTitle>
        <ImportStepper currentStep={currentStep} />
      </CardHeader>
      
      <CardContent className="min-h-[400px]">
        {renderStepContent()}
      </CardContent>
      
      {renderStepActions() && (
        <CardFooter className="flex justify-end">
          {renderStepActions()}
        </CardFooter>
      )}
    </Card>
  );
};
