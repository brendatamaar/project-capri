# Capri Companion Implementation Plan

This plan builds the overlay companion first, then connects her to coding agents. `PRD.md` owns product scope, `DESIGN.md` owns behavior, and this file owns order and progress.

Current milestone: **Phase 4 implementation and automated verification complete; manual acceptance pending.
User authorized completing Phase 4 on 2026-11-07. Stop before the Later backlog.
Earlier manual Windows/provider/model checks and full-week trial remain pending.**

Repository audit (2026-11-06): work began from clean main at `71f7688`, containing M0–M6. The current request supersedes the earlier Phase 1 stop. The implemented monitoring fallback and evidence are recorded below; full acceptance is still pending.

## How to work

- Finish milestones in order.
- Keep each task small enough for one reviewable change.
- Run the listed verification before checking off a task.
- Update `DESIGN.md` if the implementation changes a transition, command, failure, or boundary.
- Stop and ask the user if a task needs a product decision.

## Reference versions

| Source | Version |
| --- | --- |
| T3Code | `0.1.7`, commit `6577c6b` |
| mochiiwuff/capri-desktop | `0.5.1`, commit `cb33e87` |
| TheAgencyMGE/capri-companion | `0.2.0`, commit `c094ec1` |
| Effect | `4.1.2`, matching T3Code |

## Phase 0: Overlay companion

This phase has no agent or T3Code connection.

### M0: Clean repository

Goal: start from reusable code without carrying show art or Git history.

- [x] Create a new repository, not a GitHub fork.
- [x] Add the four project docs under `docs/`, with a discoverable root `AGENTS.md` mirror.
- [x] Copy mochiiwuff code from `src/`, `hooks/`, `scripts/`, and `tests/`.
- [x] Exclude `assets/capri/`, `docs/*.png`, and art-building output.
- [x] Add `.gitignore` rules for `art/private/`, `reference/`, release output, and local secrets.
- [x] Add `LICENSE` with PolyForm Noncommercial and all required notices.
- [x] Add `THIRD_PARTY_NOTICES.md` for mochiiwuff, lachydotmcg, TheAgencyMGE, and T3Code.
- [x] Add TypeScript, esbuild, Vitest, fast-check, and Zod.
- [x] Add `.functional-effect.json` with `src/core/**`, `src/main/**`, and profile `service`.
- [x] Copy TheAgencyMGE clip engine, authored interpretation clips, and `params.ts` for M4. Omit traced `face.ts`, all frame/footage-derived clip records, `model.json`, and `reference/` under the code-only rule.
- [x] Add scripts: `dev`, `check`, `test`, `test:core`, `test:contracts`, `test:e2e`, and `dist`.
- [x] Add a repository check that fails on known show-derived filenames.

Verification:

- `npm run check` passes.
- The app starts on Windows with no private art files.
- `git ls-files` contains no show-derived assets.

M0 completion notes (2026-11-06):

- Reused this independent repository and its existing initial commit; no reference Git history, remotes, or assets were imported. No commit was made.
- Both references were cloned outside the project to a temporary directory and checked out at the full commits listed in THIRD_PARTY_NOTICES.md. All 48 mochiiwuff files from the four requested code directories remain byte-identical.
- Replaced the initial Apache-2.0 license with the documented upstream PolyForm license, earlier MIT text, and every required mochiiwuff/Lachy notice. Included full MIT notices for TheAgencyMGE and T3Code; no T3Code contracts copied yet.
- Resolved the M0/M1/M2 overlap using a minimal offline M0 startup screen. Windows startup without private art passed via the hidden Electron smoke test. This does not claim the character renders: art packs and the original placeholder remain M1, companion-only overlay integration M2.
- Imported upstream hooks/chat/PC-action code is dormant: the package entry is the new bootstrap, which never imports the original main.js or preload. No agent, model, screen, voice, or network behavior was enabled.
- TheAgencyMGE face.ts contains traced show geometry; its omission and removal of frame/footage clip data follow the user code-only requirement over the original copy task. A future face implementation must separate mechanics from art. No M4 integration was started.
- Added TypeScript/esbuild, Vitest/fast-check/Zod, service-profile core/shell paths, all requested scripts, and an asset guard over tracked and untracked publishable paths. The guard includes known reference asset basenames to detect relocated files.
- Verification: npm run check passed; npm test passed (15 asset guard cases, 5 unchanged upstream tests); test:core and test:contracts exit successfully with no suites yet; npm run test:e2e passed on Windows (M0_SMOKE_OK); git diff --check passed.
- npm run dist passed and produced an ignored, unsigned unpacked Windows scaffold; its application archive contains only the bootstrap screen, dependencies, and licenses, with no reference/private art. Installer work remains M6.
- git ls-files contains only the pre-existing LICENSE and no show-derived assets. New files remain unstaged; the asset guard additionally checked all untracked publishable paths. No files were staged or committed.
- npm install reported six moderate advisories in the electron-builder/minimatch development-tool chain; no forced major downgrade was applied.
- Manual Windows review: user confirmed all M0 criteria passed on 2026-11-06, including the requested Windows check. No M0 checks remain pending. Character animation, tray, click-through, and art fallback checks belong to M1/M2 and later.

### M1: Art packs and placeholder

Goal: make the public code run without Capri art.

