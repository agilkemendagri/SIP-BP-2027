/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas-pro';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

export interface GeneratePdfOptions {
  fileName: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Capture an HTML element into an HTMLCanvasElement using html2canvas-pro with fallback to modern-screenshot.
 */
async function captureElementToCanvas(
  element: HTMLElement,
  isLandscape: boolean
): Promise<HTMLCanvasElement> {
  try {
    // Attempt 1: html2canvas-pro (supports modern color models oklch, lab, color-mix)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: isLandscape ? 1280 : 960,
    });
    return canvas;
  } catch (err1) {
    console.warn('html2canvas-pro failed, falling back to modern-screenshot domToCanvas:', err1);
    try {
      // Attempt 2: modern-screenshot (native SVG foreignObject engine, unaffected by CSS parser errors)
      const canvas = await domToCanvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: isLandscape ? 1120 : 794,
      });
      return canvas;
    } catch (err2) {
      console.error('All client-side canvas renderers failed:', { err1, err2 });
      throw new Error(
        `Gagal merender dokumen ke canvas: ${err2 instanceof Error ? err2.message : String(err2)}`
      );
    }
  }
}

/**
 * Exports an HTML element directly into an A4 PDF document and triggers download.
 * Handles high-DPI scaling, custom margins, and clean formatting.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: GeneratePdfOptions
): Promise<void> {
  const { fileName, orientation = 'portrait' } = options;
  const isLandscape = orientation === 'landscape';

  // Standard A4 dimensions in millimeters
  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;

  // Render to canvas
  const canvas = await captureElementToCanvas(element, isLandscape);

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Calculate printable dimensions with 10mm margins
  const marginX = 10;
  const marginY = 10;
  const printableWidth = pdfWidth - marginX * 2;
  const printableHeight = pdfHeight - marginY * 2;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const ratio = canvasWidth / canvasHeight;

  let renderWidth = printableWidth;
  let renderHeight = renderWidth / ratio;

  // Single-page adjustment: if slightly taller than printable height (up to 25%), fit proportionally
  if (renderHeight > printableHeight && renderHeight < printableHeight * 1.25) {
    renderHeight = printableHeight;
    renderWidth = renderHeight * ratio;
  }

  // If the document is multi-page (e.g. collective list with many rows)
  if (renderHeight > printableHeight * 1.25) {
    const pageCanvasHeight = (printableHeight / printableWidth) * canvasWidth;
    let currentY = 0;
    let pageNum = 0;

    while (currentY < canvasHeight) {
      if (pageNum > 0) {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }

      // Create slice canvas for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasWidth;
      const sliceHeight = Math.min(pageCanvasHeight, canvasHeight - currentY);
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sliceHeight);
        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvasWidth,
          sliceHeight,
          0,
          0,
          canvasWidth,
          sliceHeight
        );
        const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const sliceRenderHeight = (sliceHeight / canvasWidth) * printableWidth;
        pdf.addImage(sliceData, 'JPEG', marginX, marginY, printableWidth, sliceRenderHeight);
      }

      currentY += pageCanvasHeight;
      pageNum++;
    }
  } else {
    // Single page document: centered horizontally
    const posX = (pdfWidth - renderWidth) / 2;
    const posY = marginY;
    pdf.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight);
  }

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(cleanFileName);
}
