# Capri Companion — Model Functional Effect design
Profile: service

This document covers phase 0, the standalone overlay companion, and phase 1, which connects her to T3Code threads and approvals. It builds on `PRD.md`. Later phases add their own design files under `docs/design/`.

Verified against T3Code 0.1.7 source at commit `6577c6b`, mochiiwuff/capri-desktop `cb33e87`, and TheAgencyMGE/capri-companion `c094ec1`. Nothing here has run against a live T3Code server yet, so milestone M7 in `PLAN.md` must pass before the approval work starts.

## Phase 0: Overlay companion

### M0 scaffold boundary (historical)

M0 starts `src/main/bootstrap.ts`, built to `dist/main/bootstrap.cjs`. It opens only
the static M0 screen with sandboxing, context isolation, no Node integration, a
strict CSP, denied permissions/window opening/navigation, and blocked non-file
requests. It does not import the retained upstream `src/main/main.js`, preload,
hooks, chat, screen capture, or PC-action modules. The smoke mode uses a separate
temporary profile and exits after confirming the page loaded. No renderer IPC
bridge or behavior core is introduced in M0.

This is the M0 no-private-art startup check. The character placeholder and art
protocol remain M1, and the companion overlay startup remains M2. Imported code
is retained for later adaptation, not treated as an approved runtime boundary.
TheAgencyMGE's traced `face.ts` and frame/footage-derived clip records are omitted
under the code-only asset rule. Only its authored interpretation clips and engine
are retained for M4; face support will need an art-independent implementation.

### M1 art boundary

The bootstrap now opens a static art preview using the retained `SpriteRenderer`.
It registers `art://pack/` before creating a sandboxed window. The scheme serves
only a public descriptor and allow-listed images from the selected pack. No
filesystem paths or IPC capabilities are exposed to the renderer. The CSP permits
local scripts/styles and `art:` images/requests; outbound network requests,
permissions, window opening, and navigation remain blocked. The upstream app
entry stays dormant until the M2 companion-only startup work.

Pack selection happens once at startup in installed, development, placeholder
order. A missing/invalid manifest, missing/corrupt sprite, or wrong sprite size
skips that candidate. Failure of every candidate is a startup error. Restart to
pick up a changed pack. This is startup policy and IO, with no ongoing behavior
state machine: `isArtPath` is pure, `parseArtManifest` is the Zod boundary, and
`loadArtPack`/`serveArt` interpret filesystem and protocol work.

Manifests are capped at 16 KiB and parsed strictly: version 1, rig `mochi-v1`,
name, required sprite, and optional `faces`, `cutins`, `intro` maps (32 entries
each). Required sprites are PNG/JPEG at exactly 240 by 420 pixels, decoded by
Electron before selection. Optional images support PNG/JPEG and WebP; WebP
containers are checked in main, then decoded by Chromium. Missing/corrupt optional
files are omitted, including browser decode failures. No `intro.grab` disables
the intro; missing portraits hide the portrait, and missing cut-ins skip them.
Optional intro cels continue to fall back to the grab cel in the retained FX code.

All asset paths must be relative raster paths, with no dot segments, URL encoding,
backslashes, absolute paths, drive/stream separators, Windows device names, or
unsupported extensions. Each file is capped at 10 MiB. `realpath` containment is
checked both at load and request time to reject symlink/junction escapes. Only
declared, validated files are served; the endpoint rejects credentials, query
strings, fragments, noncanonical URLs, and other hosts/schemes. Art is treated as
local user data, not code. Private packs are never copied into build output.

The committed placeholder is Pip, an original teal-and-brass lantern robot drawn
from basic shapes in `scripts/create-placeholder.mjs`. Its transparent sprite
uses the existing rig landmarks without changing the shader. It declares no
portrait, cut-in, intro, or live-face assets. Its static preview does not introduce
M2 desktop behavior, M3 frame-loop changes, or M4 clips.

Phase 0 ships a standalone desktop character with no agents, chat, or T3Code connection. Agent features stay out of the startup path until phase 1.

Keep mochiiwuff's existing stance, acting, and effect code. Don't move `capri.js` into the core until a change needs it. New decisions that are worth testing go into small pure modules:

| Module | Input | Output | Property tests |
| --- | --- | --- | --- |
| `src/core/frame-policy.ts` | Activity, hidden state, fullscreen, setting | Target frame rate | `hiddenRendersNothing`, `neverExceedsSetting` |
| `src/core/motion/clip.ts` | Clip, time, seed | Sampled `Params` | `sampleIsDeterministic`, `clipEndsNeutral` |
| `src/core/motion/pose-map.ts` | `Params` | Sprite pose fields | `neutralMapsToNeutral`, `outputsStayClamped` |
| `src/core/motion/mixer.ts` | Act pose, clip pose, weights | Final pose | `signatureActsWin`, `weightsStayBounded` |

