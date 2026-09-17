import { AppServiceError, assertResult, requireUser } from './serviceUtils.js';

const MAX_MEAL_PHOTO_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export function validateMealPhoto(file) {
  if (!file) return;
  if (!MIME_EXTENSIONS.has(file.type)) {
    throw new AppServiceError('Meal photos must be JPG, PNG, or WebP.', { code: 'INVALID_FILE_TYPE' });
  }
  if (file.size > MAX_MEAL_PHOTO_BYTES) {
    throw new AppServiceError('Meal photos must not exceed 8 MB.', { code: 'FILE_TOO_LARGE' });
  }
}

export async function uploadMealPhoto(client, dailyCheckinId, file) {
  validateMealPhoto(file);
  const user = await requireUser(client);
  const extension = MIME_EXTENSIONS.get(file.type);
  const uniquePart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${user.id}/${dailyCheckinId}/${uniquePart}.${extension}`;
  assertResult(
    await client.storage.from('meal-photos').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    }),
    'Unable to upload the meal photo.',
  );
  return path;
}

export async function removeMealPhoto(client, path) {
  if (!path) return;
  assertResult(await client.storage.from('meal-photos').remove([path]), 'Unable to remove the meal photo.');
}

export async function createMealPhotoSignedUrl(client, path, expiresIn = 600) {
  if (!path) return null;
  const data = assertResult(
    await client.storage.from('meal-photos').createSignedUrl(path, expiresIn),
    'Unable to load the meal photo.',
  );
  return data?.signedUrl || null;
}

