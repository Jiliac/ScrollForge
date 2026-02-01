/**
 * Normalize agent-supplied file paths for use as DB keys.
 * Strips leading "./" and "/", collapses double slashes, removes trailing slashes.
 */
export function normalizeGameFilePath(raw: string): string {
  return raw
    .replace(/^\.\//, "") // strip leading ./
    .replace(/^\/+/, "") // strip leading /
    .replace(/\/\/+/g, "/") // collapse double slashes
    .replace(/\/+$/, ""); // strip trailing /
}