### M2 companion boundary

Normal startup now creates a transparent, non-activating work-area overlay. `--art-preview`
keeps the M1 preview available. Only Capri, FX, synthesized sound, and art-loading modules
are imported by the companion entry; hooks, Brain, chat, setup, and PC-action modules stay dormant.
The `companion` preload exposes settings, validated updates, click-through, cursor position,
menu opening, read-only desktop frames, custom sound URLs, and typed events. Main verifies the
sending webContents and main frame, and rejects unknown settings and values outside bounds.

The pure companion state is `Active { settings, fullscreen }` or `Stopped`. `SettingsChanged`
emits `PersistSettings` and `RenderSettings`; changed `FullscreenChanged` emits `SetHidden`;
`ActionChosen` emits a character action only while not fullscreen; `Stop` ends the core.
Stopped inputs are ignored. Persistence is serialized and atomic through temporary-file rename;
write failure leaves current settings in memory and adds a tray warning. No tokens are stored.

The Windows watcher is a read-only adaptation of the upstream frame enumeration. It emits
validated geometry and fullscreen state, never titles or contents. It cannot send keys, close
windows, or inspect USB devices. Watcher failure falls back to no frames and a tray warning.
Fullscreen hides the entire overlay and returns it to click-through. Off-screen smoke tests
use synthetic desktop inputs and an isolated profile, never the live desktop watcher.

Quiet disables sound, size is constrained to 0.3–1.2, and motion follows auto/full/reduced.
Ctrl+Alt+C toggles the compact form; Ctrl+Alt+Q toggles quiet. Tray controls expose only these
preferences plus teleport, sleep, wake, and quit. Custom sounds are allow-listed local cue
files under userData/sounds, served via `sound://custom/` with realpath containment.
Pip's compact/sleep form is its own sprite thumbnail, avoiding the upstream traced mask.
Native click-through, fullscreen detection, and window riding still need hands-on Windows checks.

### M3 render clock

`targetFrameRate` is pure: moving uses the selected 30/60 fps, working/acting 30,
idle 15, asleep 6, and hidden 0. The existing Player keeps its 12/24 fps exposure
clock; its keys, holds, and cue semantics are unchanged. Line-boil seed changes
follow exposures instead of render refresh. Idle head/mane motion and window riding
use TheAgencyMGE's exact critically damped spring equation with explicit dt.
Signature poses bypass smoothing. Body transforms keep subpixel positions.
Hidden rendering cancels rAF; waking restarts it. Sprite redraws stay bounded to
the small sprite canvas. Traveling FX retain their active-only work-area canvas;
fullscreen clears effects instead of maintaining a continuous full-screen draw.

### Clip to sprite mapping

M4 uses only interpretation clips retained at M0. Sampling, mapping, additive mixing,
and scheduling are pure. Scheduler states are Waiting, Playing, and Fading; Pulse
inputs carry time, random choice, generated runId, eligibility, and quiet mode.
Playing emits a 120 ms ScheduleEnd on Stop, then ignores stale Ended runIds.
Waiting avoids the last three clip names and quiet permits only subtle clips.
Incoming signature acts wait for that bounded fade; act poses then bypass clip mixing.
The optional faceAnchor rectangle is validated inside the 240x420 sprite. An original
generic face masks that area, tracks the transformed head, blinks, looks at the pointer,
and follows clip expressions. No traced face geometry is used. Pip declares no anchor.
Ten-minute variation is verified with virtual time; ten minutes of visual use remains manual.

| TheAgencyMGE `Params` | mochiiwuff pose |
| --- | --- |
| `headRoll` | `head` |
| `hairWind`, `hairStream` | `mane`, `hair` |
| `armLRaise`, `armRRaise`, `armSpread` | `armL`, `armR` |
| `bodyY`, `float` | `bob` |
| `bodyRot`, `lean` | `tilt` |
| `thighL`, `thighR` | `kickL`, `kickR` |
| `glitch` | Sprite glitch |

Fields with no sprite equivalent are ignored. The live face is drawn above the sprite and follows the head transform. A pack enables it by declaring a face anchor, so the placeholder can run without it.

Signature acts keep priority. Clips can only run while she idles, sits, or waits for a behavior, and they fade out before an act starts.

### Phase 0 exclusions

M5 desktop policy: monitor following uses Here/Elsewhere states and requires two
eligible observations of the same other display. Adjacency uses physical display
layout converted to overlay DIP coordinates. Manual monitor selection, hot-plug
fallback, taskbar/bottom seating, icon seating, drag/throw/catch, peeking, pets,
lying down, and an agent-free showcase are wired to retained character mechanics.
Icon bounds come from read-only UI Automation; icon names and contents are never
read. Unsupported desktop icon providers simply expose no icon seats.

