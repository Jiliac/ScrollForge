/**
 * Normalize agent-supplied file paths for use as virtual DB keys (GameFile.path).
 * These paths are NOT used for filesystem access — they are composite-key
 * components scoped to a gameId, so ".." segments cannot traverse anything.
 * Strips leading "./" and "/", collapses double slashes, removes trailing slashes.
 */
export function normalizeGameFilePath(raw: string): string {
  return raw
    .replace(/^\.\//, "") // strip leading ./
    .replace(/^\/+/, "") // strip leading /
    .replace(/\/\/+/g, "/") // collapse double slashes
    .replace(/\/+$/, ""); // strip trailing /
}
