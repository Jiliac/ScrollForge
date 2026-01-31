import { prisma } from "./prisma";
import type { UIMessage } from "ai";
import { getCurrentGameId } from "./game-files";

export async function createConversation(
  userId: string,
  id?: string,
): Promise<string> {
  const gameId = await getCurrentGameId();
  const conversation = await prisma.conversation.create({
    data: id ? { id, gameId, userId } : { gameId, userId },
  });
  return conversation.id;
}

export async function ensureConversationExists(
  id: string,
  userId: string,
): Promise<void> {
  const gameId = await getCurrentGameId();
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

export async function loadConversation(
  id: string,
  userId: string,
): Promise<{ id: string; messages: UIMessage[] } | null> {
  const gameId = await getCurrentGameId();
  const conversation = await prisma.conversation.findFirst({
    where: { id, gameId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return null;

  const messages: UIMessage[] = conversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: JSON.parse(msg.parts),
  }));

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
