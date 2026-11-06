# Capri Companion Implementation Plan

This plan builds the overlay companion first, then connects her to coding agents. `PRD.md` owns product scope, `DESIGN.md` owns behavior, and this file owns order and progress.

Current milestone: **M13 acceptance pending. The approved Phase 1 monitoring fallback implementation is validated; Windows installer completion, real Windows/provider acceptance and the full-week trial remain outstanding.**

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
No Phase 2 work has started. The user authorized splitting this implementation into focused Conventional Commits and pushing them to origin/main on 2026-11-07. The commit history records that checkpoint; manual acceptance remains pending.

## Phase 2: Assistant

- [ ] Add `SOUL.md`, `USER.md`, and `MEMORY.md`.
- [ ] Add the provider interface for Ollama, OpenAI-compatible APIs, and cloud keys.
- [ ] Add streaming, retries, stall detection, and an offline command mode.
- [ ] Add validated action registry and policy checks.
- [ ] Add safe PC actions, reminders, notes, file search, music controls, and app controls.
- [ ] Add approved memory and transcript search.
- [ ] Add T3 thread start and steering after confirmation.
- [ ] Add guided pointing.

## Phase 3: Voice and screen

- [ ] Add typed-only, local, custom, and cloud voice settings.
- [ ] Add Kokoro and Parakeet.
- [ ] Add lip-sync from real audio.
- [ ] Add push-to-talk and optional wake word.
- [ ] Add screen look on request.
- [ ] Add optional periodic screen watching, off by default.

## Phase 4: Fun extras

- [ ] Add bond stages, moods, and optional jealousy.
- [ ] Add wandering, cursor riding, music, dance, and the mini player.
- [ ] Add clones and chaos as opt-in features.
- [ ] Add approved mouse and keyboard jobs with a stop key.

## Later

- [ ] Connect to T3Code on the VPS over Tailscale.
- [ ] Add VPS health monitoring.
- [ ] Add games, game commentary, and streaming mode.
- [ ] Add skins, settings mods, and Mac or Linux builds.
- [ ] Review remaining reference roadmap items.
