"use client";

import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageActions,
} from "@/components/ai-elements/message";
import { MessagePart } from "./message-part";
import { CopyButton } from "./copy-button";
import type { AgentProgressData } from "./agent-progress";

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text || "")
      .join("") || ""
  );
}

export type MessageParts = NonNullable<UIMessage["parts"]>;
type AgentProgressPart = {
  type: "data-agent-progress";
  data: AgentProgressData;
};

/**
 * Deduplicate agent progress parts - only keep the latest state per agent.
 * This prevents showing both "Planning..." and "Planned: done" simultaneously.
 * For faction_turn, we use agent+faction as the key to show each faction separately.
 */
export function dedupeAgentProgress(parts: MessageParts): MessageParts {
  // Track latest progress per agent (use agent+faction for faction_turn)
  const latestByAgent = new Map<
    string,
    { index: number; part: AgentProgressPart }
  >();

  parts.forEach((part, index) => {
    if (part.type === "data-agent-progress") {
      const progressPart = part as AgentProgressPart;
      const { agent, faction } = progressPart.data;
      // Use agent+faction as key for faction_turn to show each faction separately
      const key =
        agent === "faction_turn" && faction ? `${agent}:${faction}` : agent;
      latestByAgent.set(key, { index, part: progressPart });
    }
  });

  // Build result: non-progress parts + only latest progress per agent
  const progressIndices = new Set(
    Array.from(latestByAgent.values()).map((v) => v.index),
  );

  return parts.filter((part, index) => {
    if (part.type !== "data-agent-progress") return true;
    return progressIndices.has(index);
  });
}

type EmptyStateProps = {
  children?: React.ReactNode;
};

function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {children || "Start a conversation"}
    </div>
  );
}

export type MessageListProps = {
  messages: UIMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </>
  );
}

type MessageItemProps = {
  message: UIMessage;
};

function MessageItem({ message }: MessageItemProps) {
  const text = getMessageText(message);

  if (message.role === "user") {
    return (
      <Message from="user">
        <MessageContent>
          {(message.parts || []).map((part, index) => (
            <MessagePart key={index} part={part} />
          ))}
        </MessageContent>
      </Message>
    );
  }

  // Dedupe agent progress to only show latest state per agent
  const parts = dedupeAgentProgress(message.parts || []);

  return (
    <Message from="assistant">
      <MessageContent>
        {parts.map((part, index) => (
          <MessagePart key={index} part={part} />
        ))}
      </MessageContent>
      {text && (
        <MessageActions>
          <CopyButton text={text} />
        </MessageActions>
      )}
    </Message>
  );
}
