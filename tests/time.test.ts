import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffMs, getNowIso, stripMs, toLocalIso } from "../src/time.js";

describe("time", () => {
  it("getNowIso prefers the deterministic test override", () => {
    assert.equal(
      getNowIso({ PI_IDLE_TIMING_NOW_ISO: "2026-10-09T18:46:14.789-05:00" }),
      "2026-10-09T18:46:14.789-05:00",
    );
  });

  it("diffMs returns null when either timestamp is unavailable or malformed", () => {
    assert.equal(diffMs("2026-10-09T18:46:14.789Z", undefined), null);
    assert.equal(diffMs(undefined, "2026-10-09T18:46:14.789Z"), null);
    assert.equal(diffMs("not-a-timestamp", "2026-10-09T18:46:14.789Z"), null);
  });

  it("diffMs returns millisecond deltas", () => {
    assert.equal(diffMs("2026-10-09T18:46:31.578Z", "2026-10-09T18:46:14.789Z"), 16_789);
  });

  it("stripMs preserves the timezone suffix", () => {
    assert.equal(stripMs("2026-10-09T18:46:14.789-05:00"), "2026-10-09T18:46:14-05:00");
    assert.equal(stripMs("2026-10-09T18:46:14.789Z"), "2026-10-09T18:46:14Z");
    assert.equal(stripMs("2026-10-09T18:46:14-05:00"), "2026-10-09T18:46:14-05:00");
  });

  it("toLocalIso emits an explicit offset with millisecond precision", () => {
    const fakeDate = {
      getFullYear: () => 2026,
      getMonth: () => 9,
      getDate: () => 9,
      getHours: () => 18,
      getMinutes: () => 46,
      getSeconds: () => 14,
      getMilliseconds: () => 789,
      getTimezoneOffset: () => 300,
    } as unknown as Date;

    assert.equal(toLocalIso(fakeDate), "2026-10-09T18:46:14.789-05:00");
  });
});
