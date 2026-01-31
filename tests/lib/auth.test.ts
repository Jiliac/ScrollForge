import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { upsert: vi.fn() },
    conversation: { findFirst: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import {
  requireUserId,
  getOrCreateUser,
  requireConversationAccess,
} from "@/lib/auth";

const mockCreateClient = vi.mocked(createClient);
const mockPrisma = vi.mocked(prisma, true);
const mockRedirect = vi.mocked(redirect);
const mockNotFound = vi.mocked(notFound);

function mockSupabaseUser(user: { id: string; email?: string } | null) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUserId", () => {
  it("returns user.id when authenticated", async () => {
    mockSupabaseUser({ id: "user-123" });
    const result = await requireUserId();
    expect(result).toBe("user-123");
  });

  it("redirects to /login when no user", async () => {
    mockSupabaseUser(null);
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

describe("getOrCreateUser", () => {
  it("upserts Prisma User and returns it when authenticated with email", async () => {
    mockSupabaseUser({ id: "user-456", email: "a@b.com" });
    const fakeUser = { id: "user-456", email: "a@b.com" };
    mockPrisma.user.upsert.mockResolvedValue(fakeUser as never);

    const result = await getOrCreateUser();
    expect(result).toEqual(fakeUser);
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-456" },
      create: { id: "user-456", email: "a@b.com" },
      update: { email: "a@b.com" },
    });
  });

  it("redirects when no user", async () => {
    mockSupabaseUser(null);
    await expect(getOrCreateUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("throws when user has no email", async () => {
    mockSupabaseUser({ id: "user-789" });
    await expect(getOrCreateUser()).rejects.toThrow(
      "Account has no email address",
    );
  });
});

describe("requireConversationAccess", () => {
  it("returns userId when conversation belongs to user", async () => {
    mockSupabaseUser({ id: "user-111" });
    mockPrisma.conversation.findFirst.mockResolvedValue({
      id: "conv-1",
    } as never);

    const result = await requireConversationAccess("conv-1");
    expect(result).toBe("user-111");
    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "conv-1", userId: "user-111" },
      select: { id: true },
    });
  });

  it("calls notFound when conversation not found or wrong user", async () => {
    mockSupabaseUser({ id: "user-111" });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(requireConversationAccess("conv-x")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockNotFound).toHaveBeenCalled();
  });
});
