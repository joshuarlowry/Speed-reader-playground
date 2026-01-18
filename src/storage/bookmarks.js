import { put, get, getAll, deleteItem } from './db.js';
import { getStore } from './db.js';

export async function createBookmark(docId, tokenIndex, preview) {
  const bookmark = {
    docId,
    tokenIndex,
    preview: preview || '',
    createdAt: Date.now()
  };
  const id = await put('bookmarks', bookmark);
  return { ...bookmark, id };
}

export async function getBookmark(id) {
  return await get('bookmarks', id);
}

export async function getBookmarksForDocument(docId) {
  const store = await getStore('bookmarks');
  const index = store.index('docId');
  return new Promise((resolve, reject) => {
    const request = index.getAll(docId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllBookmarks() {
  return await getAll('bookmarks');
}

export async function deleteBookmark(id) {
  await deleteItem('bookmarks', id);
}