- [x] Add `art://` protocol support in the main process.
- [x] Add `parseArtManifest` and path traversal tests.
- [x] Change hard-coded asset paths in `app.js`, `panel.js`, and related files to pack lookups.
- [x] Support optional faces, cut-ins, and intro frames.
- [x] Create an original placeholder construct that matches `rig: mochi-v1`.
- [x] Verify private art loading from the development-pack location with original temporary fixtures.
- [x] Verify placeholder fallback when private art is missing.

Verification:

- The app runs with placeholder art from a clean clone.
- Your private pack loads when present.
- Missing optional assets don't break startup.

M1 implementation notes (2026-11-06):

- The bootstrap now opens an offline art preview using the existing sprite renderer. It selects installed art, development art, then the bundled placeholder. The original upstream application remains dormant; M2 companion behavior has not started.
- Added the pure art-path policy, strict manifest parser, allow-listed `art://pack/` endpoint, decoded required-sprite validation, and realpath containment checks on selection and serving. Invalid candidates fall through; missing/corrupt optional assets are omitted. DESIGN.md records the boundary and failure policy.
- Pip is an original teal-and-brass lantern robot, generated by reviewable code with no reference inputs. Its transparent 240x420 PNG uses mochi-v1 landmarks and declares no optional art. See art/README.md for pack locations, format, and limits.
- Only upstream app.js, panel.js, and index.html were adapted. Shader, FX, animation/exposure, and line files remain unchanged. No show assets, traced models, or reference history were added.
- npm test passed: 55 Vitest tests (35 ArtPacks/boundary, 18 scaffold/renderer, 2 pure policy), plus 5 unchanged upstream tests. Dedicated core/contract scripts pass. The traversal property fails with the path guard removed, then passes after restoration. Functional-core purity scan reports no effects.
- npm run check passed. Windows Electron smoke passed all four isolated cases: placeholder with no private pack, development pack with missing optional assets, installed-pack precedence with actual Chromium WebP decoding, and fallback to development when installed metadata is invalid. Each case confirms nontransparent pixels from the retained WebGL renderer. No personal art locations were read or altered by these tests.
- npm run dist passed. The archive's placeholder manifest and PNG match the source byte for byte, with no private/reference art paths. The unpacked Windows executable also passed the isolated placeholder render smoke test. Output remains ignored and unsigned; installer work stays in M6.
- Early hidden smoke runs timed out during graphics startup at 30 seconds and, in one overlapping run, at 60 seconds. The final serial run passed all cases with a 60-second per-case limit and stage diagnostics; graphics startup responsiveness remains a manual Windows check.
- Manual review pending: run npm run dev without private packs and confirm Pip is visible with source placeholder. Then check your own valid development/installed pack using art/README.md, restart after changes, and confirm the expected name/source. Personal pack compatibility has not been claimed from synthetic fixture tests. Close the preview and confirm the process exits.
- Portrait/cut-in/intro lookups are prepared and tested, but this M1 preview displays the sprite only. Actual desktop effects and behavior remain in M2 and later. Existing six moderate build-tool advisories remain unchanged. No commit was made.

### M2: Overlay baseline

Goal: run her as a standalone desktop companion with no agent connection.

- [x] Add a companion-only startup path with hooks, chat, and setup prompts turned off.
- [x] Hide agent-only menu items and lines until phase 1.
- [x] Keep the transparent overlay, pixel-accurate clicks, tray menu, and global shortcuts.
- [x] Keep the intro, idle acting, teleport, falling, sleep, and chip.
- [x] Keep sitting on and riding windows, including Windows window tracking.
- [x] Keep synthesized sounds and the custom sound folder.
- [x] Add size and quiet mode settings.
- [x] Add typed IPC around the renderer features this milestone keeps.
- [x] Add off-screen Electron smoke tests.

Verification:

- She runs on your Windows PC with Claude Code, Codex, and T3Code closed.
- She shows no prompt to connect an agent.
- Clicks pass through everywhere except her body and open UI.
- Fullscreen apps hide her.

M2 implementation verification (2026-11-06): 62 Vitest tests and 5 upstream tests passed; npm run check and off-screen overlay smoke passed. The smoke covers body/outside hit tests, restricted IPC, rejected invalid settings, persisted quiet, and synthetic fullscreen hiding. The read-only PowerShell watcher compiled on Windows. Native click-through, actual fullscreen apps, window riding, custom sounds, and tray/shortcuts remain manual Windows checks; implementation may proceed while those are pending under the user request. No commit made.

### M3: Smooth motion

Goal: move beyond 12 fps without losing the hand-animated style.

- [x] Split render timing from acting exposure timing.
- [x] Add position smoothing up to 60 fps.
- [x] Adapt the `Animator` spring model for mane and body motion.
- [x] Add 30 and 60 fps settings.
- [x] Add idle and asleep frame reductions.
- [x] Pause rendering while hidden.
- [x] Limit redraw regions where possible.
- [x] Hide or reduce effects during fullscreen apps.

Verification:

- Drag, teleport, and window following look smooth at 60 fps.
- Signature moves keep their timing.
- Idle CPU and GPU stay low enough for daily use.
- The app remains responsive during normal work.

M3 implementation verification (2026-11-06): frame-policy/spring properties and original exposure-sheet checks passed at 30/60 settings (67 Vitest + 5 upstream tests); npm run check and overlay smoke passed. Window riding uses exact springs, signatures bypass idle smoothing, and hidden rAF is cancelled. Small sprite redraws remain bounded; active traveling FX retain the work-area canvas. Smoothness and idle CPU/GPU under daily Windows use remain manual checks.

