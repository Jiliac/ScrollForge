"use client";

import { useState } from "react";
import Link from "next/link";
import type { UIMessage } from "ai";
import { SquarePenIcon } from "lucide-react";
import { ChatSection } from "@/components/chat";
import { GameFilesList } from "@/components/game-files-list";
import { ImagePane } from "@/components/image-pane";

type Props = {
  conversationId: string;
  initialMessages: UIMessage[];
  initialImages: string[];
};

export function ChatPageClient({
  conversationId,
  initialMessages,
  initialImages,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [images, setImages] = useState<string[]>(initialImages);

  const handleToolComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleImageChange = (imagePath: string) => {
    setImages((prev) =>
      prev.includes(imagePath) ? prev : [...prev, imagePath],
    );
  };

  return (
    <main className="relative flex h-screen p-4 gap-4">
      {/* New Chat Button - Top Right */}
      <Link
        href="/"
        className="absolute top-4 right-4 z-10 p-2 text-primary hover:text-primary/80 transition-colors"
        title="New Chat"
      >
        <SquarePenIcon className="size-5" />
      </Link>

      {/* Left: Image Pane */}
      <div className="w-1/2 flex flex-col gap-4">
        <ImagePane images={images} />
      </div>

      {/* Right: Chat */}
      <div className="w-1/2 flex flex-col gap-4">
        <GameFilesList refreshKey={refreshKey} />
        <ChatSection
          conversationId={conversationId}
          initialMessages={initialMessages}
          onToolComplete={handleToolComplete}
          onImageChange={handleImageChange}
        />
      </div>
    </main>
  );
}
