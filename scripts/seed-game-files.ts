/**
 * Seed game files from a local folder into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-game-files.ts <folder-path> <userId> [gameName]
 *
 * Example:
 *   npx tsx scripts/seed-game-files.ts ./game_files 4945e9a2-202b-477f-9b9e-e3b2d56b951f "Dark Bazaar"
 *
 * What it does:
 *   1. Reads all .md files recursively from the folder
 *   2. Reads config.yaml, parses it, stores as Game.config JSONB
 *   3. Creates a Game record with the given userId and name
 *   4. Upserts all .md files as GameFile rows
 */

import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

const IGNORED_DIRS = new Set(["videos", "images", "node_modules", ".git"]);

async function readMdFiles(
  dir: string,
  baseDir: string,
): Promise<{ relativePath: string; content: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: { relativePath: string; content: string }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const subFiles = await readMdFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = path
        .relative(baseDir, fullPath)
        .split(path.sep)
        .join("/");
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ relativePath, content });
    }
  }

  return files;
}

async function main() {
  const folderPath = process.argv[2];
  const userId = process.argv[3];
  const gameName = process.argv[4] || path.basename(folderPath || "game");

  if (!folderPath || !userId) {
    console.error(
      "Usage: npx tsx scripts/seed-game-files.ts <folder-path> <userId> [gameName]",
    );
    console.error(
      '\nExample: npx tsx scripts/seed-game-files.ts ./game_files 4945e9a2-202b-477f-9b9e-e3b2d56b951f "Dark Bazaar"',
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(folderPath);

  // Verify folder exists
  try {
    await fs.access(absolutePath);
  } catch {
    console.error(`Folder not found: ${absolutePath}`);
    process.exit(1);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`User not found: ${userId}`);
    process.exit(1);
  }

  console.log(`Seeding game files from: ${absolutePath}`);
  console.log(`User: ${user.email} (${userId})\n`);

  // Read config.yaml if it exists
  let config: unknown = null;
  const configPath = path.join(absolutePath, "config.yaml");
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    config = parseYaml(configContent);
    console.log("Found config.yaml, will store as Game.config");
  } catch {
    console.log("No config.yaml found, Game.config will be null");
  }

  // Create Game record
  const game = await prisma.game.create({
    data: {
      userId,
      name: gameName,
      config: config ?? undefined,
    },
  });
  console.log(`Game: ${game.id} (name: ${game.name})\n`);

  // Read all .md files
  const mdFiles = await readMdFiles(absolutePath, absolutePath);
  console.log(`Found ${mdFiles.length} .md files\n`);

  // Also seed config.yaml as a GameFile
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    await prisma.gameFile.upsert({
      where: { gameId_path: { gameId: game.id, path: "config.yaml" } },
      create: { gameId: game.id, path: "config.yaml", content: configContent },
      update: { content: configContent },
    });
    console.log("  created: config.yaml");
  } catch {
    // No config.yaml, skip
  }

  // Upsert all files
  let created = 0;
  let updated = 0;

  for (const file of mdFiles) {
    const existing = await prisma.gameFile.findUnique({
      where: { gameId_path: { gameId: game.id, path: file.relativePath } },
    });

    await prisma.gameFile.upsert({
      where: { gameId_path: { gameId: game.id, path: file.relativePath } },
      create: {
        gameId: game.id,
        path: file.relativePath,
        content: file.content,
      },
      update: { content: file.content },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }

    console.log(`  ${existing ? "updated" : "created"}: ${file.relativePath}`);
  }

  console.log(`\nDone! Created ${created}, updated ${updated} files.`);
  console.log(`Game ID: ${game.id}`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
