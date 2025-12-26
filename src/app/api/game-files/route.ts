import { promises as fs } from "fs";
import path from "path";

// Get game files directory from env or default
function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

export async function GET() {
  try {
    const gameFilesDir = getGameFilesDir();
    const entries = await fs.readdir(gameFilesDir, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map(async (entry) => {
          const filePath = path.join(gameFilesDir, entry.name);
          const content = await fs.readFile(filePath, "utf-8");
          return {
            name: entry.name,
            content,
          };
        }),
    );

    return Response.json({ files });
  } catch (error) {
    console.error("Error reading game files:", error);
    return Response.json(
      { files: [], error: "Failed to read game files" },
      { status: 500 },
    );
  }
}
