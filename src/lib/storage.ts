import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "game-images";

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function storageKey(gameId: string, slug: string): string {
  return `games/${gameId}/images/${slug}.jpeg`;
}

/**
 * Get the public CDN URL for a storage path.
 * Pure string concatenation — no API call.
 */
export function getImageUrl(storagePath: string): string {
  const supabase = getStorageClient();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  return data.publicUrl;
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

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(key, buffer, {
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
