"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareIcon, HomeIcon } from "lucide-react";
import { ChatSection } from "@/components/chat";
import { GameFilesList } from "@/components/game-files-list";
import { ImagePane } from "@/components/image-pane";

type GameInfo = {
  id: string;
  name: string;
  description: string | null;
};

type ConversationSummary = {
  id: string;
  updatedAt: string;
  preview: string;
};

type Props = {
  game: GameInfo;
  recentConversations: ConversationSummary[];
  initialImages: string[];
};

export function GameDashboardClient({
  game,
  recentConversations,
  initialImages,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [images, setImages] = useState<string[]>(initialImages);
  const [showHistory, setShowHistory] = useState(false);

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
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <Link
          href="/"
          className="p-2 text-primary hover:text-primary/80 transition-colors"
          aria-label="All Games"
          title="All Games"
        >
          <HomeIcon className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold leading-tight">{game.name}</h1>
          {game.description && (
            <p className="text-xs text-muted-foreground">{game.description}</p>
          )}
        </div>
      </div>

      {/* History toggle */}
      {recentConversations.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-4 right-4 z-10 p-2 text-primary hover:text-primary/80 transition-colors"
          aria-label="Conversation History"
          title="Conversation History"
        >
          <MessageSquareIcon className="size-5" />
        </button>
      )}

      {/* Left: Image Pane */}
      <div className="w-1/2 flex flex-col gap-4 pt-12">
        <ImagePane images={images} />
      </div>

      {/* Right: Chat + Files */}
      <div className="w-1/2 flex flex-col gap-4 pt-12">
        {showHistory && recentConversations.length > 0 && (
          <div className="rounded-lg border bg-card p-3 max-h-48 overflow-y-auto">
            <h2 className="text-xs font-bold text-muted-foreground mb-2">
              Recent Conversations
            </h2>
            <ul className="space-y-1">
              {recentConversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    className="block text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    <span className="text-muted-foreground/60">
                      {new Date(conv.updatedAt).toLocaleDateString()}{" "}
                    </span>
                    {conv.preview || "Empty conversation"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <GameFilesList refreshKey={refreshKey} gameId={game.id} />
        <ChatSection
          gameId={game.id}
          onToolComplete={handleToolComplete}
          onImageChange={handleImageChange}
        />
      </div>
    </main>
  );
}
