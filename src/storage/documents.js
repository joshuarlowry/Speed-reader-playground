import { put, get, getAll, deleteItem } from './db.js';

export async function saveDocument(doc) {
  const document = {
    id: doc.id || crypto.randomUUID(),
    name: doc.name,
    type: doc.type,
    size: doc.size,
    hash: doc.hash || await hashContent(doc.content),
    addedAt: doc.addedAt || Date.now(),
    content: doc.content
  };
  await put('documents', document);
  return document.id;
}

export async function getDocument(id) {
  return await get('documents', id);
}

export async function getAllDocuments() {
  return await getAll('documents');
}

export async function deleteDocument(id) {
  await deleteItem('documents', id);
}

async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
