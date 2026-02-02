import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "game-images";

let _client: ReturnType<typeof createClient> | null = null;

function getStorageClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
  }
  return _client;
}

function sanitizeSlug(slug: string): string {
  const safe = slug.replace(/[^a-z0-9_-]/gi, "");
  if (!safe) throw new Error(`Invalid image slug: "${slug}"`);
  return safe;
}

function storageKey(gameId: string, slug: string): string {
  return `games/${gameId}/images/${sanitizeSlug(slug)}.jpeg`;
}

/**
 * Get the public CDN URL for a storage path.
 * Pure string concatenation — no API call.
 */
export function getImageUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
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
  const supabase = getStorageClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
