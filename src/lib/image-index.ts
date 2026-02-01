import { prisma } from "./prisma";
import type { Image } from "@/generated/prisma/client";

export interface ImageEntry {
  slug: string;
  file: string;
  prompt: string;
  tags: string[];
  referencedIn: string;
}

function dbToEntry(image: Image): ImageEntry {
  return {
    slug: image.slug,
    file: image.file,
    prompt: image.prompt,
    tags: JSON.parse(image.tags) as string[],
    referencedIn: image.referencedIn,
  };
}

export async function createImage(
  gameId: string,
  entry: ImageEntry,
): Promise<Image> {
  return prisma.image.create({
    data: {
      gameId,
      slug: entry.slug,
      file: entry.file,
      prompt: entry.prompt,
      tags: JSON.stringify(entry.tags),
      referencedIn: entry.referencedIn,
    },
  });
}

export async function getImageBySlug(
  gameId: string,
  slug: string,
): Promise<ImageEntry | null> {
  const image = await prisma.image.findFirst({
    where: { gameId, slug },
  });
  return image ? dbToEntry(image) : null;
}

export async function getAllImages(gameId: string): Promise<ImageEntry[]> {
  const images = await prisma.image.findMany({
    where: { gameId },
    orderBy: { createdAt: "desc" },
  });
  return images.map(dbToEntry);
}

export async function searchImages(
  gameId: string,
  query: string,
): Promise<ImageEntry | null> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) return null;

  const image = await prisma.image.findFirst({
    where: {
      gameId,
      AND: words.map((word) => ({
        OR: [
          { slug: { contains: word, mode: "insensitive" as const } },
          { prompt: { contains: word, mode: "insensitive" as const } },
          { tags: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
  });

  return image ? dbToEntry(image) : null;
}
