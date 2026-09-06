"use client";

import { Check, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTemplates } from "@/features/csv-import/api/use-get-templates";
import { useSaveTemplate } from "@/features/csv-import/api/use-save-template";
import {
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DATE_FORMAT,
} from "@/features/csv-import/const/import-const";
import type {
  AmountFormat,
  ColumnDetectionResult,
  ImportTemplate,
} from "@/features/csv-import/types/import-types";

type TemplateControlsProps = {
  accountId?: string;
  columnMapping: Record<string, number>;
  detectionResult?: ColumnDetectionResult;
  disableSave: boolean;
  onLoadTemplate?: (template: ImportTemplate) => void;
};

export const TemplateControls = ({
  accountId,
  columnMapping,
  detectionResult,
  disableSave,
  onLoadTemplate,
}: TemplateControlsProps) => {
  const [templateName, setTemplateName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const { data: templates = [] } = useGetTemplates(accountId);
  const saveTemplateMutation = useSaveTemplate();

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !accountId) return;

    saveTemplateMutation.mutate({
      accountId,
      name: templateName,
      columnMapping,
      dateFormat: detectionResult?.dateFormat || DEFAULT_DATE_FORMAT,
      amountFormat:
        (detectionResult?.amountFormat as AmountFormat | undefined) ||
        DEFAULT_AMOUNT_FORMAT,
    });

    setTemplateName("");
    setShowSaveInput(false);
  };

  return (
    <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        {templates && templates.length > 0 && (
          <Select
            onValueChange={(value) => {
              const template = templates.find((item) => item.id === value);
              if (template) onLoadTemplate?.(template);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Cargar plantilla…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSaveInput ? (
          <>
            <Input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nombre de la plantilla…"
              className="h-9 w-full sm:w-[200px]"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowSaveInput(false);
                setTemplateName("");
              }}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveInput(true)}
            disabled={disableSave}
          >
            <Save className="mr-2 size-4" />
            Guardar como plantilla
          </Button>
        )}
      </div>
    </div>
  );
};
