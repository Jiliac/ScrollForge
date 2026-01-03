import { promises as fs } from "fs";
import path from "path";
import { tool } from "ai";
import { z } from "zod";
import { getGameFilesDir } from "@/lib/game-files";
import { loadImageIndex, saveImageIndex } from "@/lib/image-index";
import { generateImageWithBfl } from "@/lib/bfl-api";

export const createImageTool = tool({
  description: `Generate a new image using FLUX AI. Saves to images folder, updates index, and adds reference to a markdown file.

## FLUX Prompt Structure (CRITICAL)
FLUX weighs earlier information more heavily. Structure prompts as:
[STYLE] + [SUBJECT] + [ACTION/POSE] + [SETTING] + [LIGHTING/MOOD]

## Style Consistency
ALWAYS start prompts with this style base for visual consistency:
"Persian miniature painting style, Seljuk-era manuscript aesthetic. Rich palette: deep indigo, madder crimson, saffron gold, turquoise accents on warm earth tones. Flat perspective with decorative patterns on textiles. Warm golden light."

## Reference Images (reference_slugs)
- Use ONLY for character consistency (same person in different scene)
- Use ONE ref maximum - multiple refs cause feature mixing
- When using a ref, prompt MUST explicitly state preservation:
  "The same man from the reference image, preserve his exact facial features, beard, and expression. Change the setting to: [new scene]"
- Do NOT use refs for style consistency - use the style base instead
- Do NOT use refs when generating new characters

## Prompt Examples
NEW CHARACTER (no ref):
"Persian miniature painting style, Seljuk-era aesthetic. Portrait of a master dyer, age 35, close-cropped black beard, weathered tan skin, strong build. Wearing indigo-stained work robes. Confident, determined expression. Warm golden light, decorative border."

EXISTING CHARACTER IN NEW SCENE (with ref):
"Persian miniature painting style. The same man from reference, preserve exact facial features and beard. Change setting to: busy workshop interior, copper vats steaming, colored cloth hanging. Morning light through doorway."`,
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
