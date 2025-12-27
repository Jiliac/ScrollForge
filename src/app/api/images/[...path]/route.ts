import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";

function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const imagePath = pathSegments.join("/");

  // Only allow serving from images/ subdirectory
  if (!imagePath || imagePath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const fullPath = path.join(getGameFilesDir(), "images", imagePath);

  try {
    const file = await fs.readFile(fullPath);

    // Determine content type from extension
    const ext = path.extname(imagePath).toLowerCase();
    const contentType =
      ext === ".jpeg" || ext === ".jpg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".webp"
              ? "image/webp"
              : "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
