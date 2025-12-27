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

// Image index types
interface ImageEntry {
  slug: string;
  file: string;
  prompt: string;
  tags: string[];
  referencedIn: string;
}

interface ImageIndex {
  images: ImageEntry[];
}

async function loadImageIndex(): Promise<ImageIndex> {
  const indexPath = path.join(getGameFilesDir(), "images", "index.json");
  try {
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as ImageIndex;
  } catch {
    return { images: [] };
  }
}

async function saveImageIndex(index: ImageIndex): Promise<void> {
  const imagesDir = path.join(getGameFilesDir(), "images");
  await fs.mkdir(imagesDir, { recursive: true });
  const indexPath = path.join(imagesDir, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

function searchImages(index: ImageIndex, query: string): ImageEntry | null {
  const q = query.toLowerCase();
  return (
    index.images.find(
      (img) =>
        img.slug.toLowerCase().includes(q) ||
        img.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        img.prompt.toLowerCase().includes(q),
    ) || null
  );
}

// BFL API helpers
const BFL_API_KEY = process.env.BFL_API_KEY;

interface BflSubmitResponse {
  id: string;
  polling_url: string;
  cost: number;
}

interface BflPollResponse {
  id: string;
  status: "Pending" | "Ready" | "Error";
  result?: {
    sample: string;
    prompt: string;
    seed: number;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImageWithBfl(prompt: string): Promise<Buffer> {
  if (!BFL_API_KEY) {
    throw new Error("BFL_API_KEY not configured");
  }

  // Submit job
  const submitResponse = await fetch("https://api.bfl.ai/v1/flux-2-pro", {
    method: "POST",
    headers: {
      "x-key": BFL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!submitResponse.ok) {
    throw new Error(`BFL API error: ${submitResponse.status}`);
  }

  const { polling_url } = (await submitResponse.json()) as BflSubmitResponse;

  // Poll until ready
  let imageUrl: string | undefined;
  for (let i = 0; i < 120; i++) {
    const pollResponse = await fetch(polling_url, {
      headers: { "x-key": BFL_API_KEY },
    });

    if (!pollResponse.ok) {
      throw new Error(`Poll error: ${pollResponse.status}`);
    }

    const data = (await pollResponse.json()) as BflPollResponse;

    if (data.status === "Ready" && data.result) {
      imageUrl = data.result.sample;
      break;
    } else if (data.status === "Error") {
      throw new Error("BFL job failed");
    }

    await sleep(1000);
  }

  if (!imageUrl) {
    throw new Error("Timeout waiting for image");
  }

  // Download image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  return Buffer.from(await imageResponse.arrayBuffer());
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

  const searchImageTool = tool({
    description:
      "Search for an existing image by slug, tags, or prompt. Returns the image path if found.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query (matches against slug, tags, or prompt)"),
    }),
    execute: async ({ query }) => {
      const index = await loadImageIndex();
      const result = searchImages(index, query);

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

  const createImageTool = tool({
    description:
      "Generate a new image using FLUX AI. Saves to images folder, updates index, and adds reference to a markdown file.",
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
    }),
    execute: async ({ slug, prompt, tags, reference_file }) => {
      try {
        // Generate image with BFL
        const imageBuffer = await generateImageWithBfl(prompt);

        // Save image
        const gameFilesDir = getGameFilesDir();
        const imagesDir = path.join(gameFilesDir, "images");
        await fs.mkdir(imagesDir, { recursive: true });

        const filename = `${slug}.jpeg`;
        await fs.writeFile(path.join(imagesDir, filename), imageBuffer);

        // Update index
        const index = await loadImageIndex();
        index.images.push({
          slug,
          file: filename,
          prompt,
          tags,
          referencedIn: reference_file,
        });
        await saveImageIndex(index);

        // Add reference to markdown file
        const refFilePath = path.join(gameFilesDir, reference_file);
        try {
          const refContent = await fs.readFile(refFilePath, "utf-8");
          const imageRef = `\n\n![${slug}](images/${filename})\n`;
          await fs.writeFile(refFilePath, refContent + imageRef, "utf-8");
        } catch {
          // File doesn't exist, create it with just the image reference
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

  const result = streamText({
    model: anthropic("claude-opus-4-5-20251101"),
    system: system || undefined,
    messages: await convertToModelMessages(allMessages),
    tools: {
      write_file: writeFileTool,
      edit_file: editFileTool,
      search_image: searchImageTool,
      create_image: createImageTool,
    },
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
