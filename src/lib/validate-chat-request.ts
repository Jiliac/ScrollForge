import type { UIMessage } from "ai";
import { z } from "zod";

/** Validates essential UIMessage fields; passthrough allows extra SDK fields. */
const messageSchema = z
  .object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.record(z.unknown())),
  })
  .passthrough();

const requestBodySchema = z.object({
  conversationId: z.string().min(1),
  messages: z.array(messageSchema).min(1),
});

export type ChatRequestBody = z.infer<typeof requestBodySchema> & {
  messages: UIMessage[];
};

type ValidationResult =
  | { success: true; data: ChatRequestBody }
  | { success: false; error: string };

export function validateRequestBody(body: unknown): ValidationResult {
  const result = requestBodySchema.safeParse(body);

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  return {
    success: true,
    data: result.data as ChatRequestBody,
  };
}
