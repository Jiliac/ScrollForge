import { promises as fs } from "fs";
import path from "path";
import { tool } from "ai";
import { z } from "zod";
import { getGameFilesDir } from "@/lib/game-files";
import { loadImageIndex, saveImageIndex } from "@/lib/image-index";
import { generateImageWithBfl } from "@/lib/bfl-api";

export const createImageTool = tool({
  description:
    "Generate a new image using FLUX AI. Saves to images folder, updates index, and adds reference to a markdown file. Use reference_slugs to maintain character/scene consistency.",
  inputSchema: z.object({
    slug: z
      .string()
      .describe("Unique identifier for the image (e.g., 'mahmud-portrait')"),
    prompt: z.string().describe("Detailed prompt for image generation"),
    tags: z
      .array(z.string())
      .describe("Tags for searching (e.g., ['character', 'portrait'])"),
    reference_file: z
      .string()
      .describe(
        "Markdown file to add image reference to (e.g., 'characters/mahmud.md')",
      ),
    reference_slugs: z
      .array(z.string())
      .optional()
      .describe(
        "Optional slugs of existing images to use as references for consistency (e.g., ['mahmud-portrait'] to keep the same face)",
      ),
  }),
  execute: async ({ slug, prompt, tags, reference_file, reference_slugs }) => {
    try {
      const imageBuffer = await generateImageWithBfl(prompt, reference_slugs);

      const gameFilesDir = getGameFilesDir();
      const imagesDir = path.join(gameFilesDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      const filename = `${slug}.jpeg`;
      await fs.writeFile(path.join(imagesDir, filename), imageBuffer);

      const index = await loadImageIndex();
      index.images.push({
        slug,
        file: filename,
        prompt,
        tags,
        referencedIn: reference_file,
      });
      await saveImageIndex(index);

      const refFilePath = path.join(gameFilesDir, reference_file);
      try {
        const refContent = await fs.readFile(refFilePath, "utf-8");
        const imageRef = `\n\n![${slug}](images/${filename})\n`;
        await fs.writeFile(refFilePath, refContent + imageRef, "utf-8");
      } catch {
        await fs.mkdir(path.dirname(refFilePath), { recursive: true });
        await fs.writeFile(
          refFilePath,
          `# ${slug}\n\n![${slug}](images/${filename})\n`,
          "utf-8",
        );
      }

      return {
        success: true,
        path: `images/${filename}`,
        slug,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
