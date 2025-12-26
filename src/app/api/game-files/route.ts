import { promises as fs } from "fs";
import path from "path";

// Get game files directory from env or default
function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

async function readMdFilesRecursively(
  dir: string,
  baseDir: string,
): Promise<{ name: string; content: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: { name: string; content: string }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await readMdFilesRecursively(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ name: relativePath, content });
    }
  }

  return files;
}

export async function GET() {
  try {
    const gameFilesDir = getGameFilesDir();
    const files = await readMdFilesRecursively(gameFilesDir, gameFilesDir);

    return Response.json({ files });
  } catch (error) {
    console.error("Error reading game files:", error);
    return Response.json(
      { files: [], error: "Failed to read game files" },
      { status: 500 },
    );
  }
}
