import { prisma } from "./prisma";
import type { Image } from "@/generated/prisma/client";
import { getCurrentGameId } from "./game-files";

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

export async function createImage(entry: ImageEntry): Promise<Image> {
  const gameId = await getCurrentGameId();
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

export async function getImageBySlug(slug: string): Promise<ImageEntry | null> {
  const gameId = await getCurrentGameId();
  const image = await prisma.image.findFirst({
    where: { gameId, slug },
  });
  return image ? dbToEntry(image) : null;
}

export async function getAllImages(): Promise<ImageEntry[]> {
  const gameId = await getCurrentGameId();
  const images = await prisma.image.findMany({
    where: { gameId },
    orderBy: { createdAt: "desc" },
  });
  return images.map(dbToEntry);
}

export async function searchImages(query: string): Promise<ImageEntry | null> {
  const gameId = await getCurrentGameId();
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  const images = await prisma.image.findMany({
    where: { gameId },
  });

  const found = images.find((img) => {
    const slug = img.slug.toLowerCase();
    const prompt = img.prompt.toLowerCase();
    const tags = (JSON.parse(img.tags) as string[]).map((t) => t.toLowerCase());

    return words.every(
      (word) =>
        slug.includes(word) ||
        tags.some((tag) => tag.includes(word)) ||
        prompt.includes(word),
    );
  });

  return found ? dbToEntry(found) : null;
}
