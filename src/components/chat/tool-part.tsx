"use client";

import { FileIcon, ImageIcon } from "lucide-react";

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
};

const IMAGE_TOOLS = new Set(["create_image", "search_image"]);

export type ToolPartProps = {
  tool: ToolPartInfo;
};

export function ToolPart({ tool }: ToolPartProps) {
  const toolName = tool.type.replace("tool-", "");
  const isImageTool = IMAGE_TOOLS.has(toolName);
  const label = TOOL_LABELS[toolName] || toolName;

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
