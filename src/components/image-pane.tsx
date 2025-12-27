"use client";

import { ImageIcon } from "lucide-react";

interface ImagePaneProps {
  imagePath: string | null;
}

export function ImagePane({ imagePath }: ImagePaneProps) {
  if (!imagePath) {
    return (
      <div className="flex h-full items-center justify-center bg-card rounded-lg border">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-12 opacity-50" />
          <span className="text-sm">No image</span>
        </div>
      </div>
    );
  }

  // Convert game_files path to API path
  // imagePath could be "images/bazaar-morning.jpeg" or full path
  const apiPath = imagePath.startsWith("images/")
    ? `/api/${imagePath}`
    : `/api/images/${imagePath}`;

  return (
    <div className="flex h-full items-center justify-center bg-card rounded-lg border overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={apiPath}
        alt="Scene"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
