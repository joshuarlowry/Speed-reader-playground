import { createTextMarker, createParagraphBreakMarker } from '../outline/markers.js';

export async function ingestTxt(file) {
  const text = await file.text();
  const markers = [];

  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    if (para) {
      markers.push(createTextMarker(para));
      if (i < paragraphs.length - 1) {
        markers.push(createParagraphBreakMarker());
      }
    }
  }

  return markers;
}
