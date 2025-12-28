"use client";

import { useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";

interface ImagePaneProps {
  images: string[];
}

function getApiPath(imagePath: string): string {
  return imagePath.startsWith("images/")
    ? `/api/${imagePath}`
    : `/api/images/${imagePath}`;
}

export function ImagePane({ images }: ImagePaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new images are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-12 opacity-50" />
          <span className="text-sm">No images</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto rounded-lg border bg-card"
    >
      <div className="grid grid-cols-2 gap-2 p-2">
        {images.map((imagePath, index) => (
          <div
            key={`${imagePath}-${index}`}
            className="aspect-square overflow-hidden rounded-md bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getApiPath(imagePath)}
              alt={`Image ${index + 1}`}
              className="size-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
