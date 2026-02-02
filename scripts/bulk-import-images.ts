#!/usr/bin/env node
/**
 * Bulk import: reads local .jpeg files, creates Image DB records for any
 * that don't already exist, and uploads all to Supabase Storage.
 *
 * Usage:
 *   pnpm tsx scripts/bulk-import-images.ts <images-dir> <game-id>
 *
 * Example:
 *   pnpm tsx scripts/bulk-import-images.ts ~/Documents/notes_jiliac_labs/Fantasy/Islamic/images cml2hjh280000dgdxe3b3cscu
 */

import { config } from "dotenv";
config();

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

async function main() {
  const [imagesDir, gameId] = process.argv.slice(2);

  if (!imagesDir || !gameId) {
    console.error(
      "Usage: pnpm tsx scripts/bulk-import-images.ts <images-dir> <game-id>",
    );
    process.exit(1);
  }

  const resolvedDir = path.resolve(imagesDir);

  // Verify directory exists
  const stat = await fs.stat(resolvedDir);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${resolvedDir}`);
  }

  // List all .jpeg files
  const files = (await fs.readdir(resolvedDir)).filter((f) =>
    f.endsWith(".jpeg"),
  );
  console.log(`Found ${files.length} .jpeg file(s) in ${resolvedDir}\n`);

  if (files.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Verify game exists
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  // Get existing slugs from DB
  const existingImages = await prisma.image.findMany({
    where: { gameId },
    select: { slug: true, file: true },
  });
  const existingSlugs = new Map(
    existingImages.map((img) => [img.slug, img.file]),
  );
  console.log(`${existingSlugs.size} image(s) already in DB\n`);

  let dbCreated = 0;
  let uploaded = 0;
  let skippedStorage = 0;
  let failed = 0;

  for (const file of files) {
    const slug = path.basename(file, ".jpeg");
    const localPath = path.join(resolvedDir, file);

    try {
      const buffer = await fs.readFile(localPath);

      // 1. Create DB record if it doesn't exist
      const existingFile = existingSlugs.get(slug);
      if (!existingFile) {
        await prisma.image.create({
          data: {
            gameId,
            slug,
            file: "", // placeholder, updated after upload
            prompt: "",
            tags: "[]",
            referencedIn: "",
          },
        });
        dbCreated++;
        console.log(`DB CREATE: ${slug}`);
      } else {
        console.log(`DB EXISTS: ${slug}`);
      }

      // 2. Upload to storage (unless already has a valid storage path)
      const alreadyInStorage =
        existingFile && existingFile.startsWith("games/");

      if (alreadyInStorage) {
        console.log(`  STORAGE SKIP: already at ${existingFile}`);
        skippedStorage++;
        continue;
      }

      const storagePath = await uploadImage(gameId, slug, buffer);

      // 3. Update DB record with storage path
      await prisma.image.update({
        where: { gameId_slug: { gameId, slug } },
        data: { file: storagePath },
      });

      console.log(`  UPLOADED: ${storagePath}`);
      uploaded++;
    } catch (err) {
      console.error(
        `FAILED: ${slug} — ${err instanceof Error ? err.message : err}`,
      );
      failed++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`DB records created: ${dbCreated}`);
  console.log(`Uploaded to storage: ${uploaded}`);
  console.log(`Already in storage: ${skippedStorage}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
