# Changelog

## 0.6.0 — 2026-10-09

### Changed

- Reduced the extension to hidden per-prompt timing context only.
- Timing now reports the elapsed interval since the previous non-steering user
  prompt as `since_last_prompt`, while preserving current local time and the
  existing hidden follow-up delivery shape.
- Session persistence now retains only `lastUserPromptAt` and automatically
  drops legacy state fields on the next prompt.

### Removed

- Cache-keepalive heartbeat and autoresume behavior.
- Idle goals and reminders.
- All commands and LLM-callable tools.
- Statusline and visible idle notifications.
- Configuration, global state, last-response files, and extension log files.
- `agent_start`, `agent_end`, `before_agent_start`, `session_start`,
  `session_shutdown`, and `session_before_compact` listeners.
