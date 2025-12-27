"use client";

import { useState } from "react";
import { ChatSection } from "@/components/chat";
import { GameFilesList } from "@/components/game-files-list";
import { ImagePane } from "@/components/image-pane";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const handleToolComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleImageChange = (imagePath: string) => {
    setCurrentImage(imagePath);
  };

  return (
    <main className="flex h-screen p-4 gap-4">
      {/* Left: Image Pane */}
      <div className="w-1/2 flex flex-col gap-4">
        <ImagePane imagePath={currentImage} />
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
