"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileTextIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type GameFile = {
  name: string;
  content: string;
};

export function GameFilesList({
  refreshKey,
  gameId,
}: {
  refreshKey?: number;
  gameId: string;
}) {
  const [files, setFiles] = useState<GameFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/game-files?gameId=${encodeURIComponent(gameId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        setFiles(data.files || []);
        setError(false);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load game files:", err);
        setError(true);
        setLoading(false);
      });
  }, [refreshKey, gameId]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">Loading files...</div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive">Failed to load game files</div>
    );
  }

  if (files.length === 0) {
    return <div className="text-xs text-muted-foreground">No game files</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="text-xs">
      <CollapsibleTrigger className="flex w-full items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronDown
          className={`size-3 transition-transform ${isOpen ? "" : "-rotate-90"}`}
        />
        <FileTextIcon className="size-3" />
        <span>game_files/</span>
        <span className="text-muted-foreground/60">({files.length} files)</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 max-h-[5lh] overflow-y-auto">
        <ul className="space-y-0.5 pl-4">
          {files.map((file) => (
            <li key={file.name} className="text-muted-foreground truncate">
              {file.name}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
