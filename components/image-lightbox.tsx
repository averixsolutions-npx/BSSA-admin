"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)));

export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  // Pan offset (px) — lets the reviewer drag a zoomed image to reach corners/edges
  // that would otherwise be clipped by the viewport.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const reset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset transform whenever the shown image changes.
  useEffect(() => { reset(); }, [index, reset]);

  const isOpen = index !== null && index >= 0 && index < images.length;

  // Apply a new zoom level and re-center when we drop back to 100% or below,
  // so the image never gets "stuck" panned off-screen at low zoom.
  const applyZoom = useCallback((next: number) => {
    const clamped = clampZoom(next);
    setZoom(clamped);
    if (clamped <= 1) setPan({ x: 0, y: 0 });
  }, []);

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
      else if (e.key === "+" || e.key === "=") applyZoom(zoom + 0.2);
      else if (e.key === "-") applyZoom(zoom - 0.2);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, go, applyZoom, zoom]);

  if (!isOpen) return null;
  const current = images[index!];
  const canPan = !current.isPdf && zoom > 1;

  // ── Drag-to-pan (pointer events) — only active on images when zoomed in ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canPan) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };
  const handlePointerUp = () => setIsDragging(false);

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
            <button onClick={() => applyZoom(zoom - 0.1)} title="Zoom out"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/25">
              <ZoomOut size={15} />
            </button>
            <span className="w-11 text-center font-mono text-[12px] text-white/60">{Math.round(zoom * 100)}%</span>
            <button onClick={() => applyZoom(zoom + 0.1)} title="Zoom in"
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

      {/* Viewport — overflow-hidden + drag-to-pan so zoomed corners stay reachable */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl"
        style={{
          width: "min(94vw, 1040px)",
          height: "min(82vh, 760px)",
          cursor: canPan ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onWheel={(e) => applyZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1))}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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
                className="select-none max-w-full max-h-full object-contain"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transition: isDragging ? "none" : "transform 0.15s ease",
                  transformOrigin: "center center",
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

      <p className="relative z-10 mt-2 text-[11px] text-white/25">
        Scroll to zoom · drag to pan when zoomed · Esc to close · ← → to navigate
      </p>
    </div>
  );
}
