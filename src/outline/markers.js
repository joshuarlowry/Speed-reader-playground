export const MARKER_TYPES = {
  TEXT: 'text',
  CHAPTER_START: 'chapterStart',
  HEADING: 'heading',
  PARAGRAPH_BREAK: 'paragraphBreak',
  PAGE_START: 'pageStart'
};

export function createTextMarker(content) {
  return { type: MARKER_TYPES.TEXT, content };
}

export function createChapterMarker(title) {
  return { type: MARKER_TYPES.CHAPTER_START, title };
}

export function createHeadingMarker(level, title) {
  return { type: MARKER_TYPES.HEADING, level, title };
}

export function createParagraphBreakMarker() {
  return { type: MARKER_TYPES.PARAGRAPH_BREAK };
}

export function createPageMarker(page) {
  return { type: MARKER_TYPES.PAGE_START, page };
}
