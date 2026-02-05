import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env" });

const GAME_FILES_DIR = process.env.GAME_FILES_DIR || "game_files_local";

interface ImageEntry {
  slug: string;
  file: string;
  prompt: string;
  tags: string[];
  referencedIn: string;
}

interface ImageIndex {
  images: ImageEntry[];
}

async function main() {
  const prisma = new PrismaClient();
  const gameId = process.argv[2];

  if (!gameId) {
    console.error("Usage: npx tsx scripts/migrate-images.ts <gameId>");
    process.exit(1);
  }

  try {
    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      console.error(`Game not found: ${gameId}`);
      process.exit(1);
    }

    const indexPath = path.join(GAME_FILES_DIR, "images", "index.json");
    let index: ImageIndex;

    try {
      const content = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(content) as ImageIndex;
    } catch {
      console.log("No existing index.json found at:", indexPath);
      return;
    }

    console.log(`Found ${index.images.length} images to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const image of index.images) {
      const existing = await prisma.image.findFirst({
        where: { gameId, slug: image.slug },
      });

      if (existing) {
        console.log(`  Skipping ${image.slug} (already exists)`);
        skipped++;
        continue;
      }

      await prisma.image.create({
        data: {
          gameId,
          slug: image.slug,
          file: image.file,
          prompt: image.prompt,
          tags: JSON.stringify(image.tags),
          referencedIn: image.referencedIn,
        },
      });

      console.log(`  Migrated ${image.slug}`);
      migrated++;
    }

    console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
