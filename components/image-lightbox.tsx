"use client";
import { useEffect, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";

export interface LightboxImage {
  url: string;
  label: string;
  isPdf?: boolean; // PDFs render in an <iframe>, not <img>
}

interface ImageLightboxProps {
  images: LightboxImage[];
  index: number | null;              // null = closed
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const reset = useCallback(() => { setZoom(1); setRotation(0); }, []);

  // Reset transform whenever the shown image changes.
  useEffect(() => { reset(); }, [index, reset]);

  const isOpen = index !== null && index >= 0 && index < images.length;

  const go = useCallback((dir: 1 | -1) => {
    if (index === null) return;
    const next = index + dir;
    if (next >= 0 && next < images.length) onIndexChange(next);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, +(z + 0.2).toFixed(2)));
      else if (e.key === "-") setZoom((z) => Math.max(0.25, +(z - 0.2).toFixed(2)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, go]);

  if (!isOpen) return null;
  const current = images[index!];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Toolbar */}
      <div className="relative z-10 mb-4 flex items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm">
        <span className="max-w-[180px] truncate pr-2 text-[13px] font-medium text-white/80">
          {current.label}
        </span>
        {!current.isPdf && (
          <>
            <div className="mx-1 h-5 w-px bg-white/20" />
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} title="Zoom out"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/25">
              <ZoomOut size={15} />
            </button>
            <span className="w-11 text-center font-mono text-[12px] text-white/60">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(5, +(z + 0.1).toFixed(2)))} title="Zoom in"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/25">
              <ZoomIn size={15} />
            </button>
            <div className="mx-1 h-5 w-px bg-white/20" />
            <button onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate 90°"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/25">
              <RotateCw size={15} />
            </button>
            <button onClick={reset}
              className="h-8 rounded-lg bg-white/10 px-3 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/25 hover:text-white">
              Reset
            </button>
            <div className="mx-1 h-5 w-px bg-white/20" />
          </>
        )}
        <a href={current.url} download target="_blank" rel="noreferrer" title="Download"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/25">
          <Download size={15} />
        </a>
        <button onClick={onClose} title="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-red-500/50">
          <X size={15} />
        </button>
      </div>

      {/* Viewport */}
      <div
        className="relative z-10 overflow-auto rounded-2xl"
        style={{ width: "min(90vw, 860px)", height: "min(74vh, 640px)" }}
        onWheel={(e) => {
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoom((z) => Math.min(5, Math.max(0.25, +(z + delta).toFixed(2))));
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          {current.isPdf ? (
            <iframe
              src={current.url}
              title={current.label}
              className="h-full w-full rounded-lg bg-white"
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt={current.label}
                draggable={false}
                className="select-none"
                style={{
                  maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: "transform 0.15s ease", transformOrigin: "center center",
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Prev / Next (only if >1 image) */}
      {images.length > 1 && (
        <div className="relative z-10 mt-3 flex items-center gap-4 text-[12px] text-white/50">
          <button onClick={() => go(-1)} disabled={index === 0}
            className="rounded px-2 py-1 transition-colors hover:text-white disabled:opacity-30">← Prev</button>
          <span>{index! + 1} / {images.length}</span>
          <button onClick={() => go(1)} disabled={index === images.length - 1}
            className="rounded px-2 py-1 transition-colors hover:text-white disabled:opacity-30">Next →</button>
        </div>
      )}

      <p className="relative z-10 mt-2 text-[11px] text-white/25">Scroll to zoom · Esc to close · ← → to navigate</p>
    </div>
  );
}
