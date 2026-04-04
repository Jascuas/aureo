"use client";

import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileUploadSectionProps = {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const FileUploadSection = ({
  onFileSelected,
  isProcessing,
  error,
}: FileUploadSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith('.csv')) {
      return 'Please upload a CSV file (.csv extension required)';
    }
    
    if (file.size === 0) {
      return 'File is empty';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    return null;
  };
  
  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      return;
    }
    
    setSelectedFileName(file.name);
    onFileSelected(file);
  }, [onFileSelected]);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);
  
  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
          isDragging && 'border-blue-500 bg-blue-50',
          !isDragging && 'border-gray-300 hover:border-gray-400',
          isProcessing && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className={cn(
          'mb-4 h-12 w-12',
          isDragging ? 'text-blue-500' : 'text-gray-400'
        )} />
        
        <p className="mb-2 text-sm font-medium text-gray-700">
          {isDragging ? 'Drop your CSV file here' : 'Drag and drop your CSV file'}
        </p>
        
        <p className="mb-4 text-xs text-gray-500">
          or click to browse (max {MAX_FILE_SIZE / 1024 / 1024}MB)
        </p>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          disabled={isProcessing}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Upload CSV file"
        />
        
        {selectedFileName && !error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Selected:</span>
            <span>{selectedFileName}</span>
          </div>
        )}
        
        {isProcessing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Processing CSV file...</span>
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">CSV Format Requirements:</p>
        <ul className="mt-2 space-y-1 text-xs text-blue-700">
          <li>• First row should contain column headers</li>
          <li>• Must include: Date, Amount, and Payee/Description columns</li>
          <li>• Dates should be consistent format (e.g., DD/MM/YYYY or YYYY-MM-DD)</li>
          <li>• Maximum 1,000 transactions per import</li>
        </ul>
      </div>
    </div>
  );
};
