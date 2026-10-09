/** Formatting for the hidden per-prompt timing block. */

import { stripMs } from "./time.js";

function appendDuration(parts: string[], name: string, valueMs: number | null | undefined): void {
  if (typeof valueMs === "number" && Number.isFinite(valueMs) && valueMs >= 0) {
    parts.push(`${name}=${(valueMs / 1000).toFixed(1)}s`);
  }
}

export function formatTimingBlock(opts: {
  userMessageTime: string;
  elapsedSinceLastPromptMs?: number | null;
  isFirstPrompt?: boolean;
}): string {
  const lines: string[] = ["[timing]"];

  if (opts.userMessageTime) {
    const time = stripMs(opts.userMessageTime);
    lines.push(opts.isFirstPrompt ? `local_time=${time}` : time);
  }

  appendDuration(lines, "since_last_prompt", opts.elapsedSinceLastPromptMs);
  lines.push("[/timing]");
  return lines.join("\n");
}
