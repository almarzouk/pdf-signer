"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  MouseEvent,
  TouchEvent,
} from "react";
import { Move, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";

interface SignatureOverlayItem {
  id: string;
  dataUrl: string;
  /** X in original image pixels */
  x: number;
  /** Y in original image pixels */
  y: number;
  /** Width in original image pixels */
  width: number;
  /** Height in original image pixels */
  height: number;
}

interface ImageViewerProps {
  file: File;
  signatures: SignatureOverlayItem[];
  onSignaturesChange: (sigs: SignatureOverlayItem[]) => void;
  onExport: () => void;
}

export default function ImageViewer({
  file,
  signatures,
  onSignaturesChange,
  onExport,
}: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  // Natural image dimensions (pixels)
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);

  const dragging = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizing = useRef<{
    id: string;
    startX: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const getClientXY = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  // ── Drag & Resize ─────────────────────────────────────────────────
  // sig.x/y/width/height are in original IMAGE PIXEL coordinates.
  // CSS display size = imgW * zoom.
  // Screen delta → image pixels = screenDelta / zoom.

  const startDrag = useCallback(
    (e: MouseEvent | TouchEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const { clientX, clientY } = getClientXY(e);
      const sig = signatures.find((s) => s.id === id);
      if (!sig) return;
      dragging.current = { id, startX: clientX, startY: clientY, origX: sig.x, origY: sig.y };
    },
    [signatures]
  );

  const startResize = useCallback(
    (e: MouseEvent | TouchEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const { clientX } = getClientXY(e);
      const sig = signatures.find((s) => s.id === id);
      if (!sig) return;
      resizing.current = { id, startX: clientX, startW: sig.width, startH: sig.height };
    },
    [signatures]
  );

  const onMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = getClientXY(e);
      if (dragging.current) {
        const dx = (clientX - dragging.current.startX) / zoom;
        const dy = (clientY - dragging.current.startY) / zoom;
        onSignaturesChange(
          signatures.map((s) =>
            s.id === dragging.current!.id
              ? { ...s, x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }
              : s
          )
        );
      }
      if (resizing.current) {
        const dx = (clientX - resizing.current.startX) / zoom;
        const newW = Math.max(20, resizing.current.startW + dx);
        const ratio = resizing.current.startH / resizing.current.startW;
        onSignaturesChange(
          signatures.map((s) =>
            s.id === resizing.current!.id
              ? { ...s, width: newW, height: newW * ratio }
              : s
          )
        );
      }
    },
    [zoom, signatures, onSignaturesChange]
  );

  const endDrag = useCallback(() => {
    dragging.current = null;
    resizing.current = null;
  }, []);

  const removeSig = (id: string) =>
    onSignaturesChange(signatures.filter((s) => s.id !== id));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.15))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-xs sm:text-sm w-10 sm:w-14 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.15))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(1)} title="إعادة تعيين"
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onExport}
            disabled={signatures.length === 0}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-xs sm:text-sm font-medium whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تحميل الصورة</span>
            <span className="inline sm:hidden">تحميل</span>
          </button>
        </div>

        {signatures.length > 0 && (
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mt-1.5">
            <Move className="w-3 h-3" />
            <span>اسحب التوقيع لتحريكه — اسحب الزاوية لتغيير الحجم</span>
          </div>
        )}
      </div>

      {/* Image area */}
      <div
        className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-3 sm:p-6"
        onMouseMove={onMove as (e: MouseEvent) => void}
        onMouseUp={endDrag}
        onTouchMove={onMove as (e: TouchEvent) => void}
        onTouchEnd={endDrag}
      >
        {imageUrl && (
          // No CSS transform — image CSS size directly reflects zoom
          <div
            className="relative inline-block select-none shadow-2xl"
            style={{
              width:  imgW ? imgW * zoom : "auto",
              height: imgH ? imgH * zoom : "auto",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="document"
              className="block"
              draggable={false}
              style={{
                width:  imgW ? imgW * zoom : "auto",
                height: imgH ? imgH * zoom : "auto",
                maxWidth: "none",
              }}
              onLoad={(e) => {
                const el = e.currentTarget;
                setImgW(el.naturalWidth);
                setImgH(el.naturalHeight);
                // Fit to container width on first load (max 1x)
                const containerW = el.parentElement?.parentElement?.clientWidth ?? 800;
                const fitZoom = Math.min(1, (containerW - 24) / el.naturalWidth);
                setZoom(fitZoom);
              }}
            />

            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="absolute cursor-move"
                style={{
                  left:   sig.x * zoom,
                  top:    sig.y * zoom,
                  width:  sig.width * zoom,
                  height: sig.height * zoom,
                }}
                onMouseDown={(e) => startDrag(e, sig.id)}
                onTouchStart={(e) => startDrag(e, sig.id)}
              >
                <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded pointer-events-none z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sig.dataUrl}
                  alt="signature"
                  className="w-full h-full object-contain pointer-events-none block"
                  draggable={false}
                />
                <button
                  onMouseDown={(e) => { e.stopPropagation(); removeSig(sig.id); }}
                  onTouchStart={(e) => { e.stopPropagation(); removeSig(sig.id); }}
                  title="حذف"
                  className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 z-20 shadow-md"
                >✕</button>
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-blue-500 cursor-se-resize flex items-center justify-center z-20 shadow-md"
                  onMouseDown={(e) => startResize(e, sig.id)}
                  onTouchStart={(e) => startResize(e, sig.id)}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M0 8 L8 0 L8 8 Z" /></svg>
                </div>
                <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-80 pointer-events-none">
                  اسحب للتحريك
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
