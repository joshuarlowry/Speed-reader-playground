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

  // Parse OPF to get spine
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
    manifestItems[id] = opfDir + href;
  });

  // Get spine items (chapters)
  const spineItems = [];
  opfDoc.querySelectorAll('spine itemref').forEach(item => {
    const idref = item.getAttribute('idref');
    if (manifestItems[idref]) {
      spineItems.push(manifestItems[idref]);
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

    // Extract chapter title (from title tag or first h1)
    let chapterTitle = doc.querySelector('title')?.textContent || 
                      doc.querySelector('h1')?.textContent || 
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
