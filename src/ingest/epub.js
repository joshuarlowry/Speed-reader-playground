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

  // Build ordered TOC entries from NCX or NAV (includes fragment identifiers)
  const tocEntries = await parseTocEntries(zip, opfDoc, manifestItems, opfDir);

  // Get spine items (reading order)
  const spineItems = [];
  opfDoc.querySelectorAll('spine itemref').forEach(item => {
    const idref = item.getAttribute('idref');
    if (manifestItems[idref]) {
      spineItems.push(manifestItems[idref].href);
    }
  });

  // Process each spine item, inserting chapter markers based on TOC entries
  for (let i = 0; i < spineItems.length; i++) {
    const itemPath = spineItems[i];
    const htmlFile = zip.file(itemPath);
    
    if (!htmlFile) continue;

    const html = await htmlFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all TOC entries that point to this file
    const fileEntries = tocEntries.filter(entry => {
      const entryFile = entry.href.split('#')[0];
      return entryFile === itemPath || itemPath.endsWith(entryFile) || entryFile.endsWith(itemPath.split('/').pop());
    });

    // Process content with TOC-aware chapter markers
    const body = doc.body || doc.documentElement;
    processElementWithToc(body, markers, fileEntries, doc);

    // Add paragraph break between spine items (except last)
    if (i < spineItems.length - 1) {
      markers.push(createParagraphBreakMarker());
    }
  }

  return markers;
}

/**
 * Parse the table of contents (NCX for EPUB2, NAV for EPUB3) to get ordered chapter entries
 * Returns an array of { title, href, fragmentId } in reading order
 */
async function parseTocEntries(zip, opfDoc, manifestItems, opfDir) {
  const tocEntries = [];

  // Try EPUB2 NCX first (more common and reliable)
  const spine = opfDoc.querySelector('spine');
  const tocId = spine?.getAttribute('toc');
  
  if (tocId && manifestItems[tocId]) {
    const ncxPath = manifestItems[tocId].href;
    const ncxFile = zip.file(ncxPath);
    
    if (ncxFile) {
      const ncxXml = await ncxFile.async('string');
      const ncxDoc = new DOMParser().parseFromString(ncxXml, 'text/xml');
      
      // Parse navPoints in order (they have playOrder attribute)
      const navPoints = Array.from(ncxDoc.querySelectorAll('navPoint'));
      navPoints.sort((a, b) => {
        const orderA = parseInt(a.getAttribute('playOrder') || '0');
        const orderB = parseInt(b.getAttribute('playOrder') || '0');
        return orderA - orderB;
      });
      
      for (const navPoint of navPoints) {
        const label = navPoint.querySelector(':scope > navLabel > text');
        const content = navPoint.querySelector(':scope > content');
        
        if (label && content) {
          const title = label.textContent.trim();
          const src = content.getAttribute('src');
          
          if (title && src) {
            const ncxDir = ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1);
            const normalizedPath = normalizePath(ncxDir, ncxPath, src);
            const [filePath, fragmentId] = normalizedPath.split('#');
            
            tocEntries.push({
              title,
              href: normalizedPath,
              filePath,
              fragmentId: fragmentId || null
            });
          }
        }
      }
    }
  }

  // If no NCX entries, try EPUB3 NAV document
  if (tocEntries.length === 0) {
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
        
        const tocNav = navDoc.querySelector('nav[*|type="toc"], nav[epub\\:type="toc"], nav.toc');
        if (tocNav) {
          tocNav.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            const title = link.textContent.trim();
            if (href && title) {
              const normalizedPath = normalizePath(opfDir, navHref, href);
              const [filePath, fragmentId] = normalizedPath.split('#');
              
              tocEntries.push({
                title,
                href: normalizedPath,
                filePath,
                fragmentId: fragmentId || null
              });
            }
          });
        }
      }
    }
  }

  return tocEntries;
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
 * Process HTML content, inserting chapter markers based on TOC fragment IDs
 */
function processElementWithToc(element, markers, tocEntries, doc) {
  // Build a map of element IDs to TOC entries for quick lookup
  const idToTocEntry = new Map();
  for (const entry of tocEntries) {
    if (entry.fragmentId) {
      idToTocEntry.set(entry.fragmentId, entry);
    }
  }
  
  // Track which TOC entries we've used (to handle entries without fragments)
  const usedEntries = new Set();
  
  // If there are TOC entries without fragments for this file, add the first one at the start
  const noFragmentEntry = tocEntries.find(e => !e.fragmentId);
  if (noFragmentEntry) {
    markers.push(createChapterMarker(noFragmentEntry.title));
    usedEntries.add(noFragmentEntry);
  }
  
  processElementRecursive(element, markers, idToTocEntry, usedEntries);
}

function processElementRecursive(element, markers, idToTocEntry, usedEntries) {
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
      
      // Check if this element or any ancestor has an ID that matches a TOC entry
      const elementId = node.id || node.getAttribute('id');
      if (elementId && idToTocEntry.has(elementId)) {
        const tocEntry = idToTocEntry.get(elementId);
        if (!usedEntries.has(tocEntry)) {
          // Flush any pending text before the chapter marker
          if (currentText.trim()) {
            markers.push(createTextMarker(currentText.trim()));
            markers.push(createParagraphBreakMarker());
            currentText = '';
          }
          markers.push(createChapterMarker(tocEntry.title));
          usedEntries.add(tocEntry);
        }
      }
      
      // Also check for anchor elements with matching IDs
      const anchors = node.querySelectorAll('[id]');
      for (const anchor of anchors) {
        const anchorId = anchor.id || anchor.getAttribute('id');
        if (anchorId && idToTocEntry.has(anchorId) && !usedEntries.has(idToTocEntry.get(anchorId))) {
          // We'll handle this when we process that element
        }
      }

      // Handle headings - but skip if we already added a chapter marker for this
      if (tagName.match(/^h[1-4]$/)) {
        if (currentText.trim()) {
          markers.push(createTextMarker(currentText.trim()));
          markers.push(createParagraphBreakMarker());
          currentText = '';
        }
        
        // Check if this heading's ID was already used for a chapter marker
        const headingId = node.id || node.getAttribute('id');
        const alreadyMarked = headingId && idToTocEntry.has(headingId) && usedEntries.has(idToTocEntry.get(headingId));
        
        if (!alreadyMarked) {
          // Check if any child element has a TOC ID
          const childWithTocId = node.querySelector('[id]');
          const childId = childWithTocId?.id || childWithTocId?.getAttribute('id');
          const childAlreadyMarked = childId && idToTocEntry.has(childId) && usedEntries.has(idToTocEntry.get(childId));
          
          if (!childAlreadyMarked) {
            const level = parseInt(tagName.charAt(1));
            const headingText = node.textContent.replace(/\s+/g, ' ').trim();
            if (headingText) {
              markers.push(createHeadingMarker(level, headingText));
            }
          }
        }
      } else if (tagName === 'p' || tagName === 'div') {
        // Process paragraph/div content
        if (currentText.trim()) {
          markers.push(createTextMarker(currentText.trim()));
          markers.push(createParagraphBreakMarker());
          currentText = '';
        }
        processElementRecursive(node, markers, idToTocEntry, usedEntries);
      } else {
        // Other elements - process recursively
        processElementRecursive(node, markers, idToTocEntry, usedEntries);
      }
    }
  }

  // Push any remaining text
  if (currentText.trim()) {
    markers.push(createTextMarker(currentText.trim()));
  }
}
