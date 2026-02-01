import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeGameFilePath } from "@/lib/normalize-path";

export function makeWriteFile(gameId: string) {
  return tool({
    description:
      "Write content to a file in the game files directory. Creates the file if it doesn't exist.",
    inputSchema: z.object({
      file_path: z
        .string()
        .describe("Relative path within game files (e.g., 'npcs/merchant.md')"),
      content: z.string().describe("Content to write to the file"),
    }),
    execute: async ({ file_path, content }) => {
      const path = normalizeGameFilePath(file_path);
      await prisma.gameFile.upsert({
        where: { gameId_path: { gameId, path } },
        create: { gameId, path, content },
        update: { content },
      });
      return { success: true, path };
    },
  });
}
