import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, tool, type UIMessage } from "ai";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

// Get game files directory from env or default
function getGameFilesDir(): string {
  return (
    process.env.GAME_FILES_DIR || path.join(process.cwd(), "game_files_local")
  );
}

async function loadGameContext(): Promise<{ system: string; context: string }> {
  try {
    const gameFilesDir = getGameFilesDir();
    const entries = await fs.readdir(gameFilesDir, { withFileTypes: true });
    const mdFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".md"),
    );

    let system = "";
    const contextParts: string[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(gameFilesDir, file.name);
      const content = await fs.readFile(filePath, "utf-8");

      if (file.name === "system.md") {
        system = content;
      } else {
        contextParts.push(`## ${file.name}\n\n${content}`);
      }
    }

    return {
      system,
      context: contextParts.join("\n\n---\n\n"),
    };
  } catch (error) {
    console.error("Error loading game context:", error);
    return { system: "", context: "" };
  }
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const { system, context } = await loadGameContext();

  const systemPrompt = system
    ? `${system}\n\n# Game Context\n\n${context}`
    : context
      ? `# Game Context\n\n${context}`
      : undefined;

  const writeFileTool = tool({
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

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: { write_file: writeFileTool },
  });

  return result.toUIMessageStreamResponse();
}
