/**
 * Sync existing game files to Zep knowledge graph.
 *
 * Usage: pnpm tsx scripts/sync-zep.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  ensureZepUser,
  syncGameFilesToZep,
  isZepEnabled,
} from "../src/lib/zep";
import { readMdFilesRecursively, getGameFilesDir } from "../src/lib/game-files";

async function main() {
  if (!isZepEnabled()) {
    console.error("ZEP_API_KEY not configured");
    process.exit(1);
  }

  const filesDir = getGameFilesDir();
  console.log(`Game files dir: ${filesDir}`);

  // Get or create game
  const game = await prisma.game.upsert({
    where: { filesDir },
    update: {},
    create: { filesDir },
  });
  console.log(`Game ID: ${game.id}`);

  // Ensure Zep user exists
  await ensureZepUser(game.id);

  // Read and sync all markdown files
  const files = await readMdFilesRecursively(filesDir, filesDir);
  console.log(`Found ${files.length} markdown files`);

  await syncGameFilesToZep(game.id, files);

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
