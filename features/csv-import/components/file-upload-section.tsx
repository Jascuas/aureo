"use client";

import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Sube un archivo CSV (es necesaria la extensión .csv)';
    }
    
    if (file.size === 0) {
      return 'El archivo está vacío';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024} MB`;
    }
    
    return null;
  };
  
  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setValidationError(validationError);
      return;
    }
    
    setValidationError(null);
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
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex min-h-64 flex-col items-center justify-center border border-dashed bg-card p-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-crt-accent sm:p-12',
          isDragging && 'border-crt-accent bg-accent/5',
          !isDragging && 'border-border hover:border-crt-accent',
          isProcessing && 'pointer-events-none opacity-50',
        )}
      >
        <FileUp className={cn(
          'mb-4 size-12',
          isDragging ? 'text-crt-accent' : 'text-muted-foreground',
        )} aria-hidden="true" />
        
        <p className="text-foreground mb-2 text-sm font-medium">
          {isDragging ? 'Suelta aquí tu archivo CSV' : 'Arrastra y suelta tu archivo CSV'}
        </p>
        
        <p id="csv-upload-help" className="text-muted-foreground mb-4 text-xs">
          o haz clic para buscarlo (máximo {MAX_FILE_SIZE / 1024 / 1024} MB)
        </p>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          disabled={isProcessing}
          className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
          aria-label="Subir archivo CSV"
          aria-describedby="csv-upload-help csv-upload-format"
        />
        
        {selectedFileName && !(validationError || error) && (
          <div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <span className="font-medium">Seleccionado:</span>
            <span>{selectedFileName}</span>
          </div>
        )}
        
        {isProcessing && (
          <div className="text-crt-accent mt-4 flex items-center gap-2 text-sm" role="status" aria-live="polite">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Procesando el archivo CSV…</span>
          </div>
        )}
      </div>
      
      {(validationError || error) && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{validationError || error}</AlertDescription>
        </Alert>
      )}
      
      <div id="csv-upload-format" className="border-crt-amber/50 bg-crt-amber/5 border p-4">
        <p className="text-crt-amber text-sm font-medium">Requisitos del formato CSV</p>
        <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
          <li>• La primera fila debe contener los encabezados</li>
          <li>• Debe incluir columnas de fecha, importe y beneficiario o descripción</li>
          <li>• Mantén un formato de fecha coherente, como DD/MM/AAAA o AAAA-MM-DD</li>
          <li>• Máximo de 1.000 transacciones por importación</li>
        </ul>
      </div>
    </div>
  );
};
