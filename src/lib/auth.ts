import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user.id;
}

export async function getOrCreateUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email) {
    throw new Error("Account has no email address");
  }

  return prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
    },
    update: {
      email: user.email,
    },
  });
}

export async function requireConversationAccess(
  conversationId: string,
): Promise<string> {
  const userId = await requireUserId();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });

  if (!conversation) {
    notFound();
  }

  return userId;
}

export async function requireGameAccess(gameId: string): Promise<string> {
  const userId = await requireUserId();

  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
    select: { id: true },
  });

  if (!game) {
    notFound();
  }

  return userId;
}

/**
 * Check game access without calling notFound(). For use in API routes
 * where we want to return a JSON error response instead.
 */
export async function checkGameAccess(gameId: string): Promise<string | null> {
  const userId = await requireUserId();

  const game = await prisma.game.findFirst({
    where: { id: gameId, userId },
    select: { id: true },
  });

  return game ? userId : null;
}
