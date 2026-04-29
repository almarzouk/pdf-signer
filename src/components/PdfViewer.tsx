"use client";

import { useCallback, useEffect, useRef, useState, MouseEvent, TouchEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Move,
  Loader2,
} from "lucide-react";

interface SignatureOverlayItem {
  id: string;
  dataUrl: string;
  /** X position in PDF points (from left edge) */
  x: number;
  /** Y position in PDF points (from top edge) */
  y: number;
  /** Width in PDF points */
  width: number;
  /** Height in PDF points */
  height: number;
  page?: number;
}

interface PdfViewerProps {
  file: File;
  signatures: SignatureOverlayItem[];
  onSignaturesChange: (sigs: SignatureOverlayItem[]) => void;
  onExport: () => void;
  onPageChange?: (page: number) => void;
  onNumPagesLoaded?: (n: number) => void;
}

export default function PdfViewer({
  file,
  signatures,
  onSignaturesChange,
  onExport,
  onPageChange,
  onNumPagesLoaded,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfRef = useRef<unknown>(null);
  // pageSize stores the natural PDF page size in points
  const pageSizeRef = useRef<{ width: number; height: number }>({ width: 595, height: 842 });

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

  const getClientXY = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const renderPage = useCallback(
    async (pdf: unknown, pageNum: number, scale: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !pdf) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page = await (pdf as any).getPage(pageNum);

        // Store natural page size in PDF points for coordinate conversion
        const naturalViewport = page.getViewport({ scale: 1 });
        pageSizeRef.current = {
          width: naturalViewport.width,
          height: naturalViewport.height,
        };

        // Render at scale × devicePixelRatio for sharp HiDPI display
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        // CSS size = PDF points × scale (no extra transform)
        canvas.style.width = `${naturalViewport.width * scale}px`;
        canvas.style.height = `${naturalViewport.height * scale}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const task = page.render({ canvasContext: ctx, viewport, intent: "display" });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "RenderingCancelledException") {
          console.error("Render error:", err);
        }
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      setLoading(true);
      setError("");
      try {
        const pdfjsLib = await import("pdfjs-dist");

        if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
          const workerUrl = new URL("/pdf.worker.min.mjs", window.location.origin).href;
          const worker = new Worker(workerUrl, { type: "module" });
          pdfjsLib.GlobalWorkerOptions.workerPort = worker;
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/standard_fonts/",
        }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        onNumPagesLoaded?.(pdf.numPages);
        setCurrentPage(1);
        onPageChange?.(1);
        setLoading(false);
        await renderPage(pdf, 1, zoom);
      } catch {
        if (!cancelled) {
          setError("PDF-Datei konnte nicht geöffnet werden");
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (!loading && pdfRef.current) {
      renderPage(pdfRef.current, currentPage, zoom);
    }
  }, [currentPage, zoom, loading, renderPage]);

  // ── Drag & Resize ──────────────────────────────────────────────
  // sig.x / sig.y are in PDF POINTS. The canvas CSS size = pageSize * zoom.
  // Screen delta → PDF points = screenDelta / zoom.

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
        // Convert screen px → PDF points
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

  const pageSigs = signatures.filter((s) => s.page === currentPage);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-xs sm:text-sm w-10 sm:w-14 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(1.2)} title="Zurücksetzen"
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); onPageChange?.(p); }}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 text-slate-300 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-slate-300 text-xs sm:text-sm tabular-nums whitespace-nowrap">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => { const p = Math.min(numPages, currentPage + 1); setCurrentPage(p); onPageChange?.(p); }}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 text-slate-300 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Download */}
          <button
            onClick={onExport}
            disabled={signatures.length === 0}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-xs sm:text-sm font-medium whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF herunterladen</span>
            <span className="inline sm:hidden">Download</span>
          </button>
        </div>

        {pageSigs.length > 0 && (
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mt-1.5">
            <Move className="w-3 h-3" />
            <span>Unterschrift verschieben — Ecke ziehen zum Vergrößern</span>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-3 sm:p-6"
        onMouseMove={onMove as (e: MouseEvent) => void}
        onMouseUp={endDrag}
        onTouchMove={onMove as (e: TouchEvent) => void}
        onTouchEnd={endDrag}
      >
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 mt-20">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Datei wird geladen...</span>
          </div>
        )}
        {error && (
          <div className="text-red-400 mt-20 text-center">
            <p className="text-xl mb-2">⚠️</p>
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          // No CSS transform — canvas CSS size already reflects zoom
          <div className="relative inline-block select-none shadow-2xl">
            <canvas ref={canvasRef} className="block" />

            {pageSigs.map((sig) => (
              <div
                key={sig.id}
                className="absolute cursor-move"
                style={{
                  // PDF points × zoom = CSS pixels
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
                  title="Unterschrift löschen"
                  className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 z-20 shadow-md"
                >✕</button>
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-blue-500 cursor-se-resize flex items-center justify-center z-20 shadow-md"
                  onMouseDown={(e) => startResize(e, sig.id)}
                  onTouchStart={(e) => startResize(e, sig.id)}
                  title="تغيير الحجم"
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
