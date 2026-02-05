import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateGameForm } from "./create-game-form";

export default async function NewGamePage() {
  await requireUserId();

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to games
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateGameForm />
        </CardContent>
      </Card>
    </main>
  );
}
