import JSZip from 'jszip';
import { createTextMarker, createChapterMarker, createHeadingMarker, createParagraphBreakMarker } from '../outline/markers.js';

export async function ingestEpub(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const markers = [];

  // Parse container.xml to find OPF file
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found');
  }
  const containerXml = await containerFile.async('string');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  if (!rootfile) {
    throw new Error('Invalid EPUB: rootfile not found in container.xml');
  }
  const opfPath = rootfile.getAttribute('full-path');
  if (!opfPath) {
    throw new Error('Invalid EPUB: full-path attribute not found');
  }
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  // Parse OPF to get spine and NCX reference
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }
  const opfXml = await opfFile.async('string');
  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');
  
  // Get manifest items
  const manifestItems = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    manifestItems[id] = { href: opfDir + href, mediaType };
  });

  // Build a map from content file paths to chapter titles from NCX or NAV
  const tocTitles = await parseTocTitles(zip, opfDoc, manifestItems, opfDir);

  // Get spine items (chapters)
  const spineItems = [];
  opfDoc.querySelectorAll('spine itemref').forEach(item => {
    const idref = item.getAttribute('idref');
    if (manifestItems[idref]) {
      spineItems.push(manifestItems[idref].href);
    }
  });

  // Process each spine item as a chapter
  for (let i = 0; i < spineItems.length; i++) {
    const itemPath = spineItems[i];
    const htmlFile = zip.file(itemPath);
    
    if (!htmlFile) continue;

    const html = await htmlFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Get chapter title from TOC, or fallback to HTML extraction
    let chapterTitle = getChapterTitleFromToc(itemPath, tocTitles) ||
                      extractChapterTitleFromHtml(doc) ||
                      `Chapter ${i + 1}`;
    
    markers.push(createChapterMarker(chapterTitle.trim()));

    // Process content, extracting headings and text
    const body = doc.body || doc.documentElement;
    processElement(body, markers);

    // Add paragraph break between chapters (except last)
    if (i < spineItems.length - 1) {
      markers.push(createParagraphBreakMarker());
    }
  }

  return markers;
}

/**
 * Parse the table of contents (NCX for EPUB2, NAV for EPUB3) to get chapter titles
 * Returns a map of content paths to titles
 */
async function parseTocTitles(zip, opfDoc, manifestItems, opfDir) {
  const tocTitles = new Map();

  // Try EPUB3 NAV document first
  const navItem = Object.values(manifestItems).find(item => 
    item.mediaType === 'application/xhtml+xml' && item.href.includes('nav')
  );
  
  // Also check for nav property in manifest
  let navHref = null;
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const properties = item.getAttribute('properties');
    if (properties && properties.includes('nav')) {
      const href = item.getAttribute('href');
      navHref = opfDir + href;
    }
  });

  if (navHref) {
    const navFile = zip.file(navHref);
    if (navFile) {
      const navXml = await navFile.async('string');
      const navDoc = new DOMParser().parseFromString(navXml, 'application/xhtml+xml');
      
      // Find the toc nav element
      const tocNav = navDoc.querySelector('nav[*|type="toc"], nav[epub\\:type="toc"], nav.toc');
      if (tocNav) {
        tocNav.querySelectorAll('a').forEach(link => {
          const href = link.getAttribute('href');
          const title = link.textContent.trim();
          if (href && title) {
            // Normalize the path
            const normalizedPath = normalizePath(opfDir, navHref, href);
            tocTitles.set(normalizedPath, title);
            // Also store without fragment
            const pathWithoutFragment = normalizedPath.split('#')[0];
            if (!tocTitles.has(pathWithoutFragment)) {
              tocTitles.set(pathWithoutFragment, title);
            }
          }
        });
      }
    }
  }

  // Try EPUB2 NCX
  const spine = opfDoc.querySelector('spine');
  const tocId = spine?.getAttribute('toc');
  
  if (tocId && manifestItems[tocId]) {
    const ncxPath = manifestItems[tocId].href;
    const ncxFile = zip.file(ncxPath);
    
    if (ncxFile) {
      const ncxXml = await ncxFile.async('string');
      const ncxDoc = new DOMParser().parseFromString(ncxXml, 'text/xml');
      
      // Parse navPoints
      ncxDoc.querySelectorAll('navPoint').forEach(navPoint => {
        const label = navPoint.querySelector('navLabel > text');
        const content = navPoint.querySelector('content');
        
        if (label && content) {
          const title = label.textContent.trim();
          const src = content.getAttribute('src');
          
          if (title && src) {
            // Normalize the path relative to the NCX location
            const ncxDir = ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1);
            const normalizedPath = normalizePath(ncxDir, ncxPath, src);
            tocTitles.set(normalizedPath, title);
            // Also store without fragment
            const pathWithoutFragment = normalizedPath.split('#')[0];
            if (!tocTitles.has(pathWithoutFragment)) {
              tocTitles.set(pathWithoutFragment, title);
            }
          }
        }
      });
    }
  }

  return tocTitles;
}

