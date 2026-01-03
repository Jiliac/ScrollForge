"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { CoinsIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { useChatEffects } from "@/hooks/use-chat-effects";
import { MessageList } from "@/components/chat/message-list";

type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ChatSectionProps = {
  conversationId?: string;
  initialMessages?: UIMessage[];
  tokenUsage?: TokenUsage;
  onToolComplete?: () => void;
  onImageChange?: (imagePath: string) => void;
};

export function ChatSection({
  conversationId: initialConversationId,
  initialMessages,
  tokenUsage,
  onToolComplete,
  onImageChange,
}: ChatSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const hasRedirectedRef = useRef(false);

  // Create transport with conversationId in body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const { messages, status, sendMessage } = useChat({
    id: initialConversationId,
    messages: initialMessages,
    transport,
    onFinish({ message }) {
      // Extract conversationId from message metadata
      const metadata = message.metadata as
        | { conversationId?: string }
        | undefined;
      if (metadata?.conversationId && !conversationId) {
        setConversationId(metadata.conversationId);
      }
    },
  });

  useChatEffects(messages, onToolComplete, onImageChange);

  // Redirect to /chat/[id] when we have a conversationId and are on home
  useEffect(() => {
    if (
      pathname === "/" &&
      status === "ready" &&
      conversationId &&
      messages.length > 0 &&
      !hasRedirectedRef.current
    ) {
      hasRedirectedRef.current = true;
      router.push(`/chat/${conversationId}`);
    }
  }, [pathname, status, conversationId, messages.length, router]);

  const onSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  };

  const displayUsage = tokenUsage || getLatestUsage(messages);

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      {displayUsage && <TokenDisplay usage={displayUsage} />}
      <Conversation className="flex-1 rounded-lg border bg-card">
        <ConversationContent>
          <MessageList messages={messages} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputFooter>
          <div />
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

type TokenDisplayProps = {
  usage: TokenUsage;
};

function TokenDisplay({ usage }: TokenDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <CoinsIcon className="size-3" />
      <span>
        {usage.inputTokens.toLocaleString()} in /{" "}
        {usage.outputTokens.toLocaleString()} out
      </span>
    </div>
  );
}

function getLatestUsage(
  messages: { role: string; metadata?: unknown }[],
): TokenUsage | null {
  const latestAssistant = [...messages]
    .reverse()
    .find(
      (msg) =>
        msg.role === "assistant" &&
        msg.metadata &&
        typeof msg.metadata === "object" &&
        "usage" in msg.metadata,
    );
  if (!latestAssistant?.metadata) return null;
  const metadata = latestAssistant.metadata as { usage?: TokenUsage };
  return metadata.usage || null;
}
