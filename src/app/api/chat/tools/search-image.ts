import { tool } from "ai";
import { z } from "zod";
import { searchImages } from "@/lib/image-index";

export const searchImageTool = tool({
  description:
    "Search for an existing image by slug, tags, or prompt. Returns the image path if found.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Search query (matches against slug, tags, or prompt)"),
  }),
  execute: async ({ query }) => {
    const result = await searchImages(query);

    if (!result) {
      return { success: false, error: `No image found for query: ${query}` };
    }

    return {
      success: true,
      path: `images/${result.file}`,
      slug: result.slug,
      prompt: result.prompt,
      tags: result.tags,
    };
  },
});
