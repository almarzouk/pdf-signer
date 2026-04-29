export interface SignatureOverlayItem {
  id: string;
  dataUrl: string;
  /**
   * For PDF: position in PDF points from the top-left of the page.
   * For images: position in original image pixels from top-left.
   */
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

/**
 * Export an image file with signatures burned in.
 * sig.x/y/width/height are in original image pixel coordinates.
 */
export async function exportImage(
  file: File,
  signatures: SignatureOverlayItem[]
): Promise<void> {
  const imageBitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(imageBitmap, 0, 0);

  for (const sig of signatures) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Draw at exact image-pixel coordinates — no scaling needed
        ctx.drawImage(img, sig.x, sig.y, sig.width, sig.height);
        resolve();
      };
      img.src = sig.dataUrl;
    });
  }

  const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const ext = file.type === "image/jpeg" ? "jpg" : (file.type.split("/")[1] || "png");

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}_signed.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, mimeType, 0.95);
}

/**
 * Export a PDF file with signatures embedded via pdf-lib.
 * sig.x/y/width/height are in PDF points (from TOP of page).
 * pdf-lib uses bottom-left origin, so we flip the Y axis.
 */
export async function exportPdf(
  file: File,
  signatures: SignatureOverlayItem[]
): Promise<void> {
  const { PDFDocument } = await import("pdf-lib");

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    const pageIndex = (sig.page ?? 1) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pdfH } = page.getSize();

    const pngBytes = dataUrlToUint8Array(sig.dataUrl);
    const sigImage = await pdfDoc.embedPng(pngBytes);

    // sig.x/y are in PDF points from TOP-LEFT (screen convention)
    // pdf-lib uses BOTTOM-LEFT origin, so flip Y:
    const pdfY = pdfH - sig.y - sig.height;

    page.drawImage(sigImage, {
      x: sig.x,
      y: pdfY,
      width: sig.width,
      height: sig.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${file.name.replace(/\.pdf$/i, "")}_signed.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
