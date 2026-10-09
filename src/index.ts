/**
 * pi-idle-time — inject wall-clock and prompt-to-prompt timing context.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as os from "node:os";
import * as path from "node:path";
import { formatTimingBlock } from "./format.js";
import { recordPromptTimestamp } from "./state.js";
import { diffMs, getNowIso } from "./time.js";

function resolveDataDir(): string {
  return path.join(os.homedir(), ".pi", "idle-time");
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

export function registerIdleTimeExtension(pi: ExtensionAPI, dataDir = resolveDataDir()): void {
  pi.on("input", async (event, ctx) => {
    // Steering text belongs to the active turn, not a new user prompt.
    if (event.streamingBehavior === "steer") return;

    const sessionId = ctx.sessionManager.getSessionId?.() ?? "default";
    const now = getNowIso();

    try {
      const previousPromptAt = await recordPromptTimestamp({
        dataDir,
        sessionId,
        timestamp: now,
      });
      const elapsedSinceLastPromptMs = diffMs(now, previousPromptAt);
      const timingBlock = formatTimingBlock({
        userMessageTime: now,
        isFirstPrompt: previousPromptAt === null,
        elapsedSinceLastPromptMs,
      });

      pi.sendMessage(
        {
          customType: "idle-time",
          content: timingBlock,
          display: false,
        },
        { deliverAs: "followUp" },
      );
    } catch (error) {
      process.stderr.write(`[pi-idle-time] input failed: ${describeError(error)}\n`);
    }
  });
}

export default function idleTimeExtension(pi: ExtensionAPI): void {
  registerIdleTimeExtension(pi);
}
