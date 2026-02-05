"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createGameAction(formData: FormData) {
  const userId = await requireUserId();
  const rawName = formData.get("name");
  const rawDescription = formData.get("description");

  const trimmedName = typeof rawName === "string" ? rawName.trim() : "";
  const trimmedDescription =
    typeof rawDescription === "string" && rawDescription.trim()
      ? rawDescription.trim()
      : null;

  if (trimmedName.length === 0) {
    throw new Error("Game name is required");
  }

  if (trimmedName.length > 200) {
    throw new Error("Game name too long (max 200 characters)");
  }

  if (trimmedDescription && trimmedDescription.length > 1000) {
    throw new Error("Description too long (max 1000 characters)");
  }

  const game = await prisma.game.create({
    data: {
      userId,
      name: trimmedName,
      description: trimmedDescription,
    },
  });

  redirect(`/games/${game.id}`);
}
