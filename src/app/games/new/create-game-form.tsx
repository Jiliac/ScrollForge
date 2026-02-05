"use client";

import { useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createGameAction } from "./actions";

export function CreateGameForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;

    if (!name.trim()) {
      setError("Game name is required");
      setSubmitting(false);
      return;
    }

    try {
      await createGameAction(formData);
    } catch (err) {
      if (isRedirectError(err)) throw err;
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating..." : "Create Game"}
      </Button>
    </form>
  );
}
