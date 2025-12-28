import { promises as fs } from "fs";
import path from "path";
import { tool } from "ai";
import { z } from "zod";
import { getGameFilesDir } from "@/lib/game-files";

export const editFileTool = tool({
  description:
    "Edit a file by replacing a unique string with new content. The old_string must appear exactly once in the file.",
  inputSchema: z.object({
    file_path: z
      .string()
      .describe("Relative path within game files (e.g., 'npcs/merchant.md')"),
    old_string: z
      .string()
      .describe("Exact text to find and replace (must be unique in file)"),
    new_string: z.string().describe("Text to replace it with"),
  }),
  execute: async ({ file_path, old_string, new_string }) => {
    const gameFilesDir = getGameFilesDir();
    const fullPath = path.join(gameFilesDir, file_path);

    const content = await fs.readFile(fullPath, "utf-8");
    const occurrences = content.split(old_string).length - 1;

    if (occurrences === 0) {
      return { success: false, error: "old_string not found in file" };
    }
    if (occurrences > 1) {
      return {
        success: false,
        error: `old_string appears ${occurrences} times, must be unique`,
      };
    }

    const newContent = content.replace(old_string, new_string);
    await fs.writeFile(fullPath, newContent, "utf-8");
    return { success: true, path: file_path };
  },
});
