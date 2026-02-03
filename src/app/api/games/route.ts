import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseGameZip } from "@/lib/parse-game-zip";
import yaml from "yaml";

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const zipFile = formData.get("files") as File | null;

  if (!name || name.trim().length === 0) {
    return Response.json({ error: "Game name is required" }, { status: 400 });
  }

  if (name.trim().length > 200) {
    return Response.json(
      { error: "Game name too long (max 200 characters)" },
      { status: 400 },
    );
  }

  const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10 MB
  if (zipFile && zipFile.size > MAX_ZIP_SIZE) {
    return Response.json(
      { error: "Zip file too large (max 10MB)" },
      { status: 400 },
    );
  }

  const game = await prisma.game.create({
    data: {
      userId,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  if (zipFile) {
    try {
      const files = await parseGameZip(zipFile);

      if (files.length > 0) {
        await prisma.gameFile.createMany({
          data: files.map((f) => ({
            gameId: game.id,
            path: f.path,
            content: f.content,
          })),
        });
      }

      // Extract and store config if present
      const configFile = files.find(
        (f) => f.path === "config.yaml" || f.path === "config.yml",
      );
      if (configFile) {
        try {
          const config = yaml.parse(configFile.content);
          await prisma.game.update({
            where: { id: game.id },
            data: { config },
          });
        } catch {
          // Config parse failed — game still created, just no config
          console.warn("Failed to parse config.yaml from zip");
        }
      }
    } catch (err) {
      console.error("Failed to parse zip file:", err);
      // Game was already created — return it anyway
    }
  }

  return Response.json({ id: game.id });
}
