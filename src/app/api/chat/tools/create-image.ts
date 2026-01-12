import { promises as fs } from "fs";
import path from "path";
import { tool } from "ai";
import { z } from "zod";
import { getGameFilesDir } from "@/lib/game-files";
import { createImage } from "@/lib/image-index";
import { generateImageWithBfl } from "@/lib/bfl-api";

export const createImageTool = tool({
  description: `Generate a new image using FLUX AI. Saves to images folder, updates index, and adds reference to a markdown file.

## FLUX Prompt Structure (CRITICAL)
FLUX weighs earlier information more heavily. Structure prompts as:
[STYLE] + [SUBJECT] + [ACTION/POSE] + [SETTING] + [LIGHTING/MOOD]

## Style Consistency
Read the game's style-guide.md for the visual style base to use. Every prompt MUST start with the style base from that file to maintain visual consistency across all images.

If style-guide.md has no FLUX prompt template, use these defaults:
- Color palette from the guide
- Architecture/environment details from the guide
- Character depiction guidelines from the guide

## Reference Images (reference_slugs)
- Use ONLY for character consistency (same person in different scene)
- Use ONE ref maximum - multiple refs cause feature mixing
- When using a ref, prompt MUST explicitly state preservation:
  "The same person from the reference image, preserve exact facial features and expression. Change the setting to: [new scene]"
- Do NOT use refs for style consistency - use the style base instead
- Do NOT use refs when generating new characters

## Prompt Examples
NEW CHARACTER (no ref):
"[Style base from style-guide.md]. Portrait of [character description]. [Clothing/appearance]. [Expression]. [Lighting], [composition]."

EXISTING CHARACTER IN NEW SCENE (with ref):
"[Style base]. The same person from reference, preserve exact facial features. Change setting to: [new environment]. [Lighting/atmosphere]."`,
  inputSchema: z.object({
    slug: z
      .string()
      .describe(
        "Unique identifier for the image. Format: 'subject-context' (e.g., 'tahir-portrait', 'tahir-workshop', 'bazaar-morning')",
      ),
    prompt: z
      .string()
      .describe(
        "FLUX prompt following the structure above. Start with style base, then subject, then scene details. Be visually specific (colors, lighting, composition) not narratively descriptive.",
      ),
    tags: z
      .array(z.string())
      .describe(
        "Tags for searching. Include: character name if applicable, location, scene type (e.g., ['tahir', 'workshop', 'action'] or ['bazaar', 'location', 'exterior'])",
      ),
    reference_file: z
      .string()
      .describe(
        "Markdown file to add image reference to (e.g., 'NPCs/Tahir.md' or 'Locations/Workshop.md')",
      ),
    reference_slugs: z
      .array(z.string())
      .optional()
      .describe(
        "USE SPARINGLY. Only for putting an existing character in a new scene. Pass ONE slug only (the character's portrait). Prompt must include explicit preservation language. Do not use for style - use style base in prompt instead.",
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

      await createImage({
        slug,
        file: filename,
        prompt,
        tags,
        referencedIn: reference_file,
      });

      const refFilePath = path.join(gameFilesDir, reference_file);
      try {
        const refContent = await fs.readFile(refFilePath, "utf-8");
        const imageRef = `\n\n![${slug}](images/${filename})\n`;
        await fs.writeFile(refFilePath, refContent + imageRef, "utf-8");
      } catch {
        await fs.mkdir(path.dirname(refFilePath), { recursive: true });
        const title = path.basename(reference_file, ".md");
        await fs.writeFile(
          refFilePath,
          `# ${title}\n\n![${slug}](images/${filename})\n`,
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
