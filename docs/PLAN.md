# Capri Companion Implementation Plan

This plan builds the overlay companion first, then connects her to coding agents. `PRD.md` owns product scope, `DESIGN.md` owns behavior, and this file owns order and progress.

Current milestone: **M6 release candidate built; manual acceptance remains unverified. Phase 1 is unstarted and stopped at the user's request.**

Repository checkpoint (2026-11-06): the user authorized grouping the M0–M6 implementation into several commits and pushing to `origin/main`. Earlier milestone notes describe their pre-commit verification state. This checkpoint does not accept the manual Windows/full-week gate or restart Phase 1.

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

## Phase 1: Agent companion

This phase adds T3Code status and approvals to the finished overlay.

### M7: T3Code gate

Goal: prove that Capri can observe threads and answer approvals through T3Code RPC before building the product around it.

- [ ] Create a throwaway probe in `spikes/t3-probe/`.
- [ ] Copy the pinned T3Code contracts into the probe.
- [ ] Set up a test T3Code project and set its threads to Supervised.
- [ ] Create a pairing credential with `orchestration:read` and `orchestration:operate`.
- [ ] Exchange it at `/oauth/token`.
- [ ] Issue a WebSocket ticket and connect to `/ws`.
- [ ] Log `subscribeShell` snapshots, deltas, and `synchronized`.
- [ ] Reconnect with `afterSequence`.
- [ ] Load one pending request with `getThreadProjection`.
- [ ] Approve and deny one request with `runtime-request.respond` on Claude, Codex, Antigravity, and Muse.
- [ ] Confirm provider limit data for Claude, Codex, and Antigravity.
- [ ] Record bearer token lifetime and the desktop server address.
- [ ] Update `DESIGN.md` with the results.

Exit criteria:

- If approvals work, continue to M8.
- If approvals fail on a provider, mark that provider `ThreadOnly`.
- If RPC can't be used safely, stop and revisit the approval design with the user.

### M8: Pure core

Goal: implement phase 1 decisions without Electron or T3Code.

- [ ] Add branded IDs and closed state, input, and command unions.
- [ ] Implement connection transitions.
- [ ] Implement thread transitions and reaction edge detection.
- [ ] Implement approval transitions and guards.
- [ ] Implement derived presence and quiet mode.
- [ ] Export `step` and `run`.
- [ ] Add one test for every transition row.
- [ ] Add property tests for every `DESIGN.md` invariant.

Verification:

- `npm run test:core` passes.
- `neverApprovesWithoutUser` and `disconnectedCannotApprove` fail when their guards are removed, then pass after restoring them.

### M9: Shell and boundaries

Goal: connect the pure core to stores, timers, and the UI.

- [ ] Add boundary parsers.
- [ ] Add `SecureStore`, `AuditLog`, `Scheduler`, `PanelPort`, and `CharacterPort`.
- [ ] Write contract suites and memory fakes first.
- [ ] Add the command interpreter.
- [ ] Replace broad preload exposure with typed overlay and panel bridges.
- [ ] Keep tokens in the main process only.

Verification:

- Contract tests pass for all fakes and local adapters.
- A renderer can't read a token through IPC.
- `npm run check` passes.

### M10: T3Code adapter

Goal: replace hooks as the main agent source.

- [ ] Promote the M7 connection into `src/main/t3/`.
- [ ] Copy pinned contracts to `vendor/t3-contracts/` with `VERSION.md`.
- [ ] Implement `T3Auth` and `T3Rpc`.
- [ ] Add server version and protocol checks.
- [ ] Add jittered reconnect capped at 5 minutes.
- [ ] Add recorded replay fixtures for shell and thread streams.
- [ ] Subscribe to active thread details only.
- [ ] Parse provider limits from server config updates.
- [ ] Keep Claude hooks as a disabled fallback.

Verification:

- Replay contract tests pass.
- Optional live contract tests pass against a separate T3Code data directory.
- Capri recovers after a server restart without replaying reactions.

### M11: Board and approval queue

Goal: complete the main user workflow.

- [ ] Add the pairing screen and connection states.
- [ ] Add the thread board.
- [ ] Add provider permission labels.
- [ ] Add the approval card from `DESIGN.md`.
- [ ] Support Approve, Deny, and Open in T3Code.
- [ ] Focus the oldest blocking approval.
- [ ] Lock approval controls when disconnected or hidden.
- [ ] Add local audit logging.
- [ ] Add limit rows and Muse token-use fallback.

Verification:

- A Supervised thread can be approved and denied from Capri on supported providers.
- `ThreadOnly` requests open the correct T3Code thread.
- Approvals survive panel hide and reconnect.

### M12: Character reactions

Goal: make agent state understandable through Capri's behavior.

- [ ] Map presence to character actions.
- [ ] Connect ticker, thinking timer, failure, done, and needs-you reactions.
- [ ] Make her come to the user and point at the approval card.
- [ ] Add quiet mode.
- [ ] Add reduced-motion replacements.
- [ ] Keep sounds synthesized or user-provided.
- [ ] Update the fake session demo to use recorded T3Code streams.

Verification:

- Every row in the DESIGN.md reaction table works in the demo.
- Reconnecting doesn't replay old celebrations.
- Quiet mode removes sound and speech.

### M13: Agent companion release

Goal: use Capri daily with your coding agents.

- [ ] Add settings for the T3Code connection.
- [ ] Update the installer and package checks.
- [ ] Run the PRD phase 1 acceptance checklist.
- [ ] Use Capri with T3Code for one full work week.
- [ ] Record bugs and missing behavior.

Exit criteria:

- All phase 1 acceptance criteria pass.
- You still want Capri running after a week of daily use.

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
