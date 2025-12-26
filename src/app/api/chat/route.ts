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

async function readMdFilesRecursively(
  dir: string,
  baseDir: string,
): Promise<{ relativePath: string; content: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: { relativePath: string; content: string }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await readMdFilesRecursively(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ relativePath, content });
    }
  }

  return files;
}

async function loadGameContext(): Promise<{ system: string; context: string }> {
  try {
    const gameFilesDir = getGameFilesDir();
    const files = await readMdFilesRecursively(gameFilesDir, gameFilesDir);

    let system = "";
    const contextParts: string[] = [];

    for (const file of files) {
      if (file.relativePath === "system.md") {
        system = file.content;
      } else {
        contextParts.push(`## ${file.relativePath}\n\n${file.content}`);
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

  // Prepend context as a user message if we have any
  const contextMessage: UIMessage | null = context
    ? {
        id: "game-context",
        role: "user",
        parts: [{ type: "text", text: `# Game Context\n\n${context}` }],
      }
    : null;

  const allMessages = contextMessage ? [contextMessage, ...messages] : messages;

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

  const editFileTool = tool({
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

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools: { write_file: writeFileTool, edit_file: editFileTool },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          usage: {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
          },
        };
      }
    },
  });
}
