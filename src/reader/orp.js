export function calculateORPIndex(word) {
  // Strip leading/trailing punctuation for ORP calculation only
  const coreWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
  const len = coreWord.length;

  if (len <= 1) return 0;
  if (len >= 2 && len <= 5) return 1;
  if (len >= 6 && len <= 9) return 2;
  if (len >= 10 && len <= 13) return 3;
  return 4; // 14+
}

export function buildWordSpans(word) {
  const orpIndex = calculateORPIndex(word);
  const coreWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
  
  // Find leading punctuation
  const leadingMatch = word.match(/^[^\w]+/);
  const leadingPunct = leadingMatch ? leadingMatch[0] : '';
  
  // Find trailing punctuation
  const trailingMatch = word.match(/[^\w]+$/);
  const trailingPunct = trailingMatch ? trailingMatch[0] : '';
  
  // Split core word
  const pre = coreWord.substring(0, orpIndex);
  const orp = coreWord.substring(orpIndex, orpIndex + 1);
  const post = coreWord.substring(orpIndex + 1);

  return {
    leadingPunct,
    pre,
    orp,
    post,
    trailingPunct
  };
}

export function renderWord(word, container) {
  const spans = buildWordSpans(word);
  
  const wordDisplay = container.querySelector('.word-display');
  if (!wordDisplay) return;
  
  wordDisplay.innerHTML = `
    <span>${escapeHtml(spans.leadingPunct)}</span>
    <span>${escapeHtml(spans.pre)}</span>
    <span class="orp">${escapeHtml(spans.orp)}</span>
    <span>${escapeHtml(spans.post)}</span>
    <span>${escapeHtml(spans.trailingPunct)}</span>
  `;

  // Center ORP after rendering
  requestAnimationFrame(() => centerORP(wordDisplay, container));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function centerORP(wordDisplay, container) {
  if (!wordDisplay || !container) return;

  // Get computed font
  const computedStyle = window.getComputedStyle(wordDisplay);
  const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

  // Create canvas for measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;

  // Measure widths
  const spans = wordDisplay.querySelectorAll('span');
  let leadingWidth = 0;
  let orpWidth = 0;
  let foundORP = false;

  for (const span of spans) {
    const text = span.textContent;
    const width = ctx.measureText(text).width;

    if (span.classList.contains('orp')) {
      orpWidth = width;
      foundORP = true;
      break;
    } else {
      leadingWidth += width;
    }
  }

  if (!foundORP) return;

  // Calculate offset
  const anchorX = window.innerWidth / 2;
  const xOffset = anchorX - (leadingWidth + orpWidth / 2);

  // Apply transform to container
  container.style.transform = `translateX(${xOffset}px)`;
}
