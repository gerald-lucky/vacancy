"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getNextFriday } from "@/lib/utils";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadReportProps {
  onComplete?: () => void;
}

export function UploadReport({ onComplete }: UploadReportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [weekDate, setWeekDate] = useState<string>(() => {
    const d = getNextFriday();
    return d.toISOString().split("T")[0];
  });
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(xls|xlsx)$/i)) {
      setError("Only .xls and .xlsx files are supported.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  async function handleUpload() {
    if (!file || !weekDate) return;
    setStage("uploading");
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("weekDate", weekDate);

      const uploadRes = await fetch("/api/upload-report", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error);

      const reportId = uploadJson.report.id;

      // Step 2: Process with Claude
      setStage("processing");
      const processRes = await fetch("/api/process-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const processJson = await processRes.json();
      if (!processRes.ok) throw new Error(processJson.error);

      setStage("done");
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setStage("idle");
    setError(null);
  }

  const stageLabel: Record<Stage, string> = {
    idle: "",
    uploading: "Uploading file to storage...",
    processing: "Claude is reading the report...",
    done: "Report processed successfully!",
    error: "",
  };

  return (
    <div className="space-y-6">
      {/* Week date picker */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Report week (Friday date)</label>
        <input
          type="date"
          value={weekDate}
          onChange={(e) => setWeekDate(e.target.value)}
          className="block h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          disabled={stage !== "idle" && stage !== "error"}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50",
          (stage !== "idle" && stage !== "error") && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-green-600" />
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload className="h-10 w-10" />
            <p className="text-sm">Drag & drop your Excel file here, or click to browse</p>
            <p className="text-xs">.xls, .xlsx accepted</p>
          </div>
        )}
      </div>

      {/* Status */}
      {stage !== "idle" && stage !== "error" && (
        <div className="flex items-center gap-3 text-sm">
          {stage === "done" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          )}
          <span className={stage === "done" ? "text-green-700" : "text-blue-700"}>
            {stageLabel[stage]}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {stage === "done" ? (
          <Button onClick={reset} variant="outline">Upload another</Button>
        ) : (
          <>
            <Button
              onClick={handleUpload}
              disabled={!file || !weekDate || (stage !== "idle" && stage !== "error")}
            >
              {stage === "uploading" || stage === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
            {file && stage === "idle" && (
              <Button variant="outline" onClick={reset}>Clear</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
