import { promises as fs } from "fs";
import path from "path";
import { getGameFilesDir } from "./game-files";

export interface ImageEntry {
  slug: string;
  file: string;
  prompt: string;
  tags: string[];
  referencedIn: string;
}

export interface ImageIndex {
  images: ImageEntry[];
}

export async function loadImageIndex(): Promise<ImageIndex> {
  const indexPath = path.join(getGameFilesDir(), "images", "index.json");
  try {
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as ImageIndex;
  } catch {
    return { images: [] };
  }
}

export async function saveImageIndex(index: ImageIndex): Promise<void> {
  const imagesDir = path.join(getGameFilesDir(), "images");
  await fs.mkdir(imagesDir, { recursive: true });
  const indexPath = path.join(imagesDir, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

export function searchImages(
  index: ImageIndex,
  query: string,
): ImageEntry | null {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  return (
    index.images.find((img) => {
      const slug = img.slug.toLowerCase();
      const prompt = img.prompt.toLowerCase();
      const tags = img.tags.map((t) => t.toLowerCase());

      return words.every(
        (word) =>
          slug.includes(word) ||
          tags.some((tag) => tag.includes(word)) ||
          prompt.includes(word),
      );
    }) || null
  );
}
