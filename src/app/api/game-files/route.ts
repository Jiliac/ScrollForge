import { getCurrentGame } from "@/lib/game-files";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await requireUserId();

  try {
    const game = await getCurrentGame(userId);
    const files = await prisma.gameFile.findMany({
      where: { gameId: game.id },
      orderBy: { path: "asc" },
    });

    return Response.json({
      files: files.map((f) => ({ name: f.path, content: f.content })),
    });
  } catch (error) {
    console.error("Error reading game files:", error);
    return Response.json(
      { files: [], error: "Failed to read game files" },
      { status: 500 },
    );
  }
}