### M4: Rich animation

Goal: combine both animation systems without losing the hand-animated style.

- [x] Add `src/core/motion/` with pure clip sampling and blending.
- [x] Map clip `Params` to mochiiwuff sprite pose fields.
- [x] Add property tests for neutral poses, clamping, and determinism.
- [x] Adapt the `Animator` springs for the new motion layer.
- [x] Add the clip scheduler with recent-clip avoidance and subtle-only quiet mode.
- [x] Add the live face overlay for packs that declare a face anchor.
- [x] Keep signature acts above clips, so clips never interrupt them.
- [x] Review clips marked `clip:*` before including them in the public repo.

Verification:

- Idle motion feels varied after 10 minutes.
- Clips blend into acts without pops.
- The placeholder pack works without a live face.
- 30 and 60 fps settings look correct.

M4 implementation verification (2026-11-06): pure sampling/mapping/mixing/scheduler properties, face-anchor boundary tests, ten virtual minutes of variety, npm run check, and overlay smoke passed (76 Vitest + 5 upstream tests). Generic live-face support is opt-in; Pip has none. Signature acts wait for a bounded 120ms clip fade and retain priority. No traced geometry or footage-derived clips were added. Visual blending and optional private face alignment remain manual checks.

### M5: Desktop behavior

Goal: make her feel alive across your desktop.

- [x] Add edge peeking.
- [x] Add drag, throw, catch, crash, bounce, and landing.
- [x] Add taskbar, icon, and screen-bottom sitting.
- [x] Add multi-monitor following and manual screen choice.
- [x] Add poke, head pats, and lying down.
- [x] Enable pointer zap, satellite, and PC reactions.
- [x] Add window possession as an opt-in setting.
- [x] Add a character showcase demo with no agent events.

Verification:

- Every behavior can be stopped or turned off.
- She never blocks clicks on other apps while idle.
- Multi-monitor moves work with your display layout.
- Reduced motion replaces large movement and flashes.

M5 implementation verification (2026-11-06): 82 Vitest + 5 upstream tests, npm run check, expanded overlay/live-face smoke, and Windows read-only metadata watcher checks passed. Existing drag/throw/catch/bounce/landing, peeking, petting, lying and visual possession are wired with independent controls; monitor follow/adjacency and PC reaction decisions have pure tests. UI Automation icon geometry and generic device-change revisions add no screen capture or native input. Manual multi-monitor/DPI, desktop icons, actual fullscreen, and interaction checks remain pending; pause reloads the renderer to cancel its action context.

### M6: Overlay release

Goal: use the overlay companion daily.

- [x] Add settings for frame rate, size, quiet mode, behavior toggles, and art pack.
- [x] Add Start with Windows.
- [x] Add a Windows installer without bundled private art.
- [x] Verify package contents for art and secrets.
- [ ] Run the PRD phase 0 acceptance checklist.
- [ ] Use her for one full work week.
- [x] Record bugs and missing behavior.

Exit criteria:

- All phase 0 acceptance criteria pass.
- You still want her running after a week.

M6 release-candidate verification (2026-11-06):

- Built unsigned Capri-Companion-Setup-0.1.0-alpha.0.exe and the unpacked Windows app. No installer was run and Windows startup registration was not changed by build/tests.
- Final automated checks passed: 85 Vitest tests + 5 unchanged upstream tests; 4 art-preview smoke scenarios; off-screen overlay and original live-face fixtures; pause/resume document replacement; 30/60 settings; partial settings preservation; unknown-display rejection; and the same two overlay cases against the packaged executable.
- npm run check, pure-core scan (9 files), package asset/secret-path checks, original placeholder/helper byte checks, and the live read-only native metadata snapshot passed. A removed signature-priority guard was detected by its property test, then restored. A final act-name contract also verifies every PC reaction references a real exposure sheet.
- Added explicit art preference and installed-build-only Start with Windows controls. Fixed partial-patch defaults so changing one preference preserves the others. Pausing replaces the renderer with an inert strict-CSP document; resume creates a fresh renderer.
- Manual/native acceptance and the full work week are NOT checked off. docs/WINDOWS_ACCEPTANCE.md contains the concrete checklist and bug-record format. Real monitor/DPI layouts, native click-through, icon providers, fullscreen apps, installer/startup behavior, and daily performance still require user verification. Existing six moderate builder-chain advisories remain recorded.
- Phase 1 remains unstarted. Do not call M6 accepted or claim a full week of use without user evidence. The user explicitly deferred the human-use gate on 2026-11-06, then requested reverting M7 and stopping Phase 1 work. No M7 implementation, probe, or vendored contracts are retained. The manual checklist and full week remain unverified. No commit has been made.

## Phase 1: Agent companion — approved monitoring fallback

The user explicitly approved monitoring plus Open in T3Code on 2026-11-07.
Claude, Codex, Antigravity and Muse remain ThreadOnly until their live approval
gates pass. No provider approval support is inferred from monitoring tests.
The original full-approval tasks are deferred below, not checked off as implemented.

### M7: T3Code gate — monitoring passed

