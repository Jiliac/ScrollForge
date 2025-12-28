"use client";

import { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { MessageAction } from "@/components/ai-elements/message";

export type CopyButtonProps = {
  text: string;
};

export function CopyButton({ text }: CopyButtonProps) {
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
