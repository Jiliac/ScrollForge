"use client";

import { useState } from "react";
import { ChatSection } from "@/components/chat";
import { GameFilesList } from "@/components/game-files-list";
import { ImagePane } from "@/components/image-pane";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  const handleToolComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleImageChange = (imagePath: string) => {
    setImages((prev) =>
      prev.includes(imagePath) ? prev : [...prev, imagePath],
    );
  };

  return (
    <main className="flex h-screen p-4 gap-4">
      {/* Left: Image Pane */}
      <div className="w-1/2 flex flex-col gap-4">
        <ImagePane images={images} />
      </div>

      {/* Right: Chat */}
      <div className="w-1/2 flex flex-col gap-4">
        <GameFilesList refreshKey={refreshKey} />
        <ChatSection
          onToolComplete={handleToolComplete}
          onImageChange={handleImageChange}
        />
      </div>
    </main>
  );
}
