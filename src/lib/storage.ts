import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "game-images";

let _client: ReturnType<typeof createClient> | null = null;

function getStorageClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY",
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

function sanitizeSlug(slug: string): string {
  const safe = slug.replace(/[^a-z0-9_-]/gi, "");
  if (!safe) throw new Error(`Invalid image slug: "${slug}"`);
  return safe;
}

function validateGameId(gameId: string): string {
  if (!gameId || /[^a-z0-9_-]/i.test(gameId)) {
    throw new Error(`Invalid gameId: "${gameId}"`);
  }
  return gameId;
}

function validateStoragePath(storagePath: string): string {
  if (!storagePath.startsWith("games/") || storagePath.includes("..")) {
    throw new Error(`Invalid storage path: "${storagePath}"`);
  }
  return storagePath;
}

function storageKey(gameId: string, slug: string): string {
  return `games/${validateGameId(gameId)}/images/${sanitizeSlug(slug)}.jpeg`;
}

/**
 * Get the public CDN URL for a storage path.
 * Pure string concatenation — no API call.
 */
export function getImageUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${validateStoragePath(storagePath)}`;
}

/**
 * Upload an image to Supabase Storage.
 * Returns the storage path (not the URL).
 */
export async function uploadImage(
  gameId: string,
  slug: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = getStorageClient();
  const key = storageKey(gameId, slug);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return key;
}

/**
 * Delete an image from Supabase Storage.
 */
export async function deleteImage(storagePath: string): Promise<void> {
  validateStoragePath(storagePath);
  const supabase = getStorageClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
