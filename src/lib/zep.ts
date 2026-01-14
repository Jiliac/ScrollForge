import { ZepClient } from "@getzep/zep-cloud";

const globalForZep = globalThis as unknown as { zep: ZepClient | null };

function createZepClient(): ZepClient | null {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.warn("ZEP_API_KEY not configured - Zep memory disabled");
    return null;
  }
  return new ZepClient({ apiKey });
}

export const zep = globalForZep.zep ?? createZepClient();

if (process.env.NODE_ENV !== "production") globalForZep.zep = zep;

export function isZepEnabled(): boolean {
  return zep !== null;
}

/**
 * Ensure a Zep user exists for the given game.
 * Uses Game.id as the Zep userId.
 */
export async function ensureZepUser(gameId: string): Promise<void> {
  if (!zep) return;

  try {
    await zep.user.get(gameId);
  } catch {
    // User doesn't exist, create it
    await zep.user.add({
      userId: gameId,
      firstName: "Game",
      lastName: gameId.slice(0, 8),
    });
    console.log(`Created Zep user for game: ${gameId}`);
  }
}

/**
 * Send markdown files to Zep's knowledge graph.
 * Each file is sent as a separate data entry.
 */
export async function syncGameFilesToZep(
  gameId: string,
  files: { relativePath: string; content: string }[],
): Promise<void> {
  if (!zep) return;

  for (const file of files) {
    try {
      await zep.graph.add({
        userId: gameId,
        type: "text",
        data: `# ${file.relativePath}\n\n${file.content}`,
      });
    } catch (error) {
      console.error(`Failed to sync ${file.relativePath} to Zep:`, error);
    }
  }

  console.log(`Synced ${files.length} files to Zep for game: ${gameId}`);
}
