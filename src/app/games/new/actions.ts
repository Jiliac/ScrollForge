"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createGameAction(formData: FormData) {
  const userId = await requireUserId();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    throw new Error("Game name is required");
  }

  if (name.trim().length > 200) {
    throw new Error("Game name too long (max 200 characters)");
  }

  if (description && description.trim().length > 1000) {
    throw new Error("Description too long (max 1000 characters)");
  }

  const game = await prisma.game.create({
    data: {
      userId,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  redirect(`/games/${game.id}`);
}
