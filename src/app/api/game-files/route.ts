import { checkGameAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");

  if (!gameId || gameId.length > 100) {
    return Response.json(
      { error: "gameId query parameter is required" },
      { status: 400 },
    );
  }

  const userId = await checkGameAccess(gameId);
  if (!userId) {
    return Response.json({ error: "Game not found" }, { status: 403 });
  }

  try {
    const files = await prisma.gameFile.findMany({
      where: { gameId },
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
