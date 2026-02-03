"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CreateGameForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const zipFile = fileInputRef.current?.files?.[0];

    if (!name.trim()) {
      setError("Game name is required");
      setSubmitting(false);
      return;
    }

    try {
      if (zipFile) {
        // Use API route for file upload
        const uploadData = new FormData();
        uploadData.set("name", name.trim());
        if (description.trim())
          uploadData.set("description", description.trim());
        uploadData.set("files", zipFile);

        const res = await fetch("/api/games", {
          method: "POST",
          body: uploadData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create game");
        }

        const { id } = await res.json();
        router.push(`/games/${id}`);
      } else {
        // Use server action for simple creation (no file)
        const { createGameAction } = await import("./actions");
        await createGameAction(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Dark Bazaar Campaign"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <input
          id="description"
          name="description"
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="A tale of intrigue in 11th century Persia"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="files">
          Game files (optional zip of .md and .yaml files)
        </Label>
        <input
          id="files"
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating..." : "Create Game"}
      </Button>
    </form>
  );
}
