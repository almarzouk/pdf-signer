"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Pen, Trash2, ChevronLeft, ChevronRight, Check, FileText } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string, pages: number[]) => void;
  onClose: () => void;
  numPages: number; // 0 = image (no page selection)
  currentPage: number;
}

export default function SignaturePad({
  onSave,
  onClose,
  numPages,
  currentPage,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState("#1e3a5f");
  const [penSize, setPenSize] = useState(2);
  const [step, setStep] = useState<"draw" | "pages">("draw");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string>("");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(
    () => new Set([currentPage])
  );
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const colors = ["#1e3a5f", "#000000", "#1d4ed8", "#dc2626", "#16a34a"];
  const sizes = [1, 2, 3, 5];

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPos.current) return;
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    },
    [isDrawing, penColor, penSize]
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const goToPageSelect = useCallback(() => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    // For images (numPages=0) skip page selection
    if (numPages === 0) {
      onSave(dataUrl, [1]);
    } else {
      setCapturedDataUrl(dataUrl);
      setStep("pages");
    }
  }, [isEmpty, numPages, onSave]);

  const confirmSave = useCallback(() => {
    if (!capturedDataUrl || selectedPages.size === 0) return;
    onSave(capturedDataUrl, Array.from(selectedPages).sort((a, b) => a - b));
  }, [capturedDataUrl, selectedPages, onSave]);

  const togglePage = (p: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
  };

  const selectNone = () => {
    setSelectedPages(new Set([currentPage]));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 600;
    canvas.height = 220;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const pageGroups: number[][] = [];
  for (let i = 1; i <= numPages; i += 10) {
    pageGroups.push(Array.from({ length: Math.min(10, numPages - i + 1) }, (_, k) => i + k));
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              {step === "draw" ? (
                <Pen className="w-5 h-5 text-blue-400" />
              ) : (
                <FileText className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">
                {step === "draw" ? "Unterschrift zeichnen" : "Seiten auswählen"}
              </h2>
              {numPages > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`w-2 h-2 rounded-full transition-colors ${step === "draw" ? "bg-blue-400" : "bg-slate-600"}`} />
                  <div className={`w-2 h-2 rounded-full transition-colors ${step === "pages" ? "bg-blue-400" : "bg-slate-600"}`} />
                  <span className="text-slate-500 text-xs mr-1">
                    {step === "draw" ? "Schritt 1 von 2" : "Schritt 2 von 2"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            ✕
          </button>
        </div>

        {/* Step 1: Draw */}
        {step === "draw" && (
          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Farbe:</span>
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${penColor === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Größe:</span>
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPenSize(s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${penSize === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                  >
                    <div className="rounded-full bg-current" style={{ width: s * 3 + 2, height: s * 3 + 2 }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-600 bg-white">
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-300 text-sm select-none">Hier unterschreiben ...</p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="w-full touch-none cursor-crosshair"
                style={{ height: "160px" }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>

            <div className="flex gap-2 sm:gap-3 justify-end">
              <button
                onClick={clear}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
              <button
                onClick={goToPageSelect}
                disabled={isEmpty}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-sm font-medium"
              >
                {numPages > 0 ? (
                  <>
                    Weiter — Seiten auswählen
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Unterschrift speichern
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Page Selection */}
        {step === "pages" && (
          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-slate-300 text-sm">Wählen Sie die Seiten aus, die Sie unterschreiben möchten</p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 rounded-md bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs transition-colors border border-blue-500/30"
                >
                  Alle ({numPages})
                </button>
                <button
                  onClick={selectNone}
                  className="px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs transition-colors"
                >
                  Keine
                </button>
              </div>
            </div>

            {/* Page grid */}
            <div className="max-h-44 sm:max-h-52 overflow-y-auto rounded-xl border border-slate-700 p-3 bg-slate-800/50">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
                  const isSelected = selectedPages.has(p);
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => togglePage(p)}
                      className={`relative flex flex-col items-center justify-center rounded-lg border-2 py-2 px-1 transition-all text-xs font-medium
                        ${isSelected
                          ? "border-blue-500 bg-blue-600/20 text-blue-300"
                          : "border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500"
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <FileText className="w-3.5 h-3.5 mb-0.5" />
                      <span>{p}</span>
                      {isCurrent && (
                        <span className="text-[8px] text-yellow-400 leading-none mt-0.5">Aktuell</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-xs sm:text-sm">
                <span className="text-blue-400 font-semibold">{selectedPages.size}</span>{" "}
                {selectedPages.size === 1 ? "Seite" : "Seiten"} ausgewählt
              </span>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setStep("draw")}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
                <button
                  onClick={confirmSave}
                  disabled={selectedPages.size === 0}
                  className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Unterschrift anwenden
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
