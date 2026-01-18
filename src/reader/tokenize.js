import { MARKER_TYPES } from '../outline/markers.js';

export function tokenize(markers) {
  const tokens = [];
  const markerPositions = [];

  for (const marker of markers) {
    if (marker.type === MARKER_TYPES.TEXT) {
      const words = extractWords(marker.content);
      for (const word of words) {
        tokens.push({ word, index: tokens.length, isParagraphBreak: false });
      }
    } else if (marker.type === MARKER_TYPES.PARAGRAPH_BREAK) {
      // Mark the previous token as having a paragraph break after it
      if (tokens.length > 0) {
        tokens[tokens.length - 1].isParagraphBreak = true;
      }
    } else {
      // Store marker position at current token index
      markerPositions.push({
        marker,
        tokenIndex: tokens.length
      });
    }
  }

  return { tokens, markerPositions };
}

function extractWords(text) {
  // Split by whitespace, preserving punctuation
  const words = text.match(/\S+/g) || [];
  return words;
}