Disruptive behaviors have independent persisted toggles. Zap, satellite, PC reactions,
and visual window possession default off. Possession draws an effect over a window;
it never changes that native window. Pausing hides and reloads the overlay renderer,
destroying the old action/timer context. Paused preferences keep the new renderer
suspended and cannot be overridden by animation wake-up code. Resume starts fresh.

PC reactions use parsed CPU/battery samples, online state without network requests,
removable-volume counts, and a boolean for foreground executables in known game
install locations. No game path or title leaves the watcher. Reaction state suppresses
startup replay, quiet/disabled/busy reactions, and limits reactions to one per minute.
Generic device-change event revisions cover plug/unplug reactions without transmitting
device names (including phones/controllers). Unsupported device notifications fall
back to removable-volume counts. Screen capture and PC actions remain excluded.

### M6 release boundary

Tray settings cover rendering rate, size, quiet, reduced motion, rest position,
behavior toggles, monitor follow/selection, and art source. Art preference `auto`
keeps installed/development/placeholder precedence. An explicit private source
falls back directly to placeholder; changes require the tray restart action.
Partial IPC settings updates strip defaults before optional parsing, so omitted
preferences are preserved. Settings writes stay serialized and atomic.

Pause loads an inert local document with a strict no-script CSP while hiding the native window; resume
loads a fresh companion document. This cancels the old renderer's timers/actions
and avoids compiling a new active companion while it is paused. Start with Windows
is opt-in and available only in a packaged build; build and smoke scripts never
register startup or run the installer. The installer is unsigned and non-commercial,
uses Pip's original generated icon, and bundles only the public placeholder.
Package checks inspect notices, placeholder bytes, helper bytes, private paths, and
local-secret filenames. Real Windows acceptance and the full work week remain gates
in docs/WINDOWS_ACCEPTANCE.md; source tests cannot prove those human-use criteria.

- No hooks, T3Code, or agent narration.
- No chat, model setup, memory, or voice.
- No screen capture or PC actions.
- No network calls.

## Architecture

In phase 1, a pure core makes agent and approval decisions. The Electron main process runs the commands, and sandboxed renderers only display the result.

```text
T3Code server                 Electron main (trusted)                 Sandboxed renderers
-------------                 -----------------------                 -------------------
/oauth/token         <---->   T3 adapter                              Character overlay
/api/auth/*                     |  parsed CapriInput                    WebGL sprite
/ws (Effect RPC)     <---->     v                                       clips, live face
                              step(state, input) -> state, commands     effects, sound
                                |                                     Panel
                                v                                       board
                              Interpreter  ----- typed IPC ------>      approval card
                                |                                       connection screen
                                +-- audit log, config, secure store
```

Rules for this shape:

- `src/core/` has no Electron, Node, Effect, T3Code, DOM, clock, or randomness imports.
- T3Code types stop at `src/main/t3/`. The core only sees Capri types.
- Renderers never hold a token, and they can only request allow-listed actions.
- The existing mochiiwuff renderer stays JavaScript until a file needs real changes.

## State map

Phase 1 `CapriState` has independent regions, so a dropped connection doesn't erase approvals or animation state.

```ts
type CapriState = {
  connection: Connection;
  threads: ReadonlyMap<ThreadId, ThreadView>;
  approvals: ReadonlyMap<RuntimeRequestId, ApprovalState>;
  focus: RuntimeRequestId | null;
  ui: { panelVisible: boolean; quiet: boolean; hidden: boolean };
  limits: ReadonlyMap<ProviderInstanceId, ProviderLimits>;
};
```

### Connection

| State | Data | Meaning |
| --- | --- | --- |
| `Unpaired` | none | No saved token |
| `Pairing` | `attempt`, `baseUrl` | Exchanging a pairing code |
| `Connecting` | `attempt`, `lastSequence` | Checking the server, getting a ticket, opening `/ws` |
| `Syncing` | `attempt`, `lastSequence` | Connected, waiting for a shell snapshot or `synchronized` |
| `Live` | `attempt`, `lastSequence` | Status is current |
| `Backoff` | `attempt`, `failures`, `lastSequence` | Waiting to reconnect |
| `AuthRejected` | `reason` | Token expired, revoked, or lacks scope |
| `Incompatible` | `serverVersion`, `protocolVersion` | Server version is unsupported |

### Thread view

