import JSZip from "jszip";

type ParsedFile = {
  path: string;
  content: string;
};

const ALLOWED_EXTENSIONS = new Set([".md", ".yaml", ".yml"]);

/**
 * Parse a zip file and extract text files (.md, .yaml, .yml).
 * Strips a common root directory prefix if all files share one.
 */
export async function parseGameZip(file: File | Blob): Promise<ParsedFile[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const files: ParsedFile[] = [];

  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Skip hidden files, macOS resource forks, and path traversal attempts
    if (
      relativePath.startsWith(".") ||
      relativePath.includes("__MACOSX") ||
      relativePath.includes("..")
    )
      continue;

    const ext = relativePath.substring(relativePath.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.has(ext.toLowerCase())) continue;

    const content = await entry.async("string");
    files.push({ path: relativePath, content });
  }

  // Strip common root directory prefix
  if (files.length > 0) {
    const parts = files[0].path.split("/");
    if (parts.length > 1) {
      const prefix = parts[0] + "/";
      const allSharePrefix = files.every((f) => f.path.startsWith(prefix));
      if (allSharePrefix) {
        for (const f of files) {
          f.path = f.path.slice(prefix.length);
        }
      }
    }
  }

  // Normalize paths: strip leading ./ or /
  for (const f of files) {
    f.path = f.path.replace(/^\.\//, "").replace(/^\//, "");
  }

  return files;
}
