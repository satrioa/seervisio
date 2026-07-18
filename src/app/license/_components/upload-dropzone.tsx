"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

interface UploadDropzoneProps {
  file: File | null;
  error: string | null;
  onFileAccepted: (file: File) => void;
  onFileRemove: () => void;
  onError: (error: string | null) => void;
}

export function UploadDropzone({
  file,
  error,
  onFileAccepted,
  onFileRemove,
  onError,
}: UploadDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDropAccepted = useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (!f) return;
      onFileAccepted(f);
      onError(null);
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [onFileAccepted, onError],
  );

  const onDropRejected = useCallback(
    (rejections: any[]) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-invalid-type") {
        onError("Hanya file JPG, PNG, dan PDF yang diperbolehkan.");
      } else if (err?.code === "too-many-files") {
        onError("Maksimal 1 file.");
      } else if (err?.code === "file-too-large") {
        onError("Ukuran file maksimal 5 MB.");
      } else {
        onError(err?.message ?? "File tidak valid.");
      }
    },
    [onError],
  );

  const handleRemove = useCallback(() => {
    onFileRemove();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [onFileRemove, previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    onDropAccepted,
    onDropRejected,
  });

  const isPdf = file?.type === "application/pdf";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Upload Bukti Transfer
      </h3>

      <div
        {...getRootProps()}
        role="button"
        tabIndex={0}
        aria-label="Upload bukti transfer"
        className={
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 " +
          (isDragActive
            ? "border-primary bg-primary/5"
            : file
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-border hover:border-muted-foreground/40 hover:bg-muted/20")
        }
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              {isPdf ? (
                <div className="flex size-16 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <svg
                    className="size-8 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              ) : previewUrl ? (
                <div className="relative size-20 overflow-hidden rounded-xl border border-border/60">
                  <img
                    src={previewUrl}
                    alt="Preview bukti transfer"
                    className="size-full object-cover"
                  />
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Hapus file"
                >
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isPdf ? "Hapus" : "Ganti"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex size-12 items-center justify-center rounded-xl border border-border/40 bg-muted/30">
                <svg
                  className="size-6 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Lepaskan file di sini..."
                  : "Seret file ke sini atau klik untuk memilih"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, JPEG, PDF — Maksimal 5 MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
