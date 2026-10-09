import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { formatTimingBlock } from "../src/format.js";
import { recordPromptTimestamp } from "../src/state.js";
import { diffMs } from "../src/time.js";

describe("prompt timing integration", () => {
  it("records and formats elapsed time between user prompts", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "idle-time-integration-"));
    const sessionId = "session-1";
    const first = "2026-10-09T18:46:14.000-05:00";
    const second = "2026-10-09T18:51:16.000-05:00";

    const beforeFirst = await recordPromptTimestamp({ dataDir, sessionId, timestamp: first });
    assert.equal(
      formatTimingBlock({
        userMessageTime: first,
        isFirstPrompt: beforeFirst === null,
        elapsedSinceLastPromptMs: diffMs(first, beforeFirst),
      }),
      ["[timing]", "local_time=2026-10-09T18:46:14-05:00", "[/timing]"].join("\n"),
    );

    const beforeSecond = await recordPromptTimestamp({ dataDir, sessionId, timestamp: second });
    assert.equal(
      formatTimingBlock({
        userMessageTime: second,
        isFirstPrompt: beforeSecond === null,
        elapsedSinceLastPromptMs: diffMs(second, beforeSecond),
      }),
      [
        "[timing]",
        "2026-10-09T18:51:16-05:00",
        "since_last_prompt=302.0s",
        "[/timing]",
      ].join("\n"),
    );
  });
});
