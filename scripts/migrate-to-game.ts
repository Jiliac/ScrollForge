import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env" });

const GAME_FILES_DIR = process.env.GAME_FILES_DIR || "game_files_local";

async function main() {
  const prisma = new PrismaClient();

  try {
    // Create or get the game for the current GAME_FILES_DIR
    const game = await prisma.game.upsert({
      where: { filesDir: GAME_FILES_DIR },
      update: {},
      create: { filesDir: GAME_FILES_DIR },
    });

    console.log(`Game: ${game.id} (${game.filesDir})`);

    // Update all images without a gameId
    const imageResult = await prisma.image.updateMany({
      where: { gameId: null },
      data: { gameId: game.id },
    });
    console.log(`Updated ${imageResult.count} images`);

    // Update all conversations without a gameId
    const conversationResult = await prisma.conversation.updateMany({
      where: { gameId: null },
      data: { gameId: game.id },
    });
    console.log(`Updated ${conversationResult.count} conversations`);

    console.log("\nMigration complete!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
