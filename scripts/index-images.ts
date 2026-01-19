#!/usr/bin/env node
/**
 * Script to scan game_files/images directory and index all images in the database
 * Usage: pnpm tsx scripts/index-images.ts
 */

import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Load .env file BEFORE accessing process.env
config();

function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

// Convert filename to slug (e.g., "taverne-du-troll-ivre-interior.jpeg" -> "taverne-du-troll-ivre-interior")
function filenameToSlug(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "").toLowerCase();
}

// Extract tags from filename (e.g., "taverne-du-troll-ivre-interior" -> ["taverne", "du", "troll", "ivre", "interior"])
function extractTagsFromSlug(slug: string): string[] {
  return slug.split("-").filter(Boolean);
}

async function indexImages(): Promise<void> {
  try {
    const gameFilesDir = getGameFilesDir();
    const imagesDir = path.join(gameFilesDir, "images");

    console.log(`📁 Scanning images directory: ${imagesDir}`);

    // Check if directory exists
    try {
      await fs.access(imagesDir);
    } catch {
      console.error(`❌ Images directory not found: ${imagesDir}`);
      process.exit(1);
    }

    // Get current game ID
    const game = await prisma.game.upsert({
      where: { filesDir: gameFilesDir },
      update: {},
      create: { filesDir: gameFilesDir },
    });

    console.log(`🎮 Using Game ID: ${game.id}`);

    // Read all files in images directory
    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter((f) =>
      /\.(png|jpg|jpeg|gif|webp)$/i.test(f)
    );

    console.log(`📷 Found ${imageFiles.length} image(s)\n`);

    let created = 0;
    let skipped = 0;

    for (const filename of imageFiles) {
      const slug = filenameToSlug(filename);
      const tags = extractTagsFromSlug(slug);

      try {
        // Check if image already exists
        const existing = await prisma.image.findFirst({
          where: { gameId: game.id, slug },
        });

        if (existing) {
          console.log(`SKIP: ${filename} (already indexed as: ${slug})`);
          skipped++;
          continue;
        }

        // Create image record
        await prisma.image.create({
          data: {
            gameId: game.id,
            slug,
            file: filename,
            prompt: `Image: ${slug}`, // Placeholder prompt
            tags: JSON.stringify(tags),
            referencedIn: "images", // Could be more specific
          },
        });

        console.log(`CREATED: ${filename} → slug: ${slug}`);
        created++;
      } catch (error) {
        console.error(`ERROR indexing ${filename}:`, error);
      }
    }

    console.log(`\n Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${imageFiles.length}`);

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
