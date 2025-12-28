"use client";

import { useChat } from "@ai-sdk/react";
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
  tokenUsage?: TokenUsage;
  onToolComplete?: () => void;
  onImageChange?: (imagePath: string) => void;
};

export function ChatSection({
  tokenUsage,
  onToolComplete,
  onImageChange,
}: ChatSectionProps) {
  const { messages, status, sendMessage } = useChat();

  useChatEffects(messages, onToolComplete, onImageChange);

  const onSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  };

  const displayUsage = tokenUsage || getLatestUsage(messages);

  return (
    <div className="flex h-[80vh] flex-col gap-4">
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
