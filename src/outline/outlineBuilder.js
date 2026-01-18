import { MARKER_TYPES } from './markers.js';

export function buildOutline(markerPositions, totalTokens) {
  const outline = [];
  let currentChapter = null;
  let currentHeading = null;

  for (let i = 0; i < markerPositions.length; i++) {
    const { marker, tokenIndex } = markerPositions[i];
    const nextTokenIndex = i + 1 < markerPositions.length 
      ? markerPositions[i + 1].tokenIndex 
      : totalTokens;

    if (marker.type === MARKER_TYPES.CHAPTER_START) {
      // Close previous chapter if exists
      if (currentChapter) {
        currentChapter.endIndex = tokenIndex;
      }
      // Start new chapter
      currentChapter = {
        type: 'chapter',
        title: marker.title,
        level: 0,
        startIndex: tokenIndex,
        endIndex: nextTokenIndex
      };
      outline.push(currentChapter);
      currentHeading = null;
    } else if (marker.type === MARKER_TYPES.HEADING) {
      const heading = {
        type: 'heading',
        title: marker.title,
        level: marker.level,
        startIndex: tokenIndex,
        endIndex: nextTokenIndex
      };
      outline.push(heading);
      currentHeading = heading;
    }
  }

  // Close last chapter if exists
  if (currentChapter && currentChapter.endIndex === undefined) {
    currentChapter.endIndex = totalTokens;
  }

  // Close any headings that don't have endIndex set
  for (const item of outline) {
    if (item.endIndex === undefined) {
      item.endIndex = totalTokens;
    }
  }

  return outline;
}
