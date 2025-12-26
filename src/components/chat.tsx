"use client";

import { ChatSection as ChatSectionUI } from "@llamaindex/chat-ui";
import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/editor.css";
import { useChat } from "@ai-sdk/react";

export function ChatSection() {
  const handler = useChat();

  return (
    <div className="flex h-[80vh] flex-col">
      <ChatSectionUI handler={handler} />
    </div>
  );
}
