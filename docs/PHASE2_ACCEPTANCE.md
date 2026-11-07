# Phase 2 assistant acceptance

Implementation scope: M14 context, M15 providers, M16 pure lifecycle, M17 actions
and persistence, M18 UI/guidance/release checks. Manual acceptance is separate.
No live model credentials or real coding-agent turns are used by automated tests.

## Using the assistant

Open **Assistant** from the tray. Offline is the default. `/help` lists commands.
Every action, including reads and memory, opens an exact **Approve once / Deny**
card. It expires after 60 seconds. Stop, hide, fullscreen, putting the character
away, pausing, or a pending coding-agent request cancels work and approval cards.
A dispatched write or remote command may already have completed when stopped;
inspect the outcome before trying again. There are no automatic action retries.

Provider setup accepts Ollama (origin URL) or OpenAI-compatible Chat Completions
(base URL including `/v1` where needed), exact model ID and optional key. Pick
small-context mode for short local prompts. Keys are never returned to renderers;
saving replaces the key (blank means keyless). Windows DPAPI encrypts saved
settings; unavailable encryption uses memory and shows a warning. Forget removes
the provider file. Ollama cloud-tagged models and remote endpoints require cloud
consent. A loopback server may itself proxy to cloud: verify your model/server
configuration. A custom alias cannot reliably prove that a model is local.

Cloud consent sends SOUL/USER/MEMORY and bounded recent chat, including action
results, to the selected endpoint. Nothing is sent until you send a model message.
Slash commands always stay offline. Provider retries are limited to two transient
failures before any output. A 30-second stall or 120-second deadline stops a turn.
Invalid/incomplete tool output never authorizes an action. Results are displayed
locally, without an automatic model tool loop; another message continues chat.

## Actions and local data

- `/note title | body` creates a generated Markdown file in userData/assistant/notes.
- `/remember fact` appends an approved exact string to MEMORY.md. Obvious sensitive
  credentials, payment/contact details are rejected; review all memory yourself.
  Context reloads before the next model turn. SOUL/USER are edited manually.
- `/remind minutes text` persists a reminder (1 minute to 1 week). Reminders can
  notify after restart; notifications are silent and retain up to ten in-window alerts.
  Use its Review cancellation button (or `/cancelreminder reminder-id`) to cancel
  a scheduled reminder after confirmation.
- Choose a search folder, then `/find filename`. Search is by name only, with
  bounded work and no symlink traversal. `/open result-id` reveals that known file
  in Explorer, never executes it. Search handles expire on another search/folder.
- `/apps` lists open user apps. `/close app-id` requests graceful close with a
  current PID/start-time check; protected processes and force-close are excluded.
  `/launch calculator` and `/launch notepad` are the only launch targets.
- `/music playPause`, `/music next`, `/music previous`, `/volume 0–100` use native
  Windows media/volume interfaces. There is no keyboard/mouse synthesis.
- `/point x y label` guides on the current monitor with normalized coordinates
  0–1. It waits for signatures, expires after five seconds if busy, and yields
  to agent requests. Reduced motion uses a small look gesture. Stop cancels it.
- `/search phrase` queries local saved chat using a literal substring. Transcript
  retention is 5000 exchanges, plaintext on disk in assistant/assistant.sqlite.
  Delete saved transcript clears conversation/transcript, not approved memories,
  notes, reminders or decision-only audit records. Deletion is not forensic erasure
  of backups or filesystem free space. Private files never enter release archives.

## T3Code operations

Pair read-only monitoring first. Optional **Coding threads** setup accepts a separate
read/operate pairing code and keeps its token in memory for this app session only.
This is a high-privilege token. Forget operations clears it. Monitoring scopes and
Phase 1 ThreadOnly approval behavior are unchanged.

The form creates an exact review card for project/provider/model/title/prompt.
New threads are always Supervised, default interaction, project root workspace.
Steering requires a currently active Supervised run, matching provider/project/run,
and a fresh projection with no pending approvals. Each submission asks again.
Server/environment changes reject the operation; unknown outcomes are never retried.
Open the board's thread in T3Code to inspect an uncertain result. No external
messaging, arbitrary command, password/card, screenshot, or full-access action exists.

## Automated evidence (2026-11-07)

- `npm run check` and `git diff --check` pass.
- 150 Vitest tests + 5 hook tests pass; core 45, contracts 85 pass separately.
- Provider fixtures test fragmented SSE/NDJSON, complete-stream actions, errors,
  cloud consent and credential persistence without contacting real models.
- Full Electron e2e passes (art, overlay/live face, monitoring board and assistant).
  The assistant verifies exact inert text, invalid IPC, stale/hide cancellation,
  approved-only memory, secret-free views, signature priority and late point cancellation.
- Alpha.2 Windows unpacked cross-build and archive checks pass with resource
  editing/signing disabled. Default-context and assistant smokes pass from the
  built ASAR on Linux Electron. No installer/native Windows runtime is claimed.
- Linux UI tests use the pre-existing temporary Xvfb/shared libraries and explicit
  test-only no-sandbox/software-GL flags. Production settings remain unchanged.
- SQLite is supplied by Node/Electron; Node 22 emits its experimental warning.

## Required Windows and real-provider checks (pending)

- [ ] Install/build with `npm run dist` on Windows; verify startup with placeholder.
- [ ] Load local SOUL/USER/MEMORY overrides; test missing/invalid fallback indicators.
- [ ] Stream a real local Ollama model; Stop it; verify stall/disconnect behavior.
- [ ] With explicit consent, stream a configured cloud compatible model; verify
      encrypted persistence, key replacement and Forget across a restart.
- [ ] Review/deny/approve notes and memories; confirm denied/expired text is not written.
- [ ] Schedule a reminder, restart before due, verify one silent notification.
- [ ] Select a test folder; verify filename search, link exclusion and Explorer reveal.
- [ ] Exercise Calculator/Notepad launch, app listing and graceful close/save prompts.
- [ ] Exercise media play/pause/skip and volume on the intended Windows version.
- [ ] Verify exact T3 start/steer cards and a real Supervised run for each provider;
      confirm provider/model availability manually. Never use live turns in tests.
- [ ] Verify Point and Stop, signature priority, reduced motion, 30/60 fps and
      multi-monitor/DPI coordinates, including pending-agent-request priority.
- [ ] Delete transcript and verify subsequent search; inspect local storage warnings.

Windows media interop, native helper execution, actual DPAPI/installer behavior,
real provider compatibility and actual T3 start/steering remain manual checks on
this Linux host. The existing Phase 1 full-week trial remains pending as well.
Record Windows/T3/model versions and reproduction steps without secrets/private text.
