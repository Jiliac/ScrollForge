"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

type ToolPartInfo = {
  type: string;
  toolCallId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  state: string;
};

function isToolPart(p: unknown): p is ToolPartInfo {
  return (
    typeof p === "object" &&
    p !== null &&
    "type" in p &&
    typeof (p as { type: unknown }).type === "string" &&
    (p as { type: string }).type.startsWith("tool-") &&
    (p as { type: string }).type !== "tool-result" &&
    "toolCallId" in p
  );
}

function getToolParts(message: UIMessage): ToolPartInfo[] {
  if (!message.parts) return [];
  const result: ToolPartInfo[] = [];
  for (const part of message.parts) {
    if (isToolPart(part)) {
      result.push(part);
    }
  }
  return result;
}

export function useChatEffects(
  messages: UIMessage[],
  onToolComplete?: () => void,
  onImageChange?: (imagePath: string) => void,
) {
  const processedToolsRef = useRef<Set<string>>(new Set());
  const processedImageToolsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let didComplete = false;

    for (const message of messages) {
      const toolParts = getToolParts(message);
      for (const tool of toolParts) {
        if (
          tool.state === "output-available" &&
          !processedToolsRef.current.has(tool.toolCallId)
        ) {
          processedToolsRef.current.add(tool.toolCallId);
          didComplete = true;

          const toolName = tool.type.replace("tool-", "");
          if (
            (toolName === "create_image" || toolName === "search_image") &&
            tool.output?.path &&
            !processedImageToolsRef.current.has(tool.toolCallId)
          ) {
            processedImageToolsRef.current.add(tool.toolCallId);
            onImageChange?.(String(tool.output.path));
          }
        }
      }
    }

    if (didComplete) {
      onToolComplete?.();
    }
  }, [messages, onToolComplete, onImageChange]);
}
