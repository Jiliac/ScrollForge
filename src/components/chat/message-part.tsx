"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { ToolPart, type ToolPartInfo } from "./tool-part";

type TextPart = {
  type: "text";
  text: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessagePartData =
  | TextPart
  | ToolPartInfo
  | { type: string; [key: string]: any };

export type MessagePartProps = {
  part: MessagePartData;
};

export function MessagePart({ part }: MessagePartProps) {
  if (part.type === "text" && "text" in part) {
    const text = part.text as string;
    if (!text) {
      return null;
    }
    return <MessageResponse>{text}</MessageResponse>;
  }

  if (part.type.startsWith("tool-") && part.type !== "tool-result") {
    return <ToolPart tool={part as ToolPartInfo} />;
  }

  return null;
}
