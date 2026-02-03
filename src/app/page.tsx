import Link from "next/link";
import { PlusIcon, MessageSquareIcon, FileTextIcon } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function HomePage() {
  const userId = await requireUserId();

  const games = await prisma.game.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { conversations: true, files: true } },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Games</h1>
        <Link
          href="/games/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="size-4" />
          New Game
        </Link>
      </div>

      {games.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No games yet. Create your first game to get started.
            </p>
            <Link
              href="/games/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="size-4" />
              Create Game
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle>{game.name}</CardTitle>
                  {game.description && (
                    <CardDescription>{game.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquareIcon className="size-3" />
                      {game._count.conversations} conversations
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileTextIcon className="size-3" />
                      {game._count.files} files
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