- [x] Isolated probe in spikes/t3-probe with pinned source hashes and Effect 4.1.2.
- [x] Separate loopback server at port 3774 and separate temporary data directory.
- [x] Read-scope pairing exchange, RPC ticket and authenticated WebSocket.
- [x] Snapshot, project.updated delta, synchronized, and fresh-ticket afterSequence.
- [x] Record ~30-day bearer lifetime and tested 0.1.7/protocol 2 version.
- [x] Record user-approved ThreadOnly scope in DESIGN.md.
- [x] Create idle Supervised synthetic threads for all four provider IDs; no turns.
- [ ] Deferred: real pending requests, live Approve/Deny per provider, real usage limits.

Gate outcome: monitoring transport works safely. User authorized proceeding with
fallback instead of waiting for provider approval tests. The active port 3773
profile was not used for authenticated tests. The isolated server remains running.

### M8: Pure core — monitoring implementation complete

- [x] Branded IDs and closed tagged state/input/command types under src/core/agent.
- [x] Connection generations, sequence guards and bounded injected reconnect jitter.
- [x] Thread edges, ThreadOnly pending focus, bounded detail retries and audit outcomes.
- [x] Derived presence, quiet/hidden state, run-scoped thinking and reaction timers.
- [x] Export step/run and transition/property tests for the implemented fallback.
- [ ] Deferred: Ready/Sending/Unconfirmed and decision-send invariants/mutation tests.

Snapshots never replay celebrations. Metadata-only enrichment snapshots are skipped
at the adapter boundary. Authoritative live snapshots retain Live; reconnect still
waits for synchronized. No SendDecision command exists in the fallback model.

### M9: Shell and boundaries — implementation complete

- [x] Pairing/UI boundary validation and explicit BoardView, no renderer credentials.
- [x] Serialized encrypted atomic SecureStore; unavailable encryption uses memory.
- [x] Deduplicated request-ID-only AuditLog, timer scheduler and command interpreter.
- [x] Memory/recording fakes and contracts for storage, timers and interpreter races.
- [x] Separate typed panel bridge and retained restricted overlay bridge.

### M10: T3Code adapter — monitoring implementation complete

- [x] Production adapter in src/main/t3, pinned vendor contracts with VERSION/hashes.
- [x] Version/protocol gate before pairing, read-only token exchange and RPC tickets.
- [x] Application-controlled jittered reconnect capped at five minutes; no RPC retry.
- [x] Recorded synthetic shell and idle projection fixtures, replay and parser tests.
- [x] Pending-request projections only; shell latestVisibleMessage supplies ticker.
- [x] Provider config/limits parsing; unknown kinds skipped, unavailable data explicit.
- [x] Imported legacy hooks remain dormant and are never installed automatically.
- [x] Opt-in production adapter test passed against isolated server, including resume.
- [ ] Deferred: provider decision RPC and real-provider approval/usage evidence.

Replay tests caught and fixed the JSON timestamp codec and repository-enrichment
snapshot semantics. No vendor source was hand-edited. Fixture paths are sanitized,
and fixture recording creates idle threads only, never messages or agent turns.

### M11: Board and ThreadOnly queue — implementation complete

- [x] Pairing/settings UI, connection state and disconnect/token removal.
- [x] Four-provider board, permission labels, latest summary/error and usage rows.
- [x] Exact pending request card when available; explicit detail-unavailable fallback.
- [x] Open known thread using the checked environment ID and trusted local origin.
- [x] Oldest blocking focus; deferred focus after fullscreen; hide preserves requests.
- [x] Approve/Deny disabled and no decision IPC; request text rendered as text only.
- [x] Local audit outcomes and warnings for storage failures.
- [x] Electron smoke: four rows, exact text/XSS boundary, IPC rejection, known-thread
  opening, hidden/fullscreen, quiet and reconnect.
- [ ] Deferred: approval/denial from Capri; all providers are currently ThreadOnly.

### M12: Character reactions — implementation complete

- [x] Presence, latest-action ticker and 15-second quiet/thinking indicator.
- [x] Working, failed, done and needs-you edge reactions.
- [x] Come near user/card and point without interrupting signature animations.
- [x] Quiet uses existing muted synthesis; no speech provider or network voice added.
- [x] Reduced-motion reactions use small look gestures instead of travel/large acts.
- [x] Offline demo based on recorded shells, with explicitly synthetic status events.
- [x] Electron assertion: queued failure waits for signature and reduced mode uses look.

Reactions expire after five seconds rather than replaying stale events after a long
signature/hidden period. The board remains the source of truth for pending requests.
The demo uses memory-only connection/audit adapters and never accesses saved tokens.

### M13: Agent companion release — implementation validated; acceptance pending

- [x] T3Code connection settings and documented pairing/disconnect workflow.
- [x] Alpha.1 package version and panel/preload/CSP/secret-path archive checks.
- [x] Document automated evidence, manual acceptance, and remaining bugs/limits.
- [x] Finish final build/tests and record Windows packaging result (installer blocked below).
- [ ] Run real Windows/real-provider acceptance in docs/PHASE1_ACCEPTANCE.md.
- [ ] Use Capri with T3Code for one full work week.

Release validation (2026-11-07):

- npm run check passes; 114 Vitest tests plus 5 unchanged hook tests pass.
  Dedicated core (35) and contract (59) suites pass. git diff --check is clean.
- Full Linux Electron e2e passed: four art scenarios, two overlay/live-face cases,
  and the board/IPC smoke. The later expanded agent smoke also passes signature
  priority and reduced-motion checks. Temporary libraries/Xvfb and explicit
  test-only software-GL/no-sandbox flags were needed on this container; production
  sandbox/context-isolation settings are unchanged.
