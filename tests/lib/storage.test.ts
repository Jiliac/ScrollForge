import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockUpload = vi.fn();
const mockRemove = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
      })),
    },
  })),
}));

import { getImageUrl, uploadImage, deleteImage } from "@/lib/storage";

const originalEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SECRET_KEY,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "secret-key";
});

afterEach(() => {
  if (originalEnv.url === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.url;
  }
  if (originalEnv.key === undefined) {
    delete process.env.SUPABASE_SECRET_KEY;
  } else {
    process.env.SUPABASE_SECRET_KEY = originalEnv.key;
  }
});

describe("getImageUrl", () => {
  it("builds public URL from storage path", () => {
    const url = getImageUrl("games/abc/images/hero.jpeg");
    expect(url).toBe(
      "https://xyz.supabase.co/storage/v1/object/public/game-images/games/abc/images/hero.jpeg",
    );
  });

  it("throws for missing NEXT_PUBLIC_SUPABASE_URL", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getImageUrl("games/abc/images/hero.jpeg")).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("rejects paths not starting with games/", () => {
    expect(() => getImageUrl("other/path.jpeg")).toThrow(
      "Invalid storage path",
    );
  });

  it("rejects paths with directory traversal", () => {
    expect(() => getImageUrl("games/../etc/passwd")).toThrow(
      "Invalid storage path",
    );
  });
});

describe("uploadImage", () => {
  it("uploads buffer and returns storage key", async () => {
    mockUpload.mockResolvedValueOnce({ error: null });

    const key = await uploadImage(
      "game-1",
      "hero-portrait",
      Buffer.from("img"),
    );

    expect(key).toBe("games/game-1/images/hero-portrait.jpeg");
    expect(mockUpload).toHaveBeenCalledWith(
      "games/game-1/images/hero-portrait.jpeg",
      expect.any(Buffer),
      { contentType: "image/jpeg", upsert: true },
    );
  });

  it("throws on upload failure", async () => {
    mockUpload.mockResolvedValueOnce({
      error: { message: "Bucket not found" },
    });

    await expect(
      uploadImage("game-1", "hero", Buffer.from("img")),
    ).rejects.toThrow("Storage upload failed: Bucket not found");
  });

  it("sanitizes slug — strips invalid characters", async () => {
    mockUpload.mockResolvedValueOnce({ error: null });

    const key = await uploadImage("game-1", "hero/../evil", Buffer.from("img"));

    expect(key).toBe("games/game-1/images/heroevil.jpeg");
  });

  it("rejects empty slug after sanitization", async () => {
    await expect(
      uploadImage("game-1", "../../..", Buffer.from("img")),
    ).rejects.toThrow("Invalid image slug");
  });

  it("rejects invalid gameId", async () => {
    await expect(
      uploadImage("../etc", "hero", Buffer.from("img")),
    ).rejects.toThrow("Invalid gameId");
  });

  it("rejects empty gameId", async () => {
    await expect(uploadImage("", "hero", Buffer.from("img"))).rejects.toThrow(
      "Invalid gameId",
    );
  });
});

describe("deleteImage", () => {
  it("removes file from storage", async () => {
    mockRemove.mockResolvedValueOnce({ error: null });

    await deleteImage("games/game-1/images/hero.jpeg");

    expect(mockRemove).toHaveBeenCalledWith(["games/game-1/images/hero.jpeg"]);
  });

  it("throws on delete failure", async () => {
    mockRemove.mockResolvedValueOnce({
      error: { message: "Not found" },
    });

    await expect(deleteImage("games/game-1/images/hero.jpeg")).rejects.toThrow(
      "Storage delete failed: Not found",
    );
  });

  it("rejects invalid storage path", async () => {
    await expect(deleteImage("../etc/passwd")).rejects.toThrow(
      "Invalid storage path",
    );
  });
});