```ts
type RunPhase =
  | "idle" | "preparing" | "queued" | "starting" | "running" | "waiting"
  | "completed" | "interrupted" | "failed" | "cancelled" | "rolled_back";

type ThreadView = {
  id: ThreadId;
  projectId: ProjectId;
  title: string;
  provider: ProviderInstanceId;
  runtimeMode: RuntimeMode;
  phase: RunPhase;
  activeRunId: RunId | null;
  lastError: string | null;
  usageLimitResetAt: IsoDateTime | null;
  ticker: TickerLine | null;
  quietSince: IsoDateTime | null;
};
```

### Approval

| State | Data | Meaning |
| --- | --- | --- |
| `Detected` | `threadId`, `kind`, `attempt` | Shell reported a request, details are loading |
| `Ready` | `detail` | Exact request is available for your decision |
| `ThreadOnly` | `detail or summary`, `reason` | Capri can't reply, so T3Code must handle it |
| `Sending` | `detail`, `decision`, `commandId`, `attempt` | Decision dispatched |
| `Unconfirmed` | `detail`, `decision`, `commandId`, `attempt` | Send outcome unknown, reading the thread |

Resolved, expired, and cancelled requests leave the map after an audit entry.

### Presence

Presence is derived from state after every step. The highest priority wins.

```text
Hidden > NeedsYou > Failed > Done > Working > Thinking > Asleep > Idle
```

`Done` and `Failed` hold briefly through a scheduled input. One-shot reactions run only on state edges.

## Inputs

| Group | Inputs |
| --- | --- |
| Startup | `Started { savedConnection }` |
| Pairing | `PairingSubmitted { attempt, baseUrl, pairingCode }`, `PairingAccepted { attempt, grantedScopes }`, `PairingRejected { attempt, reason }` |
| Transport | `ServerChecked { attempt, serverVersion, protocolVersion, compatible }`, `SocketOpened { attempt }`, `SocketClosed { attempt, reason }`, `AuthFailed { attempt, reason }`, `RetryDue { attempt }` |
| Shell stream | `ShellSnapshot { attempt, sequence, threads }`, `ThreadUpdated { attempt, sequence, thread }`, `ThreadRemoved { attempt, sequence, threadId }`, `ShellSynchronized { attempt }` |
| Thread details | `ThreadTicker { threadId, runId, line }`, `ThreadQuietDue { threadId, runId, quietSince }`, `RequestDetailLoaded { requestId, attempt, detail }`, `RequestDetailFailed { requestId, attempt }`, `RequestDetailRetryDue { requestId, attempt }`, `RequestNotPending { requestId, attempt, outcome }` |
| Approval | `DecisionChosen { requestId, decision }`, `DecisionAccepted { requestId, attempt }`, `DecisionRejected { requestId, attempt, reason }`, `DecisionUnknown { requestId, attempt }`, `ThreadOpenRequested { threadId }` |
| Providers | `LimitsUpdated { providers }` |
| UI | `PanelVisibilityChanged { visible }`, `QuietChanged { quiet }`, `HiddenChanged { hidden }`, `ReactionEnded { threadId, runId }` |

Every timer result carries the `attempt`, `runId`, or both that created it. A stale result is ignored.

## Transition table

Any other `(state, input)` pair causes no change and no commands.

