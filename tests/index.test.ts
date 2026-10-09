import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerIdleTimeExtension } from "../src/index.js";

type Listener = (event: any, ctx: any) => Promise<unknown> | unknown;

function createMockApi() {
  const listeners = new Map<string, Listener[]>();
  const sent: Array<{ message: any; options: any }> = [];
  const api = {
    on(event: string, listener: Listener) {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    },
    sendMessage(message: any, options: any) {
      sent.push({ message, options });
    },
  } as unknown as ExtensionAPI;
  return { api, listeners, sent };
}

async function sendInput(
  listener: Listener,
  sessionId: string,
  streamingBehavior: "steer" | "followUp" = "followUp",
): Promise<void> {
  await listener(
    { streamingBehavior },
    { sessionManager: { getSessionId: () => sessionId } },
  );
}

describe("extension entry point", () => {
  it("registers only the input lifecycle listener and no commands or tools", () => {
    const { api, listeners } = createMockApi();
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-index-"));
    registerIdleTimeExtension(api, dataDir);
    assert.deepEqual([...listeners.keys()], ["input"]);
    assert.equal(listeners.get("input")?.length, 1);
  });

  it("sends hidden timing context with the elapsed interval between prompts", async () => {
    const { api, listeners, sent } = createMockApi();
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-index-"));
    registerIdleTimeExtension(api, dataDir);
    const input = listeners.get("input")![0];
    const originalNow = process.env.PI_IDLE_TIMING_NOW_ISO;

    try {
      process.env.PI_IDLE_TIMING_NOW_ISO = "2026-10-09T18:46:14.000-05:00";
      await sendInput(input, "session-1");
      process.env.PI_IDLE_TIMING_NOW_ISO = "2026-10-09T18:51:16.000-05:00";
      await sendInput(input, "session-1");
    } finally {
      if (originalNow === undefined) delete process.env.PI_IDLE_TIMING_NOW_ISO;
      else process.env.PI_IDLE_TIMING_NOW_ISO = originalNow;
    }

    assert.equal(sent.length, 2);
    assert.deepEqual(sent[0], {
      message: {
        customType: "idle-time",
        content: [
          "[timing]",
          "local_time=2026-10-09T18:46:14-05:00",
          "[/timing]",
        ].join("\n"),
        display: false,
      },
      options: { deliverAs: "followUp" },
    });
    assert.match(sent[1].message.content, /since_last_prompt=302\.0s/);
  });

  it("ignores steering input", async () => {
    const { api, listeners, sent } = createMockApi();
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-index-"));
    registerIdleTimeExtension(api, dataDir);
    await sendInput(listeners.get("input")![0], "session-1", "steer");
    assert.deepEqual(sent, []);
    assert.equal(fs.existsSync(path.join(dataDir, "sessions")), false);
  });
});
