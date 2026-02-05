#!/usr/bin/env node
/**
 * Script to scan a local images directory and index all images in the database.
 *
 * Usage:
 *   pnpm tsx scripts/index-images.ts <gameId> [imagesDir]
 *
 * If imagesDir is not provided, defaults to GAME_FILES_DIR/images or game_files_local/images.
 */

import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Load .env file BEFORE accessing process.env
config();

// Convert filename to slug (e.g., "taverne-du-troll-ivre-interior.jpeg" -> "taverne-du-troll-ivre-interior")
function filenameToSlug(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "").toLowerCase();
}

// Extract tags from filename (e.g., "taverne-du-troll-ivre-interior" -> ["taverne", "du", "troll", "ivre", "interior"])
function extractTagsFromSlug(slug: string): string[] {
  return slug.split("-").filter(Boolean);
}

async function indexImages(): Promise<void> {
  const gameId = process.argv[2];
  const imagesDir =
    process.argv[3] ||
    path.join(
      process.env.GAME_FILES_DIR ||
        path.join(process.cwd(), "game_files_local"),
      "images",
    );

  if (!gameId) {
    console.error(
      "Usage: pnpm tsx scripts/index-images.ts <gameId> [imagesDir]",
    );
    process.exit(1);
  }

  try {
    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      console.error(`Game not found: ${gameId}`);
      process.exit(1);
    }

    console.log(`Scanning images directory: ${imagesDir}`);
    console.log(`Game: ${game.name} (${game.id})`);

    // Check if directory exists
    try {
      await fs.access(imagesDir);
    } catch {
      console.error(`Images directory not found: ${imagesDir}`);
      process.exit(1);
    }

    // Read all files in images directory
    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter((f) =>
      /\.(png|jpg|jpeg|gif|webp)$/i.test(f),
    );

    console.log(`Found ${imageFiles.length} image(s)\n`);

    let created = 0;
    let skipped = 0;

    for (const filename of imageFiles) {
      const slug = filenameToSlug(filename);
      const tags = extractTagsFromSlug(slug);

      try {
        // Check if image already exists
        const existing = await prisma.image.findFirst({
          where: { gameId, slug },
        });

        if (existing) {
          console.log(`SKIP: ${filename} (already indexed as: ${slug})`);
          skipped++;
          continue;
        }

        // Create image record
        await prisma.image.create({
          data: {
            gameId,
            slug,
            file: filename,
            prompt: `Image: ${slug}`, // Placeholder prompt
            tags: JSON.stringify(tags),
            referencedIn: "images",
          },
        });

        console.log(`CREATED: ${filename} -> slug: ${slug}`);
        created++;
      } catch (error) {
        console.error(`ERROR indexing ${filename}:`, error);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total:   ${imageFiles.length}`);

    await prisma.$disconnect();
    console.log(`\nDone!`);
  } catch (error) {
    console.error("Fatal error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
indexImages();