- Final alpha.1 Windows unpacked build and archive checks passed with executable
  resource editing disabled for cross-build. Installer generation failed because
  Wine is absent (spawn wine ENOENT). The incomplete installer was removed. Build
  the installer on Windows with npm run dist; no successful installer is claimed.
- Production adapter was exercised against the isolated server using read scope.
  Synthetic recorded projections and provider rows are not live-provider acceptance.

Windows/manual and full-week use are not accepted from source tests. Full outside
approvals are deferred by the approved scope, not counted as passing provider tests.
At that checkpoint no Phase 2 work had started. The user authorized splitting that implementation into focused Conventional Commits and pushing them to origin/main on 2026-11-07. The commit history records that checkpoint; manual acceptance remains pending.

M13 revalidation (2026-11-07, current checkout):

- Inspection found the approved Phase 1 monitoring implementation already present;
  no new behavior or approval capability was added. Corrected DESIGN.md's stale
  opening claim that no isolated live-server verification had occurred.
- npm run check passes. Node 22.23.4 passes 114 Vitest tests and 5 hook tests,
  including dedicated core (35) and contract (59) suites. The shell's Node 18
  cannot start Vitest and is below the declared Node >=22.12 requirement.
- Existing Windows archive checks pass for original placeholder bytes, notices,
  helper, panel/preload, CSP and excluded secret paths. This rechecks existing
  output; it does not claim a new installer build or Windows execution.
- Full Linux Electron e2e passes: four art scenarios, two overlay/live-face cases
  and agent board smoke. Used the existing temporary Xvfb/shared libraries with
  explicit test-only no-sandbox/software-GL flags; production settings unchanged.
- Windows installer/provider/manual acceptance and the full-week trial remain
  unchecked. No commit or next-milestone work was performed.

## Phase 2: Assistant

The user authorized proceeding on 2026-11-07 without claiming M13 human acceptance.
Work remains one milestone at a time; the first milestone is defined below.

### M14: Personality and context files

- [x] Add bundled `SOUL.md`, `USER.md`, and `MEMORY.md` defaults.
- [x] Load fixed local overrides read-only at startup with independent fallback.
- [x] Validate bounded UTF-8 files; reject links, NUL, oversized and non-file input.
- [x] Test exact text, deterministic parsing, fallback and no personal-file writes.
- [x] Document local setup, trust boundaries and packaging rules.
- [x] Finish full tests, Electron startup and package verification.

Exit: default/local context loads without granting actions or exposing personal
text to renderers. No provider or chat behavior is enabled. Manual Windows profile
loading remains a separate user check; no acceptance is inferred from Linux smoke.

M14 verification (2026-11-07): npm run check passes; 120 Vitest tests and 5 hook
tests pass, with core (35) and contracts (65) passing separately. Full source
Electron e2e passes with original placeholder art using the existing temporary
Linux runtime and explicit test-only software-GL/no-sandbox flags. Windows unpacked
cross-build and archive checks pass with resource editing/signing disabled. The
new test:context-packaged smoke runs the built ASAR on host Electron and passes
default context loading plus placeholder rendering. It caught an ASAR virtual-stat
identity mismatch; bundled reads now use archive-aware readFile, while personal
overrides retain bounded handle reads. No installer or native Windows run is
claimed. No files were staged or committed; the next milestone was not started.

### M15: Providers

- [x] Unified Ollama/compatible streaming port and bounded complete-stream proposals.
- [x] Main-only encrypted settings/key storage with memory fallback.
- [x] Parser, failure, configuration and credential-store contract tests.

### M16: Assistant lifecycle and policy

- [x] Pure lifecycle, retry/stall/cancellation transitions and invariant properties.
- [x] Offline command parser and exact action proposal validation.

### M17: Actions, storage and T3 operations

- [x] Notes, reminders, approved memory and local SQLite transcript search.
- [x] Constrained file search, music/app controls and trusted native boundaries.
- [x] Separate operating-scope pairing and confirmed T3 start/steering.

### M18: Assistant UI and release verification

- [x] Typed isolated assistant window, provider setup, exact approvals and Stop.
- [x] Guided pointing, integration smoke and package checks.
- [x] Document manual acceptance and remaining limitations.
- [ ] Run real Windows/live-provider acceptance in docs/PHASE2_ACCEPTANCE.md.

### Phase 2 feature checklist

- [x] Add the provider interface for Ollama, OpenAI-compatible APIs, and cloud keys.
- [x] Add streaming, retries, stall detection, and an offline command mode.
- [x] Add validated action registry and policy checks.
- [x] Add safe PC actions, reminders, notes, file search, music controls, and app controls.
- [x] Add approved memory and transcript search.
- [x] Add T3 thread start and steering after confirmation.
- [x] Add guided pointing.

Phase 2 verification (2026-11-07):

- npm run check passes under Node 22.23.4. Full suite: 150 Vitest + 5 hook tests;
  dedicated core 45 and contracts 85 pass. No new dependency was installed; alpha.2
  uses Node/Electron's built-in SQLite (experimental warning on Node 22).
- Full Linux Electron e2e passes: four art scenarios, two overlay/live-face cases,
  unchanged monitoring board smoke, and new assistant confirmation/XSS/hide/memory/
  secret-isolation/signature/point-cancellation smoke. Existing 30/60 fps assertions
  pass. Temporary Xvfb/shared libraries and explicit test-only software-GL/no-sandbox
  flags were required; production sandbox/context-isolation settings are unchanged.
