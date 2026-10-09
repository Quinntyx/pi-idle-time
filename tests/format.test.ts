import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTimingBlock } from "../src/format.js";

describe("formatTimingBlock", () => {
  it("labels the first prompt timestamp as local_time", () => {
    assert.equal(
      formatTimingBlock({
        userMessageTime: "2026-10-09T18:46:14.789-05:00",
        isFirstPrompt: true,
        elapsedSinceLastPromptMs: null,
      }),
      ["[timing]", "local_time=2026-10-09T18:46:14-05:00", "[/timing]"].join("\n"),
    );
  });

  it("includes a bare timestamp and prompt-to-prompt duration later", () => {
    assert.equal(
      formatTimingBlock({
        userMessageTime: "2026-10-09T18:51:16.789-05:00",
        isFirstPrompt: false,
        elapsedSinceLastPromptMs: 302_000,
      }),
      [
        "[timing]",
        "2026-10-09T18:51:16-05:00",
        "since_last_prompt=302.0s",
        "[/timing]",
      ].join("\n"),
    );
  });

  it("omits invalid and negative elapsed values", () => {
    for (const elapsedSinceLastPromptMs of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const block = formatTimingBlock({
        userMessageTime: "2026-10-09T18:51:16.789-05:00",
        elapsedSinceLastPromptMs,
      });
      assert.equal(block.includes("since_last_prompt="), false);
    }
  });

  it("keeps zero as a meaningful elapsed value", () => {
    const block = formatTimingBlock({
      userMessageTime: "2026-10-09T18:51:16.789-05:00",
      elapsedSinceLastPromptMs: 0,
    });
    assert.match(block, /since_last_prompt=0\.0s/);
  });
});
