"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type UploadDocumentFormProps = {
  employeeId: string;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type UploadUrlPayload = {
  title: string;
  documentType: string;
  storageBucket: string;
  storagePath: string;
  token: string;
};

export function UploadDocumentForm({ employeeId }: UploadDocumentFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("salary slip");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title || !file) {
      setError("Document title and file are required.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const initResponse = await fetch(`/api/employees/${employeeId}/documents/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          documentType,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      const initJson = (await initResponse.json()) as ApiEnvelope<UploadUrlPayload>;
      if (!initResponse.ok || !initJson.ok || !initJson.data) {
        throw new Error(initJson.error || "Could not initialize upload.");
      }

      const supabase = getBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(initJson.data.storageBucket)
        .uploadToSignedUrl(initJson.data.storagePath, initJson.data.token, file);

      if (uploadError) {
        throw new Error(uploadError.message || "Could not upload file.");
      }

      const completeResponse = await fetch(`/api/employees/${employeeId}/documents/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: initJson.data.title,
          documentType: initJson.data.documentType,
          storageBucket: initJson.data.storageBucket,
          storagePath: initJson.data.storagePath,
        }),
      });

      const completeJson = (await completeResponse.json()) as ApiEnvelope<{ id: string }>;
      if (!completeResponse.ok || !completeJson.ok) {
        throw new Error(completeJson.error || "Could not save document metadata.");
      }

      router.push(`/dashboard/employees/${employeeId}?message=document_uploaded`);
      router.refresh();
    } catch (uploadFailure) {
      const message =
        uploadFailure instanceof Error
          ? uploadFailure.message
          : "Upload failed. Please retry.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Upload Document</h3>
      <p className="mt-1 text-xs text-slate-500">Direct upload to Supabase Storage (supports larger files).</p>

      <div className="mt-4 grid gap-3">
        <label className="text-sm text-slate-700">
          Title*
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          About Document
          <input
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          File*
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
            required
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Choose File
            </button>
            <span className="text-sm text-slate-600">{file?.name || "No file chosen"}</span>
          </div>
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isUploading}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