- Alpha.2 Windows unpacked cross-build and all archive checks pass with executable
  resource editing/signing disabled. Built-ASAR context/placeholder smoke and the
  full assistant smoke pass on host Electron. This is not native Windows execution.
  No new installer was built; Windows npm run dist and native acceptance remain.
- Fixture/provider failures caught SQLite LIKE escaping and installed-ASAR file
  identity issues; both are fixed. Decision-audit failure blocks execution; Forget
  disables the provider in memory even when deleting its saved file fails. Late
  guide cancellation does not resurrect a pointer after teleport or cancel a newer
  guide. Native controls and actual model/T3 compatibility require manual evidence.
- DESIGN.md, usage/acceptance and third-party provenance match implementation.
  No vendor source or exposure sheets changed. No real provider request/agent turn
  or live-user-data test ran. No files were staged, no commit/PR was made, and
  Phase 3 was not started.

## Phase 3: Voice and screen

### M19: Media lifecycle and settings

- [x] Pure tagged lifecycle and run-scoped commands, cancellation and property tests.
- [x] Typed-only/local/custom/cloud settings with endpoint validation and consent.
- [x] Main-only encrypted atomic credentials and memory-only fallback.

### M20: Audio and interaction

- [x] Kokoro speech and Parakeet WAV transcription through separate local services.
- [x] Explicit speech playback, audio RMS lip-sync for optional live face and meter.
- [x] Mouse/keyboard push-to-talk, visible mic indicator and optional wake phrase.
- [x] Typed transcript review; no automatic chat/action submission.

### M21: Screen access

- [x] Explicit display selection and one-shot capture, with in-memory preview.
- [x] Optional periodic local watching, off by default; no automatic image uploads.
- [x] Separate explicit vision request, bounded parsing and untrusted descriptions.
- [x] Stop/hide/block cancellation and stale-result protection.

### M22: Phase 3 verification

- [x] Finish check, core/contracts/full suite and Electron regression smoke.
- [x] Verify Windows unpacked archive and built-ASAR smoke.
- [x] Document usage, licensing, privacy boundaries and manual checks.
- [ ] Native Windows / real Kokoro, Parakeet, microphone and vision acceptance in
  docs/PHASE3_ACCEPTANCE.md (human checks; not inferred from automated tests).

Phase 3 verification (2026-11-07):

- npm run check passes under Node 22.23.4. Final full suite: 165 Vitest tests
  plus 5 unchanged hook tests. Dedicated core (51) and contracts (93 before the
  final added deadline test, also passed in the full suite) pass. Node 18 cannot
  launch Vitest and is below the project's declared Node >=22.12 requirement.
- Full Linux Electron e2e passes: four art cases, overlay/live-face and existing
  30/60 fps assertions, agent board and assistant/media smoke. Media smoke covers
  typed defaults, invalid IPC, secret isolation, original-placeholder capture
  preview, watch/Stop and hidden cleanup. Production desktop/microphone contents
  are not used. Temporary Xvfb/libraries and explicit test-only software-GL and
  no-sandbox flags were required; production sandbox settings remain enabled.
- Final alpha.3 Windows unpacked cross-build and archive checks pass with executable
  resource editing/signing disabled. The built-ASAR assistant/media/placeholder
  smoke passes on host Electron. No new installer or native Windows run is claimed.
- Added regression coverage for explicit-only vision uploads after analysis,
  watch revocation, stale transcription after Stop, encrypted settings, malformed
  PCM, bounded HTTP results, and deadlines even when dependencies never settle.
- Native Windows microphone/audio/DPI, actual model services, optional face lip-sync
  visual quality and installer acceptance remain unchecked in PHASE3_ACCEPTANCE.md.
  Kokoro/Parakeet are external services, not bundled engines. Four-second wake
  chunks can miss a phrase crossing their boundary. Watching is a local preview;
  it does not automatically describe or upload screens.
- DESIGN.md and external-model notices match implementation. No vendor source,
  exposure sheets, private art or new runtime dependency was added. No real
  provider request or agent turn ran. No files were staged or committed.

At the Phase 3 checkpoint, Phase 4 remained unstarted. External model servers/weights are not bundled or
launched by Capri. Wake detection uses bounded transcription chunks, not an
on-device keyword detector. Watching updates the local preview only; sending it
to the configured vision model requires a separate click. The placeholder retains
its original face-free artwork; the audio meter works without a faceAnchor.

## Phase 4: Fun extras

### M23: Bond and moods

- [x] Opt-in five-stage bond, bounded daily progress and atomic persistence/reset.
- [x] Temporary moods, playful jealousy, opt-in check-ins and cooldowns.
- [x] Pure transitions and properties for bounds, no penalties and approval priority.

### M24: Movement, music and visual extras

- [x] Retain window wandering with approval gating; add smooth visual cursor riding.
- [x] Add Windows-session mini player and confirmation-based music controls.
- [x] Add procedural dance, two click-through visual clones and bounded chaos.
- [x] All extras opt-in, with quiet/reduced-motion/signature/approval suppression.

### M25: Approved input jobs

