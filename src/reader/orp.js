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
  
  // Hide word during positioning to prevent flash
  wordDisplay.style.opacity = '0';
  wordDisplay.style.visibility = 'hidden';
  
  // Reset transform first to ensure clean measurement
  wordDisplay.style.transform = 'none';
  wordDisplay.style.willChange = 'transform';
  
  wordDisplay.innerHTML = `
    <span>${escapeHtml(spans.leadingPunct)}</span>
    <span>${escapeHtml(spans.pre)}</span>
    <span class="orp">${escapeHtml(spans.orp)}</span>
    <span>${escapeHtml(spans.post)}</span>
    <span>${escapeHtml(spans.trailingPunct)}</span>
  `;

  // Use triple RAF to ensure DOM is fully rendered, layout is complete, and browser has painted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        centerORP(wordDisplay, container);
        // Show word instantly after centering - no fade animation
        wordDisplay.style.opacity = '1';
        wordDisplay.style.visibility = 'visible';
        // Force immediate display (no transition)
        wordDisplay.style.transition = 'none';
      });
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function centerORP(wordDisplay, container) {
  if (!wordDisplay || !container) return;

  // Ensure container is at base position (centered) - this should never change
  container.style.transform = 'translate(-50%, -50%)';
  container.style.willChange = 'auto'; // Container doesn't move
  
  // Ensure word-display has no transform for measurement
  wordDisplay.style.transform = 'none';
  
  // Force multiple synchronous layout recalculations to ensure everything is settled
  void container.offsetWidth;
  void wordDisplay.offsetWidth;
  void container.offsetHeight;
  void wordDisplay.offsetHeight;
  
  // Get screen center - this is our fixed anchor point
  const screenCenterX = window.innerWidth / 2;
  
  // Find the ORP span
  const spans = wordDisplay.querySelectorAll('span');
  let orpSpan = null;
  
  for (const span of spans) {
    if (span.classList.contains('orp')) {
      orpSpan = span;
      break;
    }
  }
  
  if (!orpSpan) return;
  
  // Get the ORP span's actual rendered position on screen
  const orpRect = orpSpan.getBoundingClientRect();
  const orpCenterX = orpRect.left + orpRect.width / 2;
  
  // Calculate exact offset needed to align ORP center with screen center
  const offsetNeeded = screenCenterX - orpCenterX;
  
  // Apply transform immediately with no transition
  // Use translate3d for hardware acceleration and smoother rendering
  wordDisplay.style.transform = `translate3d(${offsetNeeded}px, 0, 0)`;
  wordDisplay.style.willChange = 'transform';
  
  // Force a layout recalculation to ensure transform is applied
  void wordDisplay.offsetWidth;
}
