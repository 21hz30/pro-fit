const cachedUrls = new Map();
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pro-fit-local-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local photo storage is unavailable. Check browser storage permissions.'));
  });
}
async function photoOperation(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', mode);
      const request = operation(tx.objectStore('photos'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(new Error('Unable to save the photo. Browser storage may be full.'));
      tx.onabort = tx.onerror;
    });
  } finally { db.close(); }
}
export async function saveLocalPhoto(path, file) { await photoOperation('readwrite', (store) => store.put(file, path)); }
export async function deleteLocalPhoto(path) {
  await photoOperation('readwrite', (store) => store.delete(path));
  if (cachedUrls.has(path)) URL.revokeObjectURL(cachedUrls.get(path));
  cachedUrls.delete(path);
}
export async function localPhotoUrl(path) {
  if (!path) return null;
  if (cachedUrls.has(path)) return cachedUrls.get(path);
  const file = await photoOperation('readonly', (store) => store.get(path));
  if (!file) return null;
  const url = URL.createObjectURL(file); cachedUrls.set(path, url); return url;
}