| From state | Input | Guard | To state | Commands |
| --- | --- | --- | --- | --- |
| Any | `Started` | No saved connection | `Unpaired` | `RenderBoard` |
| Any | `Started` | Saved connection | `Connecting` | `CheckServer` |
| `Unpaired`, `AuthRejected`, `Incompatible` | `PairingSubmitted` | Input already parsed | `Pairing` | `ExchangePairing` |
| `Pairing` | `PairingAccepted` | Attempt matches and scopes are sufficient | `Connecting` | `SaveConnection`, `CheckServer` |
| `Pairing` | `PairingAccepted` | Scopes are insufficient | `AuthRejected` | `DiscardToken`, `RenderBoard` |
| `Pairing` | `PairingRejected` | Attempt matches | `Unpaired` | `RenderBoard` |
| `Connecting` | `ServerChecked` | Compatible | `Connecting` | `OpenSocket` |
| `Connecting` | `ServerChecked` | Not compatible | `Incompatible` | `RenderBoard` |
| `Connecting` | `SocketOpened` | Attempt matches | `Syncing` | `SubscribeShell { afterSequence }`, `SubscribeProviders` |
| `Syncing`, `Live` | `ShellSnapshot` | Attempt matches | `Syncing` | `RenderBoard`, `ApplyThreadSubscriptions` |
| `Syncing`, `Live` | `ThreadUpdated` | Sequence is newer | Unchanged | `RenderBoard`, edge commands below |
| `Syncing`, `Live` | `ThreadRemoved` | Sequence is newer | Unchanged | `RenderBoard`, `ApplyThreadSubscriptions` |
| `Syncing` | `ShellSynchronized` | Attempt matches | `Live` | `RefreshPendingDetails`, `RenderBoard` |
| `Connecting`, `Syncing`, `Live` | `SocketClosed` | Attempt matches | `Backoff` | `ScheduleInput(RetryDue)`, `RenderBoard` |
| `Backoff` | `RetryDue` | Attempt matches | `Connecting` | `CheckServer` |
| Any connected state | `AuthFailed` | Attempt matches | `AuthRejected` | `CloseSocket`, `DiscardToken`, `RenderBoard` |
| Active thread | `ThreadTicker` | Same active run | Update ticker and `quietSince` | `RenderBoard`, `ScheduleInput(ThreadQuietDue)` |
| Active thread | `ThreadQuietDue` | Same run and `quietSince` | Presence can become `Thinking` | `SetPresence` |
| No approval | `ThreadUpdated` | `pendingRuntimeRequest` is new | `Detected` | `LoadRequestDetail`, `SetPresence`, `FocusApproval` |
| `Detected` | `RequestDetailLoaded` | Live response and approval kind | `Ready` | `RenderApproval` |
| `Detected` | `RequestDetailLoaded` | Not live, or unsupported kind | `ThreadOnly` | `RenderApproval` |
| `Detected` | `RequestDetailFailed` | Retries remain | `Detected` | `ScheduleInput(RequestDetailRetryDue)` |
| `Detected` | `RequestDetailRetryDue` | Attempt matches | `Detected` | `LoadRequestDetail` |
| `Detected` | `RequestDetailFailed` | Retries exhausted | `ThreadOnly` | `RenderApproval` |
| `Ready` | `DecisionChosen` | `Live`, panel visible, decision offered | `Sending` | `AppendAudit(chosen)`, `SendDecision` |
| `Ready` | `DecisionChosen` | Guard failed | `Ready` | `RenderApproval` |
| `Sending` | `DecisionAccepted` | Attempt matches | `Sending` | None, the shell stream confirms completion |
| `Sending` | `DecisionRejected` | Attempt matches | `Unconfirmed` | `LoadRequestDetail` |
| `Sending` | `DecisionUnknown` | Attempt matches | `Unconfirmed` | `LoadRequestDetail` |
| `Unconfirmed` | `RequestDetailLoaded` | Still pending | `Ready` | `RenderApproval` |
| `Unconfirmed` | `RequestNotPending` | Attempt matches | Removed | `AppendAudit(outcome)`, `RenderBoard` |
| Any approval | `ThreadUpdated` | Pending request cleared | Removed | `AppendAudit(outcome)`, `RenderBoard`, `SetPresence` |
| `ThreadOnly` | `ThreadOpenRequested` | Thread exists | Unchanged | `OpenThreadInT3` |
| Thread running | `ThreadUpdated` | Phase becomes `completed` | Update phase | `PlayReaction(Done)`, `ScheduleInput(ReactionEnded)` |
| Thread running | `ThreadUpdated` | Phase becomes `failed` | Update phase | `PlayReaction(Failed)`, `ScheduleInput(ReactionEnded)` |
| Thread with reaction hold | `ReactionEnded` | Same run | Clear the hold | `SetPresence` |
| Any | `LimitsUpdated` | Parsed | Update limits | `RenderBoard` |
| Any | `PanelVisibilityChanged`, `QuietChanged`, `HiddenChanged` | None | Update UI | `RenderBoard`, `SetPresence` |

## Invariants

| Invariant | Property test |
| --- | --- |
| `SendDecision` only appears in the same step as `DecisionChosen` | `neverApprovesWithoutUser` |
| A request has at most one in-flight decision | `oneInFlightDecision` |
| `SendDecision` needs `Live`, a visible panel, and an offered choice | `approvalControlsAreGuarded` |
| `DecisionChosen` from `Backoff`, `Hidden`, or `ThreadOnly` emits no send | `disconnectedCannotApprove` |
| Stale attempts and old runs never change state | `staleResultsAreIgnored` |
| A snapshot or reconnect never plays `Done` or `Failed` | `snapshotsDoNotReplayReactions` |
| Thread sequences never move backward | `sequenceIsMonotonic` |
| `NeedsYou` outranks every presence except `Hidden` | `needsYouWins` |
| Quiet mode removes sound and speech commands | `quietSuppressesNoise` |
| `AuthRejected` clears the token and has no socket command | `rejectedTokenIsDiscarded` |
| Every closed approval produces one audit outcome | `approvalAuditCloses` |
| `step` is deterministic for the same state and input | `stepIsDeterministic` |

## Commands

