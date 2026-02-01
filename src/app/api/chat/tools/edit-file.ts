import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeGameFilePath } from "@/lib/normalize-path";

export function makeEditFile(gameId: string) {
  return tool({
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
      const path = normalizeGameFilePath(file_path);

      const file = await prisma.gameFile.findUnique({
        where: { gameId_path: { gameId, path } },
      });

      if (!file) {
        return { success: false, error: "File not found" };
      }

      const occurrences = file.content.split(old_string).length - 1;

      if (occurrences === 0) {
        return { success: false, error: "old_string not found in file" };
      }
      if (occurrences > 1) {
        return {
          success: false,
          error: `old_string appears ${occurrences} times, must be unique`,
        };
      }

      const newContent = file.content.replace(old_string, new_string);
      await prisma.gameFile.update({
        where: { gameId_path: { gameId, path } },
        data: { content: newContent },
      });
      return { success: true, path };
    },
  });
}
