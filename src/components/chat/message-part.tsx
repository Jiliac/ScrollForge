"use client";

import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { ToolPart, type ToolPartInfo } from "./tool-part";

export type MessagePartProps = {
  part: UIMessagePart<UIDataTypes, UITools>;
};

export function MessagePart({ part }: MessagePartProps) {
  if (part.type === "text") {
    if (!part.text) {
      return null;
    }
    return <MessageResponse>{part.text}</MessageResponse>;
  }

  if (part.type.startsWith("tool-") && part.type !== "tool-result") {
    return <ToolPart tool={part as ToolPartInfo} />;
  }

  return null;
}