- [x] Strict bounded mouse/navigation schemas and opaque target binding.
- [x] Use assistant confirmation/audit lifecycle; never auto-run or retry.
- [x] Fixed Windows helper, identity/geometry/focus checks and global stop key.
- [x] Parser/executor contracts and input-job approval invariant property.

### M26: Phase 4 verification

- [x] Finish check, full/core/contracts and Electron regression verification.
- [x] Verify alpha.4 Windows unpacked archive and installed-ASAR smoke.
- [x] Update design, usage and honest native Windows acceptance checklist.
- [ ] Native Windows input, stop latency, media-session, DPI and daily-use checks in
  docs/PHASE4_ACCEPTANCE.md (not inferred from fixture/Linux tests).

Phase 4 verification (2026-11-07):

- npm run check passes under Node 22.23.4. Full suite: 177 Vitest tests plus
  5 unchanged hook tests. Dedicated core (58) and contracts (99) pass. The new
  core has no Node/Electron/Effect/DOM/timer/random/logging imports or effects.
- Full Linux Electron e2e passes: original-placeholder/art cases, overlay/live-face
  30/60 fps checks, board and assistant/media/fun integration. Fun smoke verifies
  default opt-ins, two click-through clones, dance/ride/chaos gating, reduced motion,
  approval suppression and disabling extras. No real native input or agent turn ran.
- Alpha.4 Windows unpacked cross-build and all archive checks pass with executable
  resource editing/signing disabled. Original placeholder, notices and fixed helper
  bytes match source; bond data and secrets are excluded. Final built-ASAR assistant/
  media/fun smoke passes on host Electron. No installer or native Windows execution
  is claimed. Xvfb/shared libraries and explicit test-only no-sandbox/software-GL
  flags were required; production sandbox/context isolation remain enabled.
- Initial packaged fun smoke exposed an asynchronous fixture race with leftover
  pointing state and IPC delivery. Reset fixture state and explicit bounded UI
  waits fixed it; the rebuilt archive passes, including reduced-motion suppression.
- Native helper execution/stop latency, Win32/UWP focus/DPI variations, actual media
  sessions, visual quality and daily resource use remain manual checks. This Linux
  host has no PowerShell/C# native runtime, so no native helper compilation or
  Windows safety acceptance is claimed from TypeScript/fixture tests.
- DESIGN.md and PHASE4_ACCEPTANCE.md describe supported behavior, failures and limits.
  Existing notices remain intact; no additional third-party code/assets, vendor
  source, exposure data, runtime dependency, private art or secret was added.
  Nothing is staged or committed. The Later backlog remains untouched.

Native input is intentionally constrained to trusted Calculator/Notepad windows,
1–20 Move/Click/navigation-key steps. No free typing, modifiers, Enter, arbitrary
shortcuts, Discord automation, background exploration, shell or executable tool is
enabled. Mini player lives in the Assistant; dance uses playback state, not beat
analysis. Clones are visual echoes, never agents. Product constraints take priority
over broader reference inventory entries; those capabilities are not claimed.

## Private base-art preparation (2026-11-08)

- [x] Prepare an ignored, newly illustrated version-1 mochi-v1 base pack, retaining
  high-resolution sources, reference provenance, notices and generation prompts privately.
- [x] Inspect the 240x420 transparent texture with the unchanged renderer in neutral,
  raised-arm and seated poses at approximately 250 pixels displayed height.
- Pip remains the bundled fallback. No optional face, portrait, cut-in or intro
  assets, renderer changes, or new runtime behavior are included.
- Full private-pack animation and daily-use visual acceptance remain manual.
- [x] Lower standing and art-preview arms to a relaxed resting pose, preserving
  standing exposure timing and explicit gesture angles. Keep original private
  texture backup and trim out-of-rig fingertip remnants exposed by lowered arms.

## Animation polish (2026-11-08)
- [x] Audit exposure sheets, interpretation clip mapping, and dance/chaos layers.
- [x] Relax startup/fallback arms; retain purposeful spread-arm gestures.
- [x] Fix reversed arm raises, missing wave/head motion and float entry offsets.
- [x] Bound dance/chaos rotations and coordinate arm, mane and body movement.
- [x] Add property checks and sample all clips/exposure sheets at 30 and 60 fps.
- Face-only private expressions remain unavailable until a separate face pack is
  requested; full daily-use visual acceptance remains manual.

Verification: npm run check passes; 83 core/scaffold tests pass, including all
clip samples and exposure sheets at 30/60 fps. Electron overlay (Pip and optional
face), agent, and assistant/media/fun smoke tests pass. Private visual review
covers standing, wave, stretch, nod, hair flick, tease, dance and chaos.
The full suite also reports five failures outside the changed animation code:
three Windows symlink permission failures, one assistant action timeout and a
vendored T3 contract hash mismatch. Those files were not changed or tests weakened.
Pip artwork is unchanged; private captures remain ignored; nothing is staged.

## Animation naturalness (2026-11-08)
- [x] Gate face-only clips out when the pack has no faceAnchor; map gaze to head motion.
- [x] Restrict autonomous clip pulses to idle-tagged clips; gestures/reactions only when requested.
- [x] Raise the clip arm ceiling past horizontal to overhead (2.3 rad over rest).
- [x] Couple giggle's body bounce to head pitch at half amplitude.
- [x] Add settle-to-rest keys to victory, stretch and alarm sheets; ease cartwheel/backflip rotation at the apex.
- [x] Drive the live-face blink with the random Blinker; remove dead Animator/ClipInstance/applyClip/REACTION_CLIPS.
- [x] Add property checks for arm ceiling, gaze, autonomous selection, giggle velocity and sheet settles.

