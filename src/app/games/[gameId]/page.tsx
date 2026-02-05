import { notFound } from "next/navigation";
import { requireGameAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractImagesFromMessages } from "@/lib/conversations";
import { getRecentImageUrls } from "@/lib/image-index";
import type { UIMessage } from "ai";
import { GameDashboardClient } from "./client";

type Props = {
  params: Promise<{ gameId: string }>;
};

function extractMessagePreview(partsJson: string | undefined): string {
  if (!partsJson) return "";
  try {
    const parts = JSON.parse(partsJson);
    const textPart = parts.find((p: { type: string }) => p.type === "text");
    return textPart?.text?.slice(0, 100) ?? "";
  } catch {
    return "";
  }
}

export default async function GamePage({ params }: Props) {
  const { gameId } = await params;

  try {
    await requireGameAccess(gameId);
  } catch {
    notFound();
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      conversations: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!game) notFound();

  // Extract image URLs from recent conversations for the image pane
  const allMessages: UIMessage[] = game.conversations.flatMap((conv) =>
    conv.messages.map((msg) => {
      try {
        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: JSON.parse(msg.parts),
        };
      } catch {
        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: [],
        };
      }
    }),
  );
  const recentImages = extractImagesFromMessages(allMessages);

  const gameImageUrls = await getRecentImageUrls(gameId);

  const allImages = [...new Set([...gameImageUrls, ...recentImages])];

  const recentConversations = game.conversations.map((conv) => ({
    id: conv.id,
    updatedAt: conv.updatedAt.toISOString(),
    preview: extractMessagePreview(conv.messages[0]?.parts),
  }));

  return (
    <GameDashboardClient
      game={{ id: game.id, name: game.name, description: game.description }}
      recentConversations={recentConversations}
      initialImages={allImages}
    />
  );
}
