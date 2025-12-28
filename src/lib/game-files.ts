import { promises as fs } from "fs";
import path from "path";

export function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

export async function readMdFilesRecursively(
  dir: string,
  baseDir: string,
): Promise<{ relativePath: string; content: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: { relativePath: string; content: string }[] = [];

  const IGNORED_DIRS = new Set(["videos", "images"]);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const subFiles = await readMdFilesRecursively(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ relativePath, content });
    }
  }

  return files;
}

export async function loadGameContext(): Promise<{
  system: string;
  context: string;
}> {
  try {
    const gameFilesDir = getGameFilesDir();
    const files = await readMdFilesRecursively(gameFilesDir, gameFilesDir);

    let system = "";
    const contextParts: string[] = [];

    for (const file of files) {
      if (file.relativePath === "system.md") {
        system = file.content;
      } else {
        contextParts.push(`## ${file.relativePath}\n\n${file.content}`);
      }
    }

    return {
      system,
      context: contextParts.join("\n\n---\n\n"),
    };
  } catch (error) {
    console.error("Error loading game context:", error);
    return { system: "", context: "" };
  }
}