Verification: npm run check passes; 85 core tests and 124 core+scaffold tests pass, including new arm-ceiling, gaze, autonomous-selection, giggle-velocity and sheet-settle checks. Overlay smoke passes and the private motion review shows wave/stretch arms overhead instead of horizontal. Full npm test reports four failures in unrelated assistant contract tests (three Windows symlink EPERM, one assistant-action timeout), matching the pre-existing failures recorded below. Full daily-use visual acceptance remains manual.

## Antics and showcase (2026-11-08)
- [x] Audit render loop, FX and interval costs; compare against the three reference projects.
- [x] Skip GPU draws for held cels; idle timer loop; remove per-frame layout and canvas reallocation.
- [x] Add 27 antics with cued props, particles, word bursts and synthesized sounds.
- [x] Add pure antics director with a single Antics switch and poke combos, suppressed by attention states.
- [x] Add an elbow joint and review every arm pose in every exposure sheet.
- [x] Add waist, pelvis, thigh and knee rig with planted-foot solving; re-pose all sheets.
- [x] Make the side peek show only her head and mane.
- [x] Add sandboxed showcase window with catalog, tour and pretend desktop.
- [x] Pin vendored contract line endings so its byte hash check passes on Windows checkouts.
- [x] Add an optional art-pack `props` map, with code-drawn props as the fallback.
- [x] Restyle word bursts and the joke error card as shard panels.
- [x] Fix the knocked-down (`ko`) arms, left on the pre-rest-pose scale so they stuck out in a T; lift the lounge pose (`LIE_LIFT` 18 to 34) so she rests on the ledge instead of sinking into it.
- [x] Make the ledge lounge alternate only the two window-perch reference poses (tucked flare / extended sprawl) with a glitch-echo swap, stop sleep mode flattening them, and hold the showcase long enough to see both.
- [x] Add an optional drawn-art `poses` map (`loungeCoiled`/`loungeSprawl`) so a pack can replace the rig-warped lounge with drawn pictures; private pack ships both, drawn to the window-perch reference poses.
- [x] Rest knocked-down floor placement on a body-only hull (`core/motion/contact.ts`, pinned by `contact.test.ts`); the full outline still bounds flight bounces and sideways clamping. Mane and outstretched hand no longer prop her floating above the floor.
- Manual: judge antics on the real desktop, at 30 and 60 fps, with private art and Pip.

## Rotation views (2026-11-09)
- [x] Fit generated side, three-quarter, and back views onto the mochi-v1 240x420 grid, with the front arms composited into the shared arm zone.
- [x] Load an optional pack `views` map (exactly 240x420), falling back toward front; code-drawn Pip `side` and `back` keep rotation working without a private pack.
- [x] Switch the sprite texture per pose `view` and swing `turn` through quarter/side and `spin` through quarter/side/back.
- [x] Pin the new maps and fallbacks with contract, scaffold, and redraw tests; review every turn/spin key with both packs.
- Manual: judge the turn and spin on the real desktop, at 30 and 60 fps, with private art and Pip.

## Idle variety and partial-body peeks (2026-11-10)
- [x] Review exposure sheets, the rig shader, clip scheduling and peek placement for stiffness and repetition.
- [x] Ease the standing float (slow-in, slow-out, just over two seconds) and add `standHip`, `standLoose` and `sitLean` cycles she settles into by herself.
- [x] Add `wave`, `shrug`, `think`, `sway`, `scout`, `bounce` and seated `legswing`; pick flourishes and peeks without repeating recent ones (`core/motion/variety.ts`).
- [x] Rest 3.5-12 s between idle clips instead of a fixed 5 s; ease clip weight in and out; make idle breathing and weight shift non-periodic.
- [x] Add partial-body appearances (`core/motion/peek.ts`): half of her leaning out from a side edge, and head and shoulders over the floor line, with an overshoot on the way in.
- [x] Pin the new decisions with property tests and the new sheets with scaffold tests; add showcase entries.
- [x] Fix frog-legged crouches: knees bend toward the viewer (thigh and shin foreshorten) with a slight outward turn, feet planted exactly (`core/motion/legs.ts`, `uLegL/R`).
- Manual: judge the new cycles, flourishes and peeks on the real desktop, at 30 and 60 fps, with private art and Pip.

## Expressive face art (2026-11-10)
- [x] Add an optional pack `expressions` map and paint the current expression into the sprite texture, so her face changes on the full body.
- [x] Decide blinks, moods, glances and act faces in a pure state machine (`core/motion/expression.ts`) with property tests.
- [x] Draw 13 original expression patches and 5 cut-in close-ups for the private pack (code-drawn, `art/private/faces-build.html`); declare `faceAnchor`, `expressions` and `cutins`. Cut-ins now play during victory, alarm, zap and pointing.
- Pip has no expressions yet, and the legacy panel portraits (`faces`) are not drawn.
- Manual: judge blink rhythm, moods and act faces on the real desktop at 30 and 60 fps.

## Later

- [ ] Connect to T3Code on the VPS over Tailscale.
- [ ] Add VPS health monitoring.
- [ ] Add games, game commentary, and streaming mode.
- [ ] Add skins, settings mods, and Mac or Linux builds.
- [ ] Review remaining reference roadmap items.
