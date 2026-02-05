import { prisma } from "./prisma";

/**
 * Load game context from GameFile rows in the database.
 * TODO: this loads ALL files into memory. Fine for current game sizes,
 * but will need pagination or selective loading for large games.
 */
export async function loadGameContext(gameId: string): Promise<string> {
  const SKIP_FILES = new Set(["config.yaml", "style-guide.md", "system.md"]);

  const files = await prisma.gameFile.findMany({
    where: { gameId },
    orderBy: { path: "asc" },
  });

  const contextParts: string[] = [];

  for (const file of files) {
    if (SKIP_FILES.has(file.path)) continue;
    contextParts.push(`## ${file.path}\n\n${file.content}`);
  }

  return contextParts.join("\n\n---\n\n");
}
