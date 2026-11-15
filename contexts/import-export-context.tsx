"use client";

import { createContext, useContext } from "react";
import axios from "axios";
import { API_BASE } from "@/lib/api/api-base"

export interface ExportOptions {
  format: "csv" | "xlsx" | "pdf";
  style?: "simple" | "accountant";
  dateFrom?: string;
  dateTo?: string;
}

export interface PreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  isDuplicate: boolean;
  existingTransactionId?: string;
}

export interface InvalidRow {
  rowNumber: number;
  raw: Record<string, any>;
  errors: string[];
}

export interface ImportPreview {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  validRows: PreviewRow[];
  invalidRows: InvalidRow[];
}

const CONTENT_TYPE_EXTENSION: Record<ExportOptions["format"], string> = {
  csv: "csv",
  xlsx: "xlsx",
  pdf: "pdf",
};

const ImportExportContext = createContext<{
  exportTransactions: (options: ExportOptions) => Promise<{ success: boolean; error?: string }>;
  previewImport: (file: File) => Promise<{ success: boolean; data?: ImportPreview; error?: string }>;
  commitImport: (rows: Record<string, any>[]) => Promise<{ success: boolean; imported?: number; error?: string }>;
} | null>(null);

export function ImportExportProvider({ children }: { children: React.ReactNode }) {
  const apiBase = API_BASE;

  const exportTransactions = async (options: ExportOptions) => {
    try {
      const params: Record<string, string> = { format: options.format };
      if (options.style) params.style = options.style;
      if (options.dateFrom) params.dateFrom = options.dateFrom;
      if (options.dateTo) params.dateTo = options.dateTo;

      const res = await axios.get(`${apiBase}/api/v1/export/transactions`, {
        withCredentials: true,
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions.${CONTENT_TYPE_EXTENSION[options.format]}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      let message = "Could not export your transactions.";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          message = JSON.parse(text)?.error?.message || message;
        } catch {
        }
      }
      return { success: false, error: message };
    }
  };

  const previewImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${apiBase}/api/v1/import/transactions/preview`, formData, { withCredentials: true });
      return { success: true, data: res.data.data as ImportPreview };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not preview this file." };
    }
  };

  const commitImport = async (rows: Record<string, any>[]) => {
    try {
      const res = await axios.post(`${apiBase}/api/v1/import/transactions/commit`, { rows }, { withCredentials: true });
      return { success: true, imported: res.data.data.imported as number };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error?.message || "Could not import these transactions." };
    }
  };

  return (
    <ImportExportContext.Provider value={{ exportTransactions, previewImport, commitImport }}>
      {children}
    </ImportExportContext.Provider>
  );
}

export function useImportExport() {
  const context = useContext(ImportExportContext);
  if (!context) throw new Error("useImportExport must be used within an ImportExportProvider");
  return context;
}
