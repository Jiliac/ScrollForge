import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignInWithPassword, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  }),
}));

vi.mock("@/lib/auth", () => ({
  getOrCreateUser: vi.fn().mockResolvedValue({ id: "user-1" }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { login, signup } from "@/app/login/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFormData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("login", () => {
  it("returns error for missing email", async () => {
    const result = await login(makeFormData({ password: "pass123" }));
    expect(result).toEqual({ error: "Email is required" });
  });

  it("returns error for empty email", async () => {
    const result = await login(makeFormData({ email: "  ", password: "pass" }));
    expect(result).toEqual({ error: "Email is required" });
  });

  it("returns error for missing password", async () => {
    const result = await login(makeFormData({ email: "a@b.com" }));
    expect(result).toEqual({ error: "Password is required" });
  });

  it("returns Supabase error message on auth failure", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });

    const result = await login(
      makeFormData({ email: "a@b.com", password: "wrong" }),
    );
    expect(result).toEqual({ error: "Invalid credentials" });
  });

  it("calls getOrCreateUser and redirects on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    await expect(
      login(makeFormData({ email: "a@b.com", password: "correct" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    const { getOrCreateUser } = await import("@/lib/auth");
    expect(getOrCreateUser).toHaveBeenCalled();
  });

  it("trims email whitespace", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    await expect(
      login(makeFormData({ email: "  a@b.com  ", password: "pass" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pass",
    });
  });
});

describe("signup", () => {
  it("returns error for missing email", async () => {
    const result = await signup(makeFormData({ password: "pass123" }));
    expect(result).toEqual({ error: "Email is required" });
  });

  it("returns Supabase error message on auth failure", async () => {
    mockSignUp.mockResolvedValue({
      data: {},
      error: { message: "Email taken" },
    });

    const result = await signup(
      makeFormData({ email: "a@b.com", password: "pass" }),
    );
    expect(result).toEqual({ error: "Email taken" });
  });

  it("returns email confirmation message when user exists but no session", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u-1" }, session: null },
      error: null,
    });

    const result = await signup(
      makeFormData({ email: "a@b.com", password: "pass" }),
    );
    expect(result).toEqual({
      error: "Check your email for a confirmation link.",
    });
  });

  it("calls getOrCreateUser and redirects on success", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "u-1" }, session: { access_token: "tok" } },
      error: null,
    });

    await expect(
      signup(makeFormData({ email: "a@b.com", password: "pass" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    const { getOrCreateUser } = await import("@/lib/auth");
    expect(getOrCreateUser).toHaveBeenCalled();
  });
});
