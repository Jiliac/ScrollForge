import { promises as fs } from "fs";
import path from "path";
import { tool } from "ai";
import { z } from "zod";
import { getGameFilesDir } from "@/lib/game-files";

export const writeFileTool = tool({
  description:
    "Write content to a file in the game files directory. Creates parent folders if needed.",
  inputSchema: z.object({
    file_path: z
      .string()
      .describe("Relative path within game files (e.g., 'npcs/merchant.md')"),
    content: z.string().describe("Content to write to the file"),
  }),
  execute: async ({ file_path, content }) => {
    const gameFilesDir = getGameFilesDir();
    const fullPath = path.join(gameFilesDir, file_path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return { success: true, path: file_path };
  },
});
