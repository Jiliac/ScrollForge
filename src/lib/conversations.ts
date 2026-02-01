import { prisma } from "./prisma";
import type { UIMessage } from "ai";

export async function createConversation(
  userId: string,
  gameId: string,
  id?: string,
): Promise<string> {
  const conversation = await prisma.conversation.create({
    data: id ? { id, gameId, userId } : { gameId, userId },
  });
  return conversation.id;
}

export async function ensureConversationExists(
  id: string,
  userId: string,
  gameId: string,
): Promise<void> {
  const existing = await prisma.conversation.findFirst({
    where: { id, gameId, userId },
  });
  if (!existing) {
    await prisma.conversation.create({ data: { id, gameId, userId } });
  }
}

export async function saveMessages(
  conversationId: string,
  messages: UIMessage[],
): Promise<void> {
  // Use a transaction to upsert all messages
  await prisma.$transaction(
    messages.map((msg) =>
      prisma.message.upsert({
        where: { id: msg.id },
        create: {
          id: msg.id,
          conversationId,
          role: msg.role,
          parts: JSON.stringify(msg.parts),
        },
        update: {
          parts: JSON.stringify(msg.parts),
        },
      }),
    ),
  );

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Load a conversation by ID. gameId is not required here because conversation
 * IDs are globally unique (cuid) and the userId check enforces ownership.
 * The gameId is implicit in the conversation record.
 */
export async function loadConversation(
  id: string,
  userId: string,
): Promise<{ id: string; messages: UIMessage[] } | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return null;

  const messages: UIMessage[] = conversation.messages.flatMap((msg) => {
    const role = msg.role;
    if (role !== "user" && role !== "assistant") return [];
    try {
      return [{ id: msg.id, role, parts: JSON.parse(msg.parts) }];
    } catch {
      return [
        { id: msg.id, role, parts: [{ type: "text" as const, text: "" }] },
      ];
    }
  });

  return { id: conversation.id, messages };
}

export function extractImagesFromMessages(messages: UIMessage[]): string[] {
  const images: string[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      // Check for tool parts with output
      const p = part as {
        type?: string;
        state?: string;
        output?: { path?: string };
      };
      if (
        p.type?.startsWith("tool-") &&
        p.state === "output-available" &&
        p.output?.path
      ) {
        const toolName = p.type.replace("tool-", "");
        if (toolName === "create_image" || toolName === "search_image") {
          images.push(p.output.path);
        }
      }
    }
  }

  return images;
}
