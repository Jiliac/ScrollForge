"use client";

import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageActions,
} from "@/components/ai-elements/message";
import { MessagePart, type MessagePartData } from "./message-part";
import { CopyButton } from "./copy-button";

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text || "")
      .join("") || ""
  );
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
          <p>{text}</p>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from="assistant">
      <MessageContent>
        {message.parts?.map((part, index) => (
          <MessagePart key={index} part={part as MessagePartData} />
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