| Command | Cardinality | Idempotent | Produces |
| --- | --- | --- | --- |
| `CheckServer` | One | Yes | `ServerChecked` or `SocketClosed` |
| `ExchangePairing` | One | No, the code can be consumed | `PairingAccepted` or `PairingRejected` |
| `SaveConnection` | One | Yes | None |
| `DiscardToken` | One | Yes | None |
| `OpenSocket` | Stream | Yes, replaces the attempt | `SocketOpened`, `SocketClosed`, `AuthFailed` |
| `CloseSocket` | One | Yes | `SocketClosed` |
| `SubscribeShell` | Stream | Yes | `ShellSnapshot`, `ThreadUpdated`, `ThreadRemoved`, `ShellSynchronized` |
| `SubscribeProviders` | Stream | Yes | `LimitsUpdated` |
| `ApplyThreadSubscriptions` | Stream per thread | Yes | `ThreadTicker` |
| `LoadRequestDetail` | One | Yes | `RequestDetailLoaded`, `RequestNotPending`, `RequestDetailFailed` |
| `RefreshPendingDetails` | One per pending request | Yes | Same as `LoadRequestDetail` |
| `SendDecision` | One | Yes with key `capri-approval:<requestId>` | `DecisionAccepted`, `DecisionRejected`, `DecisionUnknown` |
| `OpenThreadInT3` | One | Yes | None |
| `AppendAudit` | One | Yes with key `<requestId>:<event>` | None |
| `ScheduleInput` | One | Yes with its key | The scheduled input |
| `RenderBoard`, `RenderApproval`, `FocusApproval`, `SetPresence`, `PlayReaction` | One | Yes for render, no for reactions | `ReactionEnded` for reactions |

## Call graph

```ts
// Production
PairingForm.submit
  → host.pair (typed IPC)
  → parsePairingInput (boundary)
  → step (core)
  → interpret ExchangePairing
      → T3Auth.live → POST /oauth/token
      → SecureStore.live → safeStorage file
```

```ts
// Production
App start
  → loadConnection
  → step (core)
  → interpret CheckServer
      → T3Http.live → GET /.well-known/t3/environment
  → interpret OpenSocket
      → T3Auth.live → POST /api/auth/websocket-ticket/rpc
      → T3Rpc.live → /ws?wsTicket=...
  → interpret SubscribeShell
      → orchestration.subscribeShell
      → parseShellItem (boundary)
      → step (core)
      → render board, presence, reactions
```

```ts
// Production
ThreadUpdated with pendingRuntimeRequest
  → step (core)
  → interpret LoadRequestDetail
      → orchestration.getThreadProjection
      → parseApprovalDetail (boundary)
  → step (core)
  → interpret RenderApproval → Panel

Panel Approve or Deny
  → host.decideApproval (typed IPC)
  → parseDecision (boundary)
  → step (core)
  → interpret SendDecision
      → orchestration.dispatchCommand(runtime-request.respond)
  → subscribeShell clears pendingRuntimeRequest
  → step (core)
  → AppendAudit, SetPresence, RenderBoard
```

```ts
// Tests
run(initial, inputs) (core, no shell)
interpret SendDecision → T3Rpc.memory
interpret AppendAudit → AuditLog.memory
interpret SaveConnection → SecureStore.memory
```

## Failures

| Node | Failure | Class | Handling |
| --- | --- | --- | --- |
| Pairing exchange | Invalid or expired code | Domain outcome | `PairingRejected`, ask for a new code |
| Pairing exchange | Server unreachable | Domain outcome | `PairingRejected`, keep the address in the form |
| Pairing exchange | Timeout | Escape hatch | Treat the code as possibly used and ask for a new one |
| Server check | Unsupported version | Domain outcome | `Incompatible`, show both versions |
| Server check, socket | Connection refused or dropped | Retry | Jittered backoff, capped at 5 minutes |
| WebSocket ticket | HTTP 401 or 403 | Domain outcome | `AuthFailed` |
| Shell stream | Unknown item kind | Escape hatch | Skip it and log the kind |
| Shell stream | Invalid known item | Die in development, escape hatch in packaged builds | Close the stream and reconnect from the last good sequence |
| Request detail | Temporary RPC failure | Retry | Retry 3 times, then `ThreadOnly` |
| Request detail | Missing approval item | Escape hatch | `ThreadOnly` with the summary |
| Decision send | Rejected, request no longer pending | Domain outcome | Read the thread and close the approval |
| Decision send | Timeout or socket loss | Domain outcome | `DecisionUnknown`, read the thread, never resend automatically |
| Provider limits | Unavailable | Escape hatch | Show `Unavailable` for that provider |
| Audit log | Write failed | Escape hatch | Keep working and show a warning |
| Secure store | Encryption unavailable | Domain outcome | Keep the token in memory and require pairing after restart |
| WebGL | Context lost | Retry | Restore once, then use software rendering fallback |
| Core | Impossible state | Die | Log and stop the core instead of guessing |

