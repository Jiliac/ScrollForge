import { promises as fs } from "fs";
import path from "path";
import { prisma } from "./prisma";

export function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

// Get or create the Game record for current GAME_FILES_DIR
export async function getCurrentGame(): Promise<{
  id: string;
  filesDir: string;
}> {
  const filesDir = getGameFilesDir();

  const game = await prisma.game.upsert({
    where: { filesDir },
    update: {},
    create: { filesDir },
  });

  return game;
}

// Convenience: just get the ID
export async function getCurrentGameId(): Promise<string> {
  const game = await getCurrentGame();
  return game.id;
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

export async function loadGameContext(): Promise<string> {
  try {
    const gameFilesDir = getGameFilesDir();
    const files = await readMdFilesRecursively(gameFilesDir, gameFilesDir);

    const contextParts: string[] = [];

    // Files that are prompts/config, not game context
    const SKIP_FILES = new Set(["config.yaml", "style-guide.md", "system.md"]);

    for (const file of files) {
      if (SKIP_FILES.has(file.relativePath)) continue;
      contextParts.push(`## ${file.relativePath}\n\n${file.content}`);
    }

    return contextParts.join("\n\n---\n\n");
  } catch (error) {
    console.error("Error loading game context:", error);
    return "";
  }
}