/**
 * Normalize a path relative to a base document
 */
function normalizePath(baseDir, basePath, href) {
  // Handle absolute paths
  if (href.startsWith('/')) {
    return href.substring(1);
  }
  
  // Handle relative paths
  const hrefParts = href.split('/');
  const baseDirParts = baseDir.split('/').filter(p => p);
  
  const resultParts = [...baseDirParts];
  
  for (const part of hrefParts) {
    if (part === '..') {
      resultParts.pop();
    } else if (part !== '.') {
      resultParts.push(part);
    }
  }
  
  return resultParts.join('/');
}

/**
 * Get chapter title from TOC map
 */
function getChapterTitleFromToc(itemPath, tocTitles) {
  // Try exact match first
  if (tocTitles.has(itemPath)) {
    return tocTitles.get(itemPath);
  }
  
  // Try without leading directory
  const filename = itemPath.split('/').pop();
  for (const [path, title] of tocTitles) {
    if (path.endsWith(filename) || path.split('/').pop() === filename) {
      return title;
    }
  }
  
  // Try matching just the filename without fragment
  const filenameWithoutFragment = filename.split('#')[0];
  for (const [path, title] of tocTitles) {
    const pathFilename = path.split('/').pop().split('#')[0];
    if (pathFilename === filenameWithoutFragment) {
      return title;
    }
  }
  
  return null;
}

/**
 * Extract chapter title from HTML content using various strategies
 */
function extractChapterTitleFromHtml(doc) {
  // Strategy 1: Look for common chapter title classes
  const chapterTitleSelectors = [
    '.chapter-title',
    '.body_chapter-title',
    '.chapter-header',
    '.chaptertitle',
    '[class*="chapter-title"]',
    '[class*="chaptertitle"]',
    'h1.chapter',
    'h2.chapter'
  ];
  
  for (const selector of chapterTitleSelectors) {
    const el = doc.querySelector(selector);
    if (el) {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
  }
  
  // Strategy 2: Look for h1 or h2 that looks like a chapter title
  const headings = doc.querySelectorAll('h1, h2');
  for (const heading of headings) {
    const text = heading.textContent.replace(/\s+/g, ' ').trim();
    // Skip generic or metadata headings
    if (text && 
        !text.toLowerCase().includes('project gutenberg') &&
        !text.toLowerCase().includes('table of contents') &&
        !text.toLowerCase().includes('copyright') &&
        text.length > 0 && text.length < 200) {
      return text;
    }
  }
  
  // Strategy 3: Check title tag (but skip generic epub filenames)
  const titleEl = doc.querySelector('title');
  if (titleEl) {
    const title = titleEl.textContent.trim();
    // Skip titles that look like auto-generated filenames
    if (title && 
        !title.match(/^[\w_-]+_epub-\d+$/i) &&
        !title.match(/^part\d+/i) &&
        !title.match(/^section\d+/i) &&
        title.length > 0 && title.length < 200) {
      return title;
    }
  }
  
  return null;
}

function processElement(element, markers) {
  const children = Array.from(element.childNodes);
  let currentText = '';

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        currentText += text + ' ';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Handle headings
      if (tagName.match(/^h[1-4]$/)) {
        if (currentText.trim()) {
          markers.push(createTextMarker(currentText.trim()));
          markers.push(createParagraphBreakMarker());
          currentText = '';
        }
        const level = parseInt(tagName.charAt(1));
        const headingText = node.textContent.trim();
        if (headingText) {
          markers.push(createHeadingMarker(level, headingText));
        }
      } else if (tagName === 'p' || tagName === 'div') {
        // Process paragraph/div content
        if (currentText.trim()) {
          markers.push(createTextMarker(currentText.trim()));
          markers.push(createParagraphBreakMarker());
          currentText = '';
        }
        processElement(node, markers);
      } else {
        // Other elements - process recursively
        processElement(node, markers);
      }
    }
  }

  // Push any remaining text
  if (currentText.trim()) {
    markers.push(createTextMarker(currentText.trim()));
  }
}