Errors are translated at each layer:

```text
Socket or HTTP error -> T3ClientError -> CapriInput -> panel state
```

## Requirements

| Capability | Live | Test | Contract |
| --- | --- | --- | --- |
| `T3Auth` | Fetch against `/oauth/token` and `/api/auth/websocket-ticket/rpc` | Memory fake | Success, invalid code, expired token, wrong scope |
| `T3Rpc` | Effect RPC over `/ws` using the pinned schemas | Replay fake with recorded streams | Snapshot, deltas, resume, unknown item, close, decision receipt |
| `SecureStore` | Electron `safeStorage`, atomic file write | Memory fake | Save, load, clear, encryption unavailable |
| `AuditLog` | JSON Lines under `userData` | Memory fake | Append, dedupe by key, write failure |
| `Scheduler` | Node timers | Virtual clock | Delay, cancel, stale input |
| `PanelPort` | Typed IPC | Recording fake | Board, approval, connection state |
| `CharacterPort` | Typed IPC | Recording fake | Presence, reaction, reaction ended |
| `ArtPacks` | `art://` protocol | Temporary folders | Private pack, placeholder fallback, invalid manifest |

The `T3Rpc` live contract is opt-in with `T3_CONTRACT_URL` and `T3_CONTRACT_TOKEN`. It uses a real local T3Code server and must never run against production work without your approval.

## Boundary

| Source | Parser | Produces | Rejects |
| --- | --- | --- | --- |
| Pairing form | `parsePairingInput` | `baseUrl`, `pairingCode` | Non-HTTP URL, credentials in URL, empty code |
| `/.well-known/t3/environment` | `parseServerDescriptor` | Version and protocol | Missing version, unsupported protocol |
| `/oauth/token` | `parseAccessToken` | Redacted token, expiry, scopes | Missing scope or wrong token type |
| `subscribeShell` | `parseShellItem` | `ShellSnapshot`, `ThreadUpdated`, `ThreadRemoved`, `ShellSynchronized` | Invalid known items, unknown items become skip results |
| `subscribeThread` | `parseThreadItem` | `ThreadTicker` | Unknown items become skip results |
| `getThreadProjection` | `parseApprovalDetail` | Exact prompt, reason, kind, and safe options | Missing request, unknown decision |
| `subscribeServerConfig` | `parseProviderLimits` | Limits or unavailable state | Malformed percentages |
| Panel IPC | `parseDecision`, `parseUiEvent` | `DecisionChosen`, UI inputs | Unknown request or decision |
| Art pack | `parseArtManifest` | Validated asset paths | Path traversal, missing required asset |

The approval card offers only Approve and Deny in phase 1, mapped to `accept` and `decline`. Session and permanent approvals stay in T3Code, because they can permit later actions you haven't seen.

### T3Code connection facts

| Item | Value |
| --- | --- |
| Default desktop URL | `http://127.0.0.1:3773` |
| Protocol check | `orchestrationProtocolVersion = 2` |
| Token request | `POST /oauth/token`, form-encoded token exchange |
| Grant type | `urn:ietf:params:oauth:grant-type:token-exchange` |
| Subject token type | `urn:t3:params:oauth:token-type:environment-bootstrap` |
| Requested token type | `urn:ietf:params:oauth:token-type:access_token` |
| Socket ticket | `POST /api/auth/websocket-ticket/rpc` with a bearer token |
| RPC serialization | Effect RPC JSON |
| Monitoring scope | `orchestration:read` |
| Approval scope | `orchestration:operate` |
| Status stream | `orchestration.subscribeShell` with `afterSequence` |
| Thread details | `orchestration.getThreadProjection`, `orchestration.subscribeThread` |
| Approval command | `orchestration.dispatchCommand`, type `runtime-request.respond` |

## Visual and motion design

### Art packs

Art is data. The app never imports show-derived files.

```text
art/placeholder/     committed original pack
art/private/         ignored development pack
%APPDATA%/Capri/art/ installed private pack
```

Load order is the installed pack, the development pack, then the placeholder.

```json
{
  "name": "placeholder",
  "version": 1,
  "rig": "mochi-v1",
  "sprite": "sprite.png",
  "faces": {},
  "cutins": {},
  "intro": {}
}
```

Art packs use mochiiwuff's rig coordinates, including `NECK`, `SHOULDER_L`, `MANE`, and `HIP`. Generalizing the rig is out of scope. Missing optional assets disable that effect instead of failing startup.

The placeholder must be an original construct with its own silhouette, colors, and name. It must not resemble Capri.

