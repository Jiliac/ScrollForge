import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExchangeCodeForSession } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("GET /auth/callback", () => {
  it("redirects to / after successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(makeRequest({ code: "valid-code" }));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects to custom next path when provided", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      makeRequest({ code: "valid-code", next: "/dashboard" }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("sanitizes next param — rejects //evil.com", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      makeRequest({ code: "valid-code", next: "//evil.com" }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("sanitizes next param — rejects non-/ prefixed paths", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      makeRequest({ code: "valid-code", next: "http://evil.com" }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects to /login when no code provided", async () => {
    const response = await GET(makeRequest({}));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("redirects to /login when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("invalid"),
    });

    const response = await GET(makeRequest({ code: "bad-code" }));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });
});
