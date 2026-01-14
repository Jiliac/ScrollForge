import "server-only";

import { ZepClient, ZepError } from "@getzep/zep-cloud";
import type { UIMessage } from "ai";

type ZepMessage = {
  role: "user" | "assistant";
  name: string;
  content: string;
};

const globalForZep = globalThis as unknown as { zep?: ZepClient | null };

function createZepClient(): ZepClient | null {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.warn("ZEP_API_KEY not configured - Zep memory disabled");
    return null;
  }
  return new ZepClient({ apiKey });
}

export const zep = globalForZep.zep ?? createZepClient();

if (process.env.NODE_ENV !== "production") globalForZep.zep = zep;

export function isZepEnabled(): boolean {
  return zep !== null;
}

/**
 * Ensure a Zep user exists for the given game.
 * Uses Game.id as the Zep userId.
 */
export async function ensureZepUser(gameId: string): Promise<void> {
  if (!zep) return;

  try {
    await zep.user.get(gameId);
  } catch (error) {
    // Only create user if it's a 404 (not found), rethrow other errors
    if (error instanceof ZepError && error.statusCode === 404) {
      await zep.user.add({
        userId: gameId,
        firstName: "Game",
        lastName: gameId.slice(0, 8),
      });
      console.log(`Created Zep user for game: ${gameId}`);
    } else {
      throw error;
    }
  }
}

const ZEP_MAX_CHARS = 9500;
const ZEP_BATCH_SIZE = 20;

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

/**
 * Send markdown files to Zep's knowledge graph using batch processing.
 * Large files are split into chunks to fit within Zep's 10k limit.
 * Sends up to 20 episodes per batch, processed sequentially.
 * @throws Error if any batch fails to sync
 */
export async function syncGameFilesToZep(
  gameId: string,
  files: { relativePath: string; content: string }[],
): Promise<void> {
  if (!zep) return;

  // Ensure user exists before syncing
  await ensureZepUser(gameId);

  // Build all episodes
  const episodes: { data: string; type: "text" }[] = [];
  for (const file of files) {
    const fullText = `# ${file.relativePath}\n\n${file.content}`;
    const chunks = splitIntoChunks(fullText, ZEP_MAX_CHARS);
    for (const chunk of chunks) {
      episodes.push({ data: chunk, type: "text" });
    }
  }

  // Send in batches of 20, collect any errors
  const errors: { batch: number; error: unknown }[] = [];
  const totalBatches = Math.ceil(episodes.length / ZEP_BATCH_SIZE);

  for (let i = 0; i < episodes.length; i += ZEP_BATCH_SIZE) {
    const batch = episodes.slice(i, i + ZEP_BATCH_SIZE);
    const batchNum = Math.floor(i / ZEP_BATCH_SIZE) + 1;
    try {
      await zep.graph.addBatch({ userId: gameId, episodes: batch });
    } catch (error) {
      console.error(
        `Failed to sync batch ${batchNum}/${totalBatches} to Zep:`,
        error,
      );
      errors.push({ batch: batchNum, error });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to sync ${errors.length}/${totalBatches} batches to Zep for game ${gameId}`,
    );
  }

  console.log(
    `Synced ${files.length} files (${episodes.length} episodes) to Zep for game: ${gameId}`,
  );
}

/**
 * Ensure a Zep thread exists for a conversation.
 */
export async function ensureZepThread(
  gameId: string,
  threadId: string,
): Promise<void> {
  if (!zep) return;

  try {
    await zep.thread.get(threadId);
  } catch (error) {
    // Only create thread if it's a 404 (not found), rethrow other errors
    if (error instanceof ZepError && error.statusCode === 404) {
      await zep.thread.create({
        threadId,
        userId: gameId,
      });
      console.log(`Created Zep thread: ${threadId}`);
    } else {
      throw error;
    }
  }
}

/**
 * Convert UIMessage parts to plain text content.
 */
function flattenMessageParts(parts: UIMessage["parts"]): string {
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.type === "text") {
      textParts.push(part.text);
    } else if (part.type.startsWith("tool-")) {
      // Summarize tool calls
      const toolPart = part as {
        toolName?: string;
        state?: string;
        output?: unknown;
      };
      if (toolPart.state === "output-available" && toolPart.toolName) {
        textParts.push(`[Used tool: ${toolPart.toolName}]`);
      }
    }
  }

  return textParts.join("\n");
}

/**
 * Convert UIMessage[] to Zep Message format.
 * Only "user" and "assistant" roles are supported by Zep.
 */
function uiMessagesToZepMessages(messages: UIMessage[]): ZepMessage[] {
  return messages
    .filter(
      (msg): msg is UIMessage & { role: "user" | "assistant" } =>
        msg.role === "user" || msg.role === "assistant",
    )
    .map((msg) => {
      const content = flattenMessageParts(msg.parts);
      if (!content.trim()) return null;

      return {
        role: msg.role,
        name: msg.role === "user" ? "Player" : "Narrator",
        content,
      };
    })
    .filter((msg): msg is ZepMessage => msg !== null);
}

/**
 * Add a single message to Zep thread and optionally retrieve context.
 * Use this for incremental message syncing (one message at a time).
 * @returns Context block if returnContext is true, undefined otherwise
 */
export async function addMessageToZep(
  gameId: string,
  threadId: string,
  message: UIMessage,
  returnContext = false,
): Promise<string | undefined> {
  if (!zep) return undefined;

  const zepMessages = uiMessagesToZepMessages([message]);
  if (zepMessages.length === 0) return undefined;

  try {
    await ensureZepThread(gameId, threadId);

    const response = await zep.thread.addMessages(threadId, {
      messages: zepMessages,
      returnContext,
    });

    if (returnContext && response.context) {
      return response.context;
    }
  } catch (error) {
    console.error(`Failed to add message to Zep thread ${threadId}:`, error);
  }

  return undefined;
}
