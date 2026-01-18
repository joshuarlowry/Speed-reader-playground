import { marked } from 'marked';
import { createTextMarker, createHeadingMarker, createParagraphBreakMarker } from '../outline/markers.js';

export async function ingestMarkdown(file) {
  const text = await file.text();
  const markers = [];

  // Configure marked to use a custom renderer
  const renderer = {
    paragraph(text) {
      if (text.trim()) {
        markers.push(createTextMarker(text.trim()));
        markers.push(createParagraphBreakMarker());
      }
      return '';
    },
    heading(text, level) {
      markers.push(createHeadingMarker(level, text));
      return '';
    },
    text(text) {
      // Text nodes are handled by parent elements
      return text;
    },
    // Handle other block elements
    blockquote(text) {
      if (text.trim()) {
        markers.push(createTextMarker(text.trim()));
        markers.push(createParagraphBreakMarker());
      }
      return '';
    },
    code(text) {
      if (text.trim()) {
        markers.push(createTextMarker(text.trim()));
        markers.push(createParagraphBreakMarker());
      }
      return '';
    },
    list(body) {
      if (body.trim()) {
        markers.push(createTextMarker(body.trim()));
        markers.push(createParagraphBreakMarker());
      }
      return '';
    },
    listitem(text) {
      return text + ' ';
    }
  };

  // Parse markdown with custom renderer
  marked.use({ renderer });
  await marked.parse(text);

  return markers;
}
