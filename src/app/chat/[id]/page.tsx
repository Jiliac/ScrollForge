import { notFound } from "next/navigation";
import {
  loadConversation,
  extractImagesFromMessages,
} from "@/lib/conversations";
import { ChatPageClient } from "./client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  const conversation = await loadConversation(id);

  if (!conversation) {
    notFound();
  }

  const initialImages = extractImagesFromMessages(conversation.messages);

  return (
    <ChatPageClient
      conversationId={conversation.id}
      initialMessages={conversation.messages}
      initialImages={initialImages}
    />
  );
}
