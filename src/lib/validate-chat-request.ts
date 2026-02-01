import type { UIMessage } from "ai";

export type ChatRequestBody = {
  messages: UIMessage[];
  conversationId: string;
};

type ValidationResult =
  | { success: true; data: ChatRequestBody }
  | { success: false; error: string };

export function validateRequestBody(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }

  const { messages, conversationId } = body as Record<string, unknown>;

  if (!conversationId || typeof conversationId !== "string") {
    return { success: false, error: "Missing or invalid conversationId" };
  }

  if (!messages || !Array.isArray(messages)) {
    return { success: false, error: "Missing or invalid messages" };
  }

  return {
    success: true,
    data: { messages: messages as UIMessage[], conversationId },
  };
}
