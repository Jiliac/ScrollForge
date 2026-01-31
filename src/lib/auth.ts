import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return user.id;
}

export async function getOrCreateUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!user.email) {
    throw new Response("Account has no email address", { status: 400 });
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
    throw new Response("Not found", { status: 404 });
  }

  return userId;
}
