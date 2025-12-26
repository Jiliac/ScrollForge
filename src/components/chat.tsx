"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { CopyIcon, CheckIcon, CoinsIcon, FileIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <MessageAction tooltip={copied ? "Copied!" : "Copy"} onClick={handleCopy}>
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </MessageAction>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMessageText(message: { parts?: any[] }): string {
  return (
    message.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text?: string }) => p.text || "")
      .join("") || ""
  );
}

type ToolPartInfo = {
  type: string;
  toolCallId: string;
  input: Record<string, unknown>;
  state: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getToolParts(message: { parts?: any[] }): ToolPartInfo[] {
  return (
    message.parts
      ?.filter(
        (p: { type: string }) =>
          p.type.startsWith("tool-") && p.type !== "tool-result",
      )
      .map((p: ToolPartInfo) => p) || []
  );
}

type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function ChatSection({
  tokenUsage,
  onToolComplete,
}: {
  tokenUsage?: TokenUsage;
  onToolComplete?: () => void;
}) {
  const { messages, status, sendMessage } = useChat();
  const lastToolCompleteRef = useRef<string | null>(null);

  // Watch for tool completions and trigger callback
  useEffect(() => {
    for (const message of messages) {
      const toolParts = getToolParts(message);
      for (const tool of toolParts) {
        if (
          tool.state === "output-available" &&
          lastToolCompleteRef.current !== tool.toolCallId
        ) {
          lastToolCompleteRef.current = tool.toolCallId;
          onToolComplete?.();
        }
      }
    }
  }, [messages, onToolComplete]);

  const onSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  };

  // Get usage from the latest assistant message
  const latestUsage = [...messages]
    .reverse()
    .find(
      (msg) =>
        msg.role === "assistant" &&
        (msg as { metadata?: { usage?: TokenUsage } }).metadata?.usage,
    );
  const lastUsage = (latestUsage as { metadata?: { usage?: TokenUsage } })
    ?.metadata?.usage;

  const displayUsage = tokenUsage || lastUsage || null;

  return (
    <div className="flex h-[80vh] flex-col gap-4">
      {displayUsage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CoinsIcon className="size-3" />
          <span>
            {displayUsage.inputTokens.toLocaleString()} in /{" "}
            {displayUsage.outputTokens.toLocaleString()} out
          </span>
        </div>
      )}
      <Conversation className="flex-1 rounded-lg border bg-card">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Start a conversation
            </div>
          ) : (
            messages.map((message) => {
              const text = getMessageText(message);
              const toolParts = getToolParts(message);
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "user" ? (
                      <p>{text}</p>
                    ) : (
                      <>
                        {toolParts.map((tool) => {
                          const toolName = tool.type.replace("tool-", "");
                          const label =
                            toolName === "write_file"
                              ? "Write file"
                              : toolName === "edit_file"
                                ? "Edit file"
                                : toolName;
                          return (
                            <div
                              key={tool.toolCallId}
                              className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-2 py-1 bg-muted/50 rounded"
                            >
                              <FileIcon className="size-3" />
                              <span>
                                {label}:{" "}
                                {String(tool.input?.file_path || "unknown")}
                              </span>
                              {tool.state === "output-available" && (
                                <span className="text-xs text-primary">
                                  Done
                                </span>
                              )}
                              {tool.state === "input-streaming" && (
                                <span className="text-xs text-muted-foreground">
                                  ...
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {text && <MessageResponse>{text}</MessageResponse>}
                      </>
                    )}
                  </MessageContent>
                  {message.role === "assistant" && text && (
                    <MessageActions>
                      <CopyButton text={text} />
                    </MessageActions>
                  )}
                </Message>
              );
            })
          )}
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
