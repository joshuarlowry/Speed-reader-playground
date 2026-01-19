import { MARKER_TYPES } from './markers.js';

export function buildOutline(markerPositions, totalTokens) {
  const outline = [];
  let currentChapter = null;

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
    } else if (marker.type === MARKER_TYPES.HEADING) {
      // Skip headings that duplicate a nearby chapter title
      // This prevents duplicate TOC entries when both NCX and HTML have the same title
      const isDuplicate = outline.some(item => {
        // Check if there's an existing entry with similar title near this position
        const titleMatch = titlesAreSimilar(item.title, marker.title);
        const nearbyPosition = Math.abs(item.startIndex - tokenIndex) < 50; // Within 50 tokens
        return titleMatch && nearbyPosition;
      });
      
      if (!isDuplicate) {
        const heading = {
          type: 'heading',
          title: marker.title,
          level: marker.level,
          startIndex: tokenIndex,
          endIndex: nextTokenIndex
        };
        outline.push(heading);
      }
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

  // Sort outline by startIndex to ensure reading order
  outline.sort((a, b) => a.startIndex - b.startIndex);

  return outline;
}

/**
 * Check if two titles are similar enough to be considered duplicates
 */
function titlesAreSimilar(title1, title2) {
  if (!title1 || !title2) return false;
  
  // Normalize titles for comparison
  const normalize = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
  const n1 = normalize(title1);
  const n2 = normalize(title2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if they share a significant portion (e.g., "CHAPTER II" appears in both)
  const chapterMatch = n1.match(/chapter\s+[ivxlcdm\d]+/i) || n1.match(/chapter\s+\w+/i);
  const chapterMatch2 = n2.match(/chapter\s+[ivxlcdm\d]+/i) || n2.match(/chapter\s+\w+/i);
  if (chapterMatch && chapterMatch2 && chapterMatch[0] === chapterMatch2[0]) {
    return true;
  }
  
  return false;
}
