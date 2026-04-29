"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import SignaturePad from "@/components/SignaturePad";
import PdfViewer from "@/components/PdfViewer";
import ImageViewer from "@/components/ImageViewer";
import { exportImage, exportPdf, SignatureOverlayItem } from "@/lib/exportUtils";
import { FileText, ImageIcon, Pen, Trash2, ArrowLeft } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [showSignPad, setShowSignPad] = useState(false);
  const [signatures, setSignatures] = useState<SignatureOverlayItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const isPdf = file?.type === "application/pdf";

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setSignatures([]);
    setCurrentPage(1);
    setNumPages(0);
  }, []);

  const handleSaveSignature = useCallback(
    (dataUrl: string, pages: number[]) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        // For PDF: width in PDF points (120 pt ≈ 1.67 inches — good signature size)
        // For image: width in original image pixels
        const initW = isPdf ? 120 : 150;
        const newSigs: SignatureOverlayItem[] = pages.map((p, idx) => ({
          id: `sig-${Date.now()}-${idx}`,
          dataUrl,
          x: 40,
          y: 40,
          width: initW,
          height: initW * aspectRatio,
          page: p,
        }));
        setSignatures((prev) => [...prev, ...newSigs]);
        setShowSignPad(false);
      };
      img.src = dataUrl;
    },
    [isPdf]
  );

  const handleExport = useCallback(async () => {
    if (!file) return;
    if (isPdf) {
      await exportPdf(file, signatures);
    } else {
      await exportImage(file, signatures);
    }
  }, [file, isPdf, signatures]);

  if (!file) {
    return <FileUpload onFileSelected={handleFileSelected} />;
  }

  const sigsByPage = signatures.reduce<Record<number, number>>((acc, s) => {
    const p = s.page ?? 1;
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const signedPages = Object.keys(sigsByPage).length;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">

      {/* Top Bar */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 gap-2">

          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => { setFile(null); setSignatures([]); }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors text-sm shrink-0"
              title="Andere Datei hochladen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Andere Datei</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-700 shrink-0" />

            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-1.5 rounded-md shrink-0 ${isPdf ? "bg-red-500/20" : "bg-green-500/20"}`}>
                {isPdf
                  ? <FileText className="w-3.5 h-3.5 text-red-400" />
                  : <ImageIcon className="w-3.5 h-3.5 text-green-400" />
                }
              </div>
              <span className="text-slate-300 text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[220px]">
                {file.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {signatures.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Pen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
                <span className="text-blue-400 text-xs sm:text-sm whitespace-nowrap">
                  {signatures.length}
                  <span className="hidden sm:inline"> Unterschrift{signatures.length !== 1 ? "en" : ""}</span>
                  {isPdf && signedPages > 0 && (
                    <span className="text-slate-400 font-normal hidden md:inline">
                      {" "}auf {signedPages} {signedPages === 1 ? "Seite" : "Seiten"}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setSignatures([])}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                  title="Alle Unterschriften löschen"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSignPad(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors text-sm font-medium"
            >
              <Pen className="w-4 h-4" />
              <span>Unterschreiben</span>
            </button>
          </div>
        </div>
      </header>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {isPdf ? (
          <PdfViewer
            file={file}
            signatures={signatures}
            onSignaturesChange={setSignatures}
            onExport={handleExport}
            onPageChange={setCurrentPage}
            onNumPagesLoaded={setNumPages}
          />
        ) : (
          <ImageViewer
            file={file}
            signatures={signatures}
            onSignaturesChange={setSignatures}
            onExport={handleExport}
          />
        )}
      </div>

      {/* Signature Pad Modal */}
      {showSignPad && (
        <SignaturePad
          onSave={handleSaveSignature}
          onClose={() => setShowSignPad(false)}
          numPages={isPdf ? numPages : 0}
          currentPage={currentPage}
        />
      )}
    </div>
  );
}
