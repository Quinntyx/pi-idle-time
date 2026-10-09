/**
 * Minimal per-session persistence for the previous user-prompt timestamp.
 *
 * Writes are serialized per state file and committed with an atomic rename.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { sanitizeSessionId } from "./sanitize.js";

export interface SessionState {
  sessionId: string;
  lastUserPromptAt?: string | null;
}

const sessionLocks = new Map<string, Promise<unknown>>();

export function getSessionFilePath(dataDir: string, sessionId: string): string {
  return path.join(dataDir, "sessions", `${sanitizeSessionId(sessionId)}.json`);
}

function normalizeState(sessionId: string, value: unknown): SessionState {
  if (!value || typeof value !== "object") return { sessionId };

  const lastUserPromptAt = (value as Record<string, unknown>).lastUserPromptAt;
  return typeof lastUserPromptAt === "string" || lastUserPromptAt === null
    ? { sessionId, lastUserPromptAt }
    : { sessionId };
}

export async function loadSessionState(opts: {
  dataDir: string;
  sessionId: string;
}): Promise<SessionState> {
  const filePath = getSessionFilePath(opts.dataDir, opts.sessionId);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeState(opts.sessionId, JSON.parse(raw));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { sessionId: opts.sessionId };
    }

    if (error instanceof SyntaxError) {
      const quarantinePath = `${filePath}.corrupt-${Date.now()}`;
      try {
        await fs.rename(filePath, quarantinePath);
        process.stderr.write(`[pi-idle-time] quarantined corrupt state file: ${quarantinePath}\n`);
      } catch {
        // Preserve the original read failure behavior if quarantine is unavailable.
      }
      return { sessionId: opts.sessionId };
    }

    throw error;
  }
}

async function writeSessionState(filePath: string, state: SessionState): Promise<void> {
  const sessionDir = path.dirname(filePath);
  const tempFilePath = `${filePath}.${crypto.randomBytes(6).toString("hex")}.tmp`;

  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(tempFilePath, JSON.stringify(state));
  await fs.rename(tempFilePath, filePath);
}

async function withSessionLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = sessionLocks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  sessionLocks.set(key, next);

  try {
    return await next;
  } finally {
    if (sessionLocks.get(key) === next) sessionLocks.delete(key);
  }
}

/** Record a prompt and return the prior prompt timestamp, if one exists. */
export async function recordPromptTimestamp(opts: {
  dataDir: string;
  sessionId: string;
  timestamp: string;
}): Promise<string | null> {
  const filePath = getSessionFilePath(opts.dataDir, opts.sessionId);

  return withSessionLock(filePath, async () => {
    const current = await loadSessionState({ dataDir: opts.dataDir, sessionId: opts.sessionId });
    const previousPromptAt = current.lastUserPromptAt ?? null;
    await writeSessionState(filePath, {
      sessionId: opts.sessionId,
      lastUserPromptAt: opts.timestamp,
    });
    return previousPromptAt;
  });
}
