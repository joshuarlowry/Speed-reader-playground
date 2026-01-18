import { put, get, deleteItem } from './db.js';

export async function saveProgress(docId, tokenIndex, anchorWindow) {
  const progress = {
    docId,
    tokenIndex,
    anchorWindow,
    updatedAt: Date.now()
  };
  await put('progress', progress);
}

export async function getProgress(docId) {
  return await get('progress', docId);
}

export async function deleteProgress(docId) {
  await deleteItem('progress', docId);
}
