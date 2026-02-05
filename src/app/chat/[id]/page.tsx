import { notFound } from "next/navigation";
import {
  loadConversation,
  extractImagesFromMessages,
} from "@/lib/conversations";
import { requireUserId } from "@/lib/auth";
import { getRecentImageUrls } from "@/lib/image-index";
import { ChatPageClient } from "./client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: Props) {
  const userId = await requireUserId();
  const { id } = await params;
  const conversation = await loadConversation(id, userId);

  if (!conversation) {
    notFound();
  }

  const [messageImages, gameImageUrls] = await Promise.all([
    Promise.resolve(extractImagesFromMessages(conversation.messages)),
    getRecentImageUrls(conversation.gameId),
  ]);

  const initialImages = [...new Set([...gameImageUrls, ...messageImages])];

  return (
    <ChatPageClient
      conversationId={conversation.id}
      gameId={conversation.gameId}
      initialMessages={conversation.messages}
      initialImages={initialImages}
    />
  );
}
