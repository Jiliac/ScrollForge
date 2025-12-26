"use client";

import { useState } from "react";
import { ChatSection } from "@/components/chat";
import { GameFilesList } from "@/components/game-files-list";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleToolComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <div className="w-full max-w-3xl flex-1 flex flex-col gap-4">
        <GameFilesList refreshKey={refreshKey} />
        <ChatSection onToolComplete={handleToolComplete} />
      </div>
    </main>
  );
}
