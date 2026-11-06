# Windows acceptance and daily use

Implementation checks do not replace this manual gate. No real-user acceptance
or full-week use has been claimed. Record your results below without private art,
screenshots, project text, credentials, or personal paths.

## Install and launch

- [ ] Install the generated unsigned `release/Capri-Companion-Setup-0.1.0-alpha.0.exe`, or use `npm run dev` for source testing.
- [ ] Launch with agents and T3Code closed; no connection/setup prompts appear.
- [ ] Confirm acceptable startup time and visible original Pip with the placeholder preference.
- [ ] Check a trusted local private pack, restart, and confirm its active name/source in the tray.
- [ ] Missing portraits/cut-ins/intro files do not cause startup failure.
- [ ] Quit from the tray and confirm the companion and read-only watcher exit.
- [ ] In an installed build, toggle Start with Windows, sign out/in to check it, then restore your preferred setting.

## Desktop interaction

- [ ] Click other applications through empty overlay space; body and compact form remain clickable.
- [ ] Move, minimize, maximize, and close a window while the character sits on it.
- [ ] Test taskbar, screen-bottom, and visible desktop-icon seating. Hidden/unsupported icons may have no seats.
- [ ] Drag, release, throw, catch, bounce, and land; body click pokes and head strokes pet.
- [ ] Test peek, lying down, teleport, sleep/wake, compact form, and the agent-free showcase.
- [ ] Fullscreen an application; the whole companion hides and returns afterward.
- [ ] Test monitor selection and following on your real layout, especially negative coordinates and mixed DPI.
- [ ] Pause during an animation; it disappears immediately. Resume starts a fresh renderer.
- [ ] Turn off each behavior; zap, satellite, PC reactions, and visual possession are opt-in.
- [ ] If enabled, possession only draws an effect; it never changes another native window.
- [ ] Check optional CPU, battery, network-state, device-change, and known-game reactions. No network requests are made to detect connectivity.
- [ ] Quiet stops sound; custom cue files in the application's local sounds folder replace synthesis after restart.

## Motion and daily use

- [ ] Compare 30 and 60 fps during drag, throw, teleport, and window riding.
- [ ] Signature acts keep their deliberate holds; idle clips fade before an act starts.
- [ ] Watch for ten minutes: varied clips, no obvious blend pops, no interruption of signatures.
- [ ] With a face-anchor pack, check blinking, gaze, expressions, and head alignment.
- [ ] Reduced motion avoids large moves/flashes; hidden rendering pauses.
- [ ] Check CPU/GPU, responsiveness, and battery impact during ordinary work.

## Full work week (M6 exit gate)

Start date: pending. End date: pending.

- [ ] Day 1
- [ ] Day 2
- [ ] Day 3
- [ ] Day 4
- [ ] Day 5
- [ ] You still want to keep the companion running.
- [ ] Confirm all Phase 0 PRD acceptance criteria from this use.

Known observations: initial shader startup was slow in some hidden automation runs;
the final serial smoke tests passed. Real multi-monitor/DPI, native click-through,
installer registration, icon-provider availability, and full-week performance remain
unverified until these checks are completed. Six existing moderate builder-chain
dependency advisories were recorded in M0; no unrelated major downgrade was applied.

## Bug record

For each issue record: Windows version, app version, placeholder/private-pack type,
30/60 fps setting, motion/behavior toggles, steps, expected result, observed result.
No bugs or manual passes should be invented to close the gate.
