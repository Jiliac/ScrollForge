import path from "path";
import { prisma } from "./prisma";

/** Still needed for image serving (Phase 3) and image binary writes. */
export function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

/** Get or create the Game record for the given user. */
export async function getCurrentGame(userId: string): Promise<{
  id: string;
  filesDir: string;
}> {
  const existing = await prisma.game.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing;

  return prisma.game.create({
    data: { filesDir: getGameFilesDir(), userId },
  });
}

/** Convenience: just get the ID. */
export async function getCurrentGameId(userId: string): Promise<string> {
  const game = await getCurrentGame(userId);
  return game.id;
}

/** Load game context from GameFile rows in the database. */
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
