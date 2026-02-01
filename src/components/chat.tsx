"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import { CoinsIcon, SwordsIcon, MessageCircleQuestionIcon } from "lucide-react";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
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
  const hasRedirectedRef = useRef(false);

  const [mode, setMode] = useState<"play" | "ask">("play");

  // Generate stable conversationId upfront - either from props or new
  const conversationId = useMemo(
    () => initialConversationId || nanoid(),
    [initialConversationId],
  );

  // Recreate transport when mode or conversationId changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: mode === "play" ? "/api/play" : "/api/ask",
        body: { conversationId },
      }),
    [conversationId, mode],
  );

  const { messages, status, sendMessage } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  useChatEffects(messages, onToolComplete, onImageChange);

  // Track last saved message count to avoid redundant saves
  const lastSavedCountRef = useRef(initialMessages?.length ?? 0);
  const [hasSavedInitial, setHasSavedInitial] = useState(false);

  // Save messages after each exchange completes
  useEffect(() => {
    if (
      status === "ready" &&
      messages.length > 1 &&
      messages.length > lastSavedCountRef.current
    ) {
      lastSavedCountRef.current = messages.length;
      fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).then(() => {
        // Only set this on home page - signals save is done for redirect
        if (pathname === "/") setHasSavedInitial(true);
      });
    }
  }, [status, messages, conversationId, pathname]);

  // Redirect to /chat/[id] after first exchange on home page (after save completes)
  useEffect(() => {
    if (pathname === "/" && hasSavedInitial && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.push(`/chat/${conversationId}`);
    }
  }, [pathname, hasSavedInitial, conversationId, router]);

  const onSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  };

  const displayUsage = tokenUsage || getLatestUsage(messages);

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      {displayUsage && <TokenDisplay usage={displayUsage} />}
      <Conversation className="flex-1">
        <ConversationContent>
          <MessageList messages={messages} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputFooter>
          <ModeSelector mode={mode} onModeChange={setMode} />
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

type ChatMode = "play" | "ask";

const CHAT_MODES: ChatMode[] = ["play", "ask"];

const MODE_LABELS: Record<
  ChatMode,
  { label: string; icon: typeof SwordsIcon }
> = {
  play: { label: "Play", icon: SwordsIcon },
  ask: { label: "Ask", icon: MessageCircleQuestionIcon },
};

function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}) {
  const { label } = MODE_LABELS[mode];

  return (
    <Combobox
      items={CHAT_MODES}
      value={mode}
      onValueChange={(v) => {
        if (v) onModeChange(v as ChatMode);
      }}
    >
      <ComboboxInput
        placeholder={label}
        className="w-24"
        showTrigger
        readOnly
        value={label}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item: string) => {
            const chatMode = item as ChatMode;
            const { label: itemLabel, icon: ItemIcon } = MODE_LABELS[chatMode];
            return (
              <ComboboxItem key={item} value={item}>
                <ItemIcon className="size-3.5" />
                {itemLabel}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
