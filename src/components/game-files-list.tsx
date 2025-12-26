"use client";

import { useEffect, useState } from "react";
import { FileTextIcon } from "lucide-react";

type GameFile = {
  name: string;
  content: string;
};

export function GameFilesList({ refreshKey }: { refreshKey?: number }) {
  const [files, setFiles] = useState<GameFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/game-files")
      .then((res) => res.json())
      .then((data) => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">Loading files...</div>
    );
  }

  if (files.length === 0) {
    return <div className="text-xs text-muted-foreground">No game files</div>;
  }

  return (
    <div className="max-h-[5lh] overflow-y-auto text-xs">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        <FileTextIcon className="size-3" />
        <span>game_files/</span>
      </div>
      <ul className="space-y-0.5 pl-4">
        {files.map((file) => (
          <li key={file.name} className="text-muted-foreground truncate">
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
