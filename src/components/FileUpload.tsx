"use client";

import { useCallback, useState } from "react";
import { FileText, ImageIcon, Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

export default function FileUpload({ onFileSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowed.includes(file.type)) {
        alert("Nicht unterstütztes Format. Bitte laden Sie eine PDF-Datei oder ein Bild hoch (JPG, PNG, WEBP)");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4 sm:mb-6">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">
            Dokumente unterschreiben
          </h1>
          <p className="text-slate-400 text-sm sm:text-lg">
            PDF oder Bild hochladen und Unterschrift hinzufügen
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-14 text-center cursor-pointer group
            ${isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
              : "border-slate-600 bg-slate-800/50 hover:border-blue-500/60 hover:bg-slate-800"
            }`}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className={`transition-transform duration-300 ${isDragging ? "scale-110" : "group-hover:scale-105"}`}>
            <div className="flex justify-center gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-500/20 border border-red-400/30">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
              </div>
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-green-500/20 border border-green-400/30">
                <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="text-white font-semibold text-base sm:text-xl">
                {isDragging ? "Datei hier ablegen" : "Klicken zum Auswählen"}
              </span>
            </div>
            <p className="text-slate-400 text-sm hidden sm:block">oder Datei hierher ziehen und ablegen</p>
          </div>
        </div>

        {/* Supported formats */}
        <div className="flex justify-center flex-wrap gap-2 sm:gap-4 mt-6 sm:mt-8">
          {[
            { icon: FileText, label: "PDF", color: "text-red-400", bg: "bg-red-500/10" },
            { icon: ImageIcon, label: "JPG", color: "text-yellow-400", bg: "bg-yellow-500/10" },
            { icon: ImageIcon, label: "PNG", color: "text-green-400", bg: "bg-green-500/10" },
            { icon: ImageIcon, label: "WEBP", color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${bg} border border-white/5`}
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-slate-400 text-xs sm:text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
