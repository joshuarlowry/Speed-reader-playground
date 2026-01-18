import * as pdfjsLib from 'pdfjs-dist';
import { createTextMarker, createPageMarker, createParagraphBreakMarker } from '../outline/markers.js';

// Set worker path - Vite handles worker bundling automatically
// In production, the worker will be in assets/ with a hash
// We'll use a dynamic import to get the correct path
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function ingestPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const markers = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    markers.push(createPageMarker(pageNum));
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    let pageText = '';
    let lastY = null;

    for (const item of textContent.items) {
      if (item.str) {
        // Detect paragraph breaks by Y position changes
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          if (pageText.trim()) {
            markers.push(createTextMarker(pageText.trim()));
            markers.push(createParagraphBreakMarker());
            pageText = '';
          }
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
    }

    if (pageText.trim()) {
      markers.push(createTextMarker(pageText.trim()));
      if (pageNum < pdf.numPages) {
        markers.push(createParagraphBreakMarker());
      }
    }
  }

  return markers;
}
