import path from "path";
import { prisma } from "./prisma";

/** Still needed for image serving (Phase 3) and image binary writes. */
export function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

/** Get or create the Game record for the current GAME_FILES_DIR + userId. */
export async function getCurrentGame(userId: string): Promise<{
  id: string;
  filesDir: string;
}> {
  const filesDir = getGameFilesDir();

  const game = await prisma.game.upsert({
    where: { filesDir },
    update: {},
    create: { filesDir, userId },
  });

  return game;
}

/** Convenience: just get the ID. */
export async function getCurrentGameId(userId: string): Promise<string> {
  const game = await getCurrentGame(userId);
  return game.id;
}

/** Load game context from GameFile rows in the database. */
export async function loadGameContext(gameId: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error("Error loading game context:", error);
    return "";
  }
}
