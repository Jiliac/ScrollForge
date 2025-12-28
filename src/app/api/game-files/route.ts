import { getGameFilesDir, readMdFilesRecursively } from "@/lib/game-files";

export async function GET() {
  try {
    const gameFilesDir = getGameFilesDir();
    const files = await readMdFilesRecursively(gameFilesDir, gameFilesDir);

    return Response.json({
      files: files.map((f) => ({ name: f.relativePath, content: f.content })),
    });
  } catch (error) {
    console.error("Error reading game files:", error);
    return Response.json(
      { files: [], error: "Failed to read game files" },
      { status: 500 },
    );
  }
}