### Rendering layers

| Layer | Rate | Owner | Notes |
| --- | --- | --- | --- |
| Position and window following | Up to 60 fps | New motion layer | Smooths movement between targets |
| Mane, hair, and springs | Up to 60 fps | TheAgencyMGE `Animator`, adapted | Uses exact critically damped springs |
| Signature acting | 12 or 24 fps exposure | mochiiwuff `acting.js` | Keeps intentional pose holds |
| Shader effects | Render rate | mochiiwuff `sprite.js`, `fx.js` | Reduced during idle |
| Clips and live face | Up to 60 fps | TheAgencyMGE | Mapped to sprite pose fields |

The frame loop renders at the selected rate, while acting advances on its own exposure clock. This keeps the hand-animated timing without limiting movement to 12 fps.

### Frame rules

| State | Render target |
| --- | --- |
| Moving or teleporting | 60 fps, or 30 fps if selected |
| Working or talking | 30 fps |
| Idle | 15 fps |
| Asleep | 6 fps |
| Hidden | Paused |
| Fullscreen app | Hidden, or low-effects mode |

The app keeps mochiiwuff's work-area overlay because effects travel across the screen. The transparent window is the main performance risk. Keep draw regions tight, clear only touched areas, and avoid continuous full-screen effects.

### Panel

The panel uses a quiet operational style, so approval details stay readable beside the character.

| Token | Value |
| --- | --- |
| Background | `#0c0b0f` |
| Surface | `#121117` |
| Raised surface | `#18161e` |
| Primary accent | `#f2154c` |
| Online | `#39d98a` |
| Warning | `#ffb020` |
| Radius | `2px` |
| Body font | Segoe UI Variable |
| Data font | Cascadia Mono or JetBrains Mono |

```text
+------------------------------------------------+
| APPROVAL NEEDED                       Claude   |
| project-name · thread title                    |
+------------------------------------------------+
| Command                                        |
| npm test -- --runInBand                         |
|                                                |
| Reason                                          |
| Run the failing suite before changing the code. |
+------------------------------------------------+
| [ Open in T3Code ]      [ Deny ]   [ Approve ]  |
+------------------------------------------------+
```

The card must always show the provider, project, thread, exact request, and whether the reply is available. Do not hide a request behind a character line. Her comment can summarize it, but the card remains the source of truth.

The board shows every thread with its agent, project, phase, and pending request. Limits appear as a compact row when available. Muse shows token use or `Unavailable`, not an invented limit.

### Reactions

| Event | Character | Panel |
| --- | --- | --- |
| Agent started | Short glance or point | Add or update the row |
| Working | Ticker, data glyphs | Show latest action |
| Quiet for 15 seconds | Thinking timer, small idle action | Show elapsed time |
| Needs approval | Comes to the cursor, points at the card | Focus the approval |
| Failed | Knockback, glitch | Show the key error |
| Finished | Victory, shorter for routine tasks | Show summary |
| Disconnected | Sleep or static | Show agent status as unavailable |
| Quiet mode | No sound or speech | Normal status remains visible |

Reduced motion replaces large movement and flashes with fades, while approvals remain equally visible.

## Files

```text
src/core/
  ids.ts              branded IDs
  model.ts            state, input, and command types
  step.ts             exported step and run
  connection.ts       connection transitions
  threads.ts          thread transitions and edge detection
  approvals.ts        approval transitions and guards
  presence.ts         derived presence
  __tests__/          invariant and transition tests

src/main/
  main.ts             Electron entry
  interpreter.ts      command interpreter
  t3/                 auth, RPC, parsers, contracts
  stores/             secure store, config, audit log
  art.ts              art protocol and manifest
  windows/            overlay and panel windows

src/preload/
  overlay.ts
  panel.ts

src/shared/
  ipc.ts              typed channels and schemas

src/renderer/
  overlay/            adapted mochiiwuff character code
  panel/              board, approval card, connection screen

vendor/t3-contracts/  pinned T3Code contract source, MIT
art/placeholder/      original placeholder pack
```

Write these property tests first: `neverApprovesWithoutUser`, `oneInFlightDecision`, `disconnectedCannotApprove`, `staleResultsAreIgnored`, and `snapshotsDoNotReplayReactions`.

Contract suites: `T3Auth`, `T3Rpc`, `SecureStore`, `AuditLog`, `Scheduler`, and `ArtPacks`.

## Open questions

- Does `runtime-request.respond` work from Capri for all four providers on your installed T3Code version?
- What address does your T3Code desktop server use, and does it stay on port 3773?
- How long does the issued bearer token last on your installed version?
- Should T3Code remain open for fallback, or should Capri launch it when needed?
