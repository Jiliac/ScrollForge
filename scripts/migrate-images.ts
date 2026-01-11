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

  try {
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

    // Get or create game for current GAME_FILES_DIR
    const game = await prisma.game.upsert({
      where: { filesDir: GAME_FILES_DIR },
      update: {},
      create: { filesDir: GAME_FILES_DIR },
    });

    for (const image of index.images) {
      const existing = await prisma.image.findFirst({
        where: { gameId: game.id, slug: image.slug },
      });

      if (existing) {
        console.log(`  Skipping ${image.slug} (already exists)`);
        skipped++;
        continue;
      }

      await prisma.image.create({
        data: {
          gameId: game.id,
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
