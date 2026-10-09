# pi-idle-time

Pi extension that injects hidden wall-clock and prompt-to-prompt elapsed timing
context for each non-steering user prompt.

## Architecture

This is a Pi extension distributed as an npm package. It registers only the
`input` lifecycle hook.

```text
src/
  index.ts     — extension entry point and hidden timing-message delivery
  format.ts    — `[timing]` block formatting
  time.ts      — local ISO timestamp and elapsed-time utilities
  sanitize.ts  — session ID sanitization
  state.ts     — minimal per-session prompt timestamp persistence
```

## Timing semantics

- First prompt: `local_time=<local ISO timestamp>`.
- Later prompts: bare local ISO timestamp plus
  `since_last_prompt=<seconds to one decimal>`.
- Steering input is ignored.
- Timing messages use `customType: "idle-time"`, `display: false`, and
  `deliverAs: "followUp"`.

## State

State is stored at `~/.pi/idle-time/sessions/<session-id>.json` and contains
only `sessionId` and `lastUserPromptAt`. Writes are serialized per state file
and use temp-file rename. Legacy fields are ignored and removed on the next
write.

## Development

```bash
pnpm test
pnpm check
```
