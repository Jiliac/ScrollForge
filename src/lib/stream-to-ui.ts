import type { StreamTextResult } from "ai";

/**
 * Manual implementation of stream-to-UI conversion.
 * Based on the Vercel AI SDK's toUIMessageStream implementation.
 * See: packages/ai/src/generate-text/stream-text.ts
 *
 * Maps fullStream events to UI message chunks:
 * - text-delta → text-delta (delta: part.text)
 * - tool-call → tool-input-available
 * - tool-result → tool-output-available
 */
// Tools with large inputs that shouldn't stream deltas to the frontend
const SKIP_DELTA_TOOLS = new Set(["write_file", "edit_file"]);

export async function streamToUI(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: StreamTextResult<any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writer: any,
) {
  // Track toolCallId -> toolName to filter deltas for file operations
  const toolCallNames = new Map<string, string>();

  for await (const part of result.fullStream) {
    switch (part.type) {
      // Text events - pass through with renamed property
      case "text-start":
        writer.write({ type: "text-start", id: part.id });
        break;

      case "text-delta":
        writer.write({ type: "text-delta", id: part.id, delta: part.text });
        break;

      case "text-end":
        writer.write({ type: "text-end", id: part.id });
        break;

      // Reasoning events - pass through with renamed property
      case "reasoning-start":
        writer.write({ type: "reasoning-start", id: part.id });
        break;

      case "reasoning-delta":
        writer.write({
          type: "reasoning-delta",
          id: part.id,
          delta: part.text,
        });
        break;

      case "reasoning-end":
        writer.write({ type: "reasoning-end", id: part.id });
        break;

      // Tool input streaming
      case "tool-input-start":
        toolCallNames.set(part.id, part.toolName);
        writer.write({
          type: "tool-input-start",
          toolCallId: part.id,
          toolName: part.toolName,
          dynamic: part.dynamic,
        });
        break;

      case "tool-input-delta": {
        // Skip deltas for file operations (content can be very large)
        const toolName = toolCallNames.get(part.id);
        if (toolName && SKIP_DELTA_TOOLS.has(toolName)) {
          break;
        }
        writer.write({
          type: "tool-input-delta",
          toolCallId: part.id,
          inputTextDelta: part.delta,
        });
        break;
      }

      case "tool-input-end":
        // Ignored in UI stream
        break;

      // Tool call complete → tool-input-available
      case "tool-call":
        writer.write({
          type: "tool-input-available",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
          dynamic: part.dynamic,
        });
        break;

      // Tool result → tool-output-available
      case "tool-result":
        writer.write({
          type: "tool-output-available",
          toolCallId: part.toolCallId,
          output: part.output,
          dynamic: part.dynamic,
        });
        break;

      // Tool error → tool-output-error
      case "tool-error":
        writer.write({
          type: "tool-output-error",
          toolCallId: part.toolCallId,
          errorText: String(part.error),
          dynamic: part.dynamic,
        });
        break;

      // Step boundaries - skip these as they're handled by the caller
      case "start-step":
      case "finish-step":
        break;

      // Stream lifecycle
      case "start":
        writer.write({ type: "start" });
        break;

      case "finish":
        writer.write({ type: "finish", finishReason: part.finishReason });
        break;

      case "error":
        writer.write({ type: "error", errorText: String(part.error) });
        break;

      case "abort":
        writer.write(part);
        break;

      // Ignored events
      case "source":
      case "file":
      case "raw":
        break;

      default:
        console.log("[streamToUI] Unhandled:", (part as { type: string }).type);
    }
  }
}
