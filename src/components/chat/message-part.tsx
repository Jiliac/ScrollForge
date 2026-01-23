"use client";

import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { ToolPart, type ToolPartInfo } from "./tool-part";
import {
  AgentProgressIndicator,
  type AgentProgressData,
} from "./agent-progress";

export type MessagePartProps = {
  part: UIMessagePart<UIDataTypes, UITools>;
};

// Strip markdown image syntax: ![alt](url)
function stripMarkdownImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
}

export function MessagePart({ part }: MessagePartProps) {
  if (part.type === "text") {
    const text = stripMarkdownImages(part.text);
    if (!text) {
      return null;
    }
    return <MessageResponse>{text}</MessageResponse>;
  }

  if (part.type.startsWith("tool-") && part.type !== "tool-result") {
    return <ToolPart tool={part as ToolPartInfo} />;
  }

  if (part.type === "data-agent-progress") {
    const data = (part as { type: string; data: AgentProgressData }).data;
    return <AgentProgressIndicator progress={data} />;
  }

  return null;
}
