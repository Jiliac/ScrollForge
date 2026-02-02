#!/usr/bin/env node
/**
 * One-time migration: uploads existing local images to Supabase Storage
 * and updates Image records with storage paths.
 *
 * Also strips inline image markdown references from GameFile content,
 * since the Image table now tracks relationships via referencedIn.
 *
 * Usage:
 *   GAME_FILES_DIR=/path/to/game_files pnpm tsx scripts/migrate-images-to-storage.ts
 */

import { config } from "dotenv";
config();

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

async function main() {
  const gameFilesDir = process.env.GAME_FILES_DIR;
  if (!gameFilesDir) {
    throw new Error(
      "GAME_FILES_DIR is required. Set it to the path containing your images/ directory.",
    );
  }

  // Migrate images: upload to storage and update DB records
  const images = await prisma.image.findMany({
    where: {
      NOT: { file: { startsWith: "games/" } },
    },
  });

  console.log(`Found ${images.length} image(s) to migrate\n`);

  let uploaded = 0;
  let failed = 0;

  for (const image of images) {
    const localPath = path.join(gameFilesDir, "images", image.file);
    try {
      const buffer = await fs.readFile(localPath);
      const storagePath = await uploadImage(image.gameId, image.slug, buffer);

      await prisma.image.update({
        where: { id: image.id },
        data: { file: storagePath },
      });

      console.log(`UPLOADED: ${image.slug} -> ${storagePath}`);
      uploaded++;
    } catch (err) {
      console.error(
        `FAILED: ${image.slug} (${localPath}):`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  console.log(`\nUpload summary: ${uploaded} uploaded, ${failed} failed\n`);

  // Strip inline image markdown references from GameFile content
  const gameFiles = await prisma.gameFile.findMany({
    where: { content: { contains: "![" } },
  });

  let cleaned = 0;

  for (const gf of gameFiles) {
    const updated = gf.content.replace(
      /\n*!\[[^\]]*\]\(images\/[^)]+\)\n*/g,
      "\n",
    );
    if (updated !== gf.content) {
      await prisma.gameFile.update({
        where: { id: gf.id },
        data: { content: updated.trim() },
      });
      console.log(`CLEANED: ${gf.path}`);
      cleaned++;
    }
  }

  console.log(`\nCleaned markdown refs from ${cleaned} file(s)`);

  await prisma.$disconnect();
  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
