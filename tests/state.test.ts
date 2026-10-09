import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { getSessionFilePath, loadSessionState, recordPromptTimestamp } from "../src/state.js";

describe("prompt timestamp state", () => {
  it("returns an empty state for a new session", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    assert.deepEqual(await loadSessionState({ dataDir, sessionId: "session-1" }), {
      sessionId: "session-1",
    });
  });

  it("keeps sanitized session files inside the sessions directory", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    const filePath = getSessionFilePath(dataDir, "../session-1");
    assert.equal(filePath, path.join(dataDir, "sessions", ".._session-1.json"));
  });

  it("records a prompt and returns the prior prompt timestamp", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    const sessionId = "session-1";
    const first = "2026-10-09T18:46:14.000-05:00";
    const second = "2026-10-09T18:51:16.000-05:00";

    assert.equal(await recordPromptTimestamp({ dataDir, sessionId, timestamp: first }), null);
    assert.equal(await recordPromptTimestamp({ dataDir, sessionId, timestamp: second }), first);
    assert.deepEqual(await loadSessionState({ dataDir, sessionId }), {
      sessionId,
      lastUserPromptAt: second,
    });
  });

  it("drops fields left by older versions on the next prompt", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    const sessionId = "session-1";
    const filePath = getSessionFilePath(dataDir, sessionId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        sessionId,
        lastUserPromptAt: "2026-10-09T18:46:14.000-05:00",
        lastStopAt: "obsolete",
        heartbeatEnabled: true,
        activeGoal: "obsolete",
      }),
    );

    await recordPromptTimestamp({
      dataDir,
      sessionId,
      timestamp: "2026-10-09T18:51:16.000-05:00",
    });

    assert.deepEqual(JSON.parse(fs.readFileSync(filePath, "utf8")), {
      sessionId,
      lastUserPromptAt: "2026-10-09T18:51:16.000-05:00",
    });
  });

  it("serializes concurrent writes without leaving temp files", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    const sessionId = "session-1";
    const timestamps = Array.from(
      { length: 25 },
      (_, index) => `2026-10-09T18:46:${String(index).padStart(2, "0")}.000-05:00`,
    );

    await Promise.all(
      timestamps.map((timestamp) => recordPromptTimestamp({ dataDir, sessionId, timestamp })),
    );

    const loaded = await loadSessionState({ dataDir, sessionId });
    assert.equal(loaded.lastUserPromptAt, timestamps.at(-1));
    assert.equal(
      fs.readdirSync(path.join(dataDir, "sessions")).some((name) => name.endsWith(".tmp")),
      false,
    );
  });

  it("quarantines malformed state", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-state-"));
    const sessionId = "session-1";
    const filePath = getSessionFilePath(dataDir, sessionId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "{ invalid json");

    const originalWrite = process.stderr.write;
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
      assert.deepEqual(await loadSessionState({ dataDir, sessionId }), { sessionId });
    } finally {
      process.stderr.write = originalWrite;
    }

    const entries = fs.readdirSync(path.dirname(filePath));
    assert.ok(entries.some((name) => name.startsWith("session-1.json.corrupt-")));
  });
});
