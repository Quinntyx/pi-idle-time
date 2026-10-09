# pi-idle-time

A minimal Pi extension that gives the model wall-clock context and the elapsed
interval since the previous user prompt.

## Behavior

For each non-steering user prompt, the extension injects a hidden user-role
message. The first prompt in a session looks like:

```text
[timing]
local_time=2026-10-09T18:46:14-05:00
[/timing]
```

Later prompts include the current local timestamp and prompt-to-prompt elapsed
time:

```text
[timing]
2026-10-09T18:51:16-05:00
since_last_prompt=302.0s
[/timing]
```

The message uses `customType: "idle-time"`, `display: false`, and
`deliverAs: "followUp"`, preserving the existing hidden timing delivery
semantics without adding transcript UI.

Steering input is ignored because it belongs to an active turn rather than a
new user prompt.

## Installation

Install from the canonical Forgejo repository:

```bash
pi install git:git.quinntyx.dev/quinntyx/pi-idle-time@dev
```

For a reproducible install, replace `dev` with a commit SHA.

## State

The only persisted field is the most recent user-prompt timestamp:

```text
~/.pi/idle-time/sessions/<session-id>.json
```

```json
{
  "sessionId": "019ecfd3-30e5-79d5-889a-bb22a34f01d4",
  "lastUserPromptAt": "2026-10-09T18:51:16.000-05:00"
}
```

Older state files are read compatibly; obsolete fields are dropped the next
time that session records a prompt. Malformed state files are quarantined as
`<filename>.corrupt-<timestamp>`.

This version has no configuration, statusline, visible idle notification,
commands, tools, heartbeat, autoresume, goal reminders, or non-input lifecycle
listeners.

## Development

```bash
pnpm test
pnpm check
```

## License

Public domain under the [Unlicense](LICENSE). See [NOTICE](NOTICE) for fork
provenance.
