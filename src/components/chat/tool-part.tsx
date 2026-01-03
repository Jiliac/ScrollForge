"use client";

import { Dices, FileIcon, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolPartInfo = {
  type: string;
  toolCallId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  state: string;
};

const TOOL_LABELS: Record<string, string> = {
  write_file: "Write file",
  edit_file: "Edit file",
  create_image: "Create image",
  search_image: "Search image",
  twist_of_fate: "Twist of Fate",
};

const IMAGE_TOOLS = new Set(["create_image", "search_image"]);
const DICE_TOOLS = new Set(["twist_of_fate"]);

export type ToolPartProps = {
  tool: ToolPartInfo;
};

export function ToolPart({ tool }: ToolPartProps) {
  const toolName = tool.type.replace("tool-", "");
  const isImageTool = IMAGE_TOOLS.has(toolName);
  const isDiceTool = DICE_TOOLS.has(toolName);
  const label = TOOL_LABELS[toolName] || toolName;

  // Custom rendering for dice/fate tools
  if (isDiceTool) {
    const roll = tool.output?.roll as number | undefined;
    const outcome = tool.output?.outcome as string | undefined;
    const isComplete = tool.state === "output-available" && roll !== undefined;

    const rollColor =
      roll !== undefined
        ? roll <= 20
          ? "text-red-500"
          : roll >= 80
            ? "text-yellow-500"
            : "text-foreground"
        : "";

    return (
      <div className="mb-2 flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-sm text-muted-foreground">
        <Dices className="size-3" />
        <span>{label}</span>
        {isComplete ? (
          <>
            <span className={cn("font-bold", rollColor)}>{roll}</span>
            <span>—</span>
            <span className="italic text-foreground">{outcome}</span>
          </>
        ) : (
          <span className="text-xs">...</span>
        )}
      </div>
    );
  }

  const displayValue = isImageTool
    ? String(tool.input?.slug || tool.input?.query || "")
    : String(tool.input?.file_path || "unknown");

  return (
    <div className="mb-2 flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-sm text-muted-foreground">
      {isImageTool ? (
        <ImageIcon className="size-3" />
      ) : (
        <FileIcon className="size-3" />
      )}
      <span>
        {label}: {displayValue}
      </span>
      {tool.state === "output-available" && (
        <span className="text-xs text-primary">Done</span>
      )}
      {tool.state === "input-streaming" && (
        <span className="text-xs text-muted-foreground">...</span>
      )}
    </div>
  );
}
