"use client";
import { useRef, useState, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon, FileIcon } from "lucide-react";
import { api, ApiCallError } from "@/lib/api-client";
import type { PresignedUpload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "application/pdf": "PDF",
};

interface FileDropzoneProps {
  /** Which R2 folder to upload into (whitelisted on the backend). */
  folder:
    | "hero" | "news" | "events" | "media" | "committee"
    | "athletes" | "associations" | "programs" | "disciplines";
  /** Allowed MIME types. Defaults to images only. */
  accept?: string[];
  /** Max file size in bytes. Default 10 MB. */
  maxSize?: number;
  /** Existing file URL (for edit mode — show the current image). */
  value?: string | null;
  /** Called with the final public URL once upload completes. */
  onChange: (url: string | null) => void;
  /** Optional label shown when empty. */
  emptyLabel?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function FileDropzone({
  folder,
  accept = DEFAULT_ACCEPT,
  maxSize = 10 * 1024 * 1024,
  value,
  onChange,
  emptyLabel = "Click or drag to upload",
  disabled = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      // ── Client-side validation ──
      if (!accept.includes(file.type)) {
        toast.error(
          `File type not supported. Allowed: ${accept.map((t) => MIME_LABELS[t] ?? t).join(", ")}`
        );
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File too large. Max ${(maxSize / 1024 / 1024).toFixed(0)} MB.`);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        // ── Step 1: get presigned URL from backend ──
        const presigned = await api.post<PresignedUpload>("/upload/presign", {
          folder,
          contentType: file.type,
          filename: file.name,
        });

        // ── Step 2: PUT the file directly to R2 ──
        // We use XHR instead of fetch because fetch does not expose upload
        // progress events. XHR does — critical for user experience on large files.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presigned.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 responded ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Network error uploading to R2"));
          xhr.ontimeout = () => reject(new Error("Upload timed out"));
          xhr.timeout = 60_000; // 60 seconds
          xhr.send(file);
        });

        onChange(presigned.publicUrl);
        toast.success("File uploaded");
      } catch (err) {
        if (err instanceof ApiCallError) {
          toast.error(err.message);
        } else if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error("Upload failed");
        }
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [accept, folder, maxSize, onChange]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    // Reset input value so selecting the same file again fires onChange
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const isImage = value && /\.(jpe?g|png|webp|gif)$/i.test(value);
  const isPdf = value && /\.pdf$/i.test(value);

  return (
    <div className="space-y-2">
      {value ? (
        // ── Preview + remove ──
        <div className="flex items-start gap-3 rounded-md border p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-20 w-20 rounded object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
              {isPdf ? <FileIcon className="h-8 w-8 text-muted-foreground" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.split("/").pop()}</p>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              Open in new tab
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // ── Empty state / drop target ──
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-input",
            disabled || uploading ? "opacity-60 pointer-events-none" : "cursor-pointer hover:bg-muted/40"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Uploading… {progress}%</p>
              <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {accept.map((t) => MIME_LABELS[t] ?? t).join(", ")} · up to{" "}
                {(maxSize / 1024 / 1024).toFixed(0)} MB
              </p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept.join(",")}
        onChange={onFileChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}
