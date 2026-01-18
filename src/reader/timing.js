export function calculateDelay(word, wpm, isParagraphBreak = false) {
  const base = 60000 / wpm;

  if (isParagraphBreak) {
    return 1.2 * base;
  }

  // Length factor: 1.0 for ≤6 chars, +0.03 per extra, max 1.6
  const coreWord = word.replace(/[^\w]/g, '');
  const len = coreWord.length;
  const lengthFactor = Math.min(1.6, 1.0 + Math.max(0, len - 6) * 0.03);

  // Punctuation additions
  let punctDelay = 0;
  if (/[,;:]$/.test(word)) {
    punctDelay = 0.35 * base;
  } else if (/[.!?]$/.test(word)) {
    punctDelay = 0.9 * base;
  } else if (/--|—/.test(word)) {
    punctDelay = 0.5 * base;
  }

  return base * lengthFactor + punctDelay;
}
