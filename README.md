# Capri Companion

Personal, non-commercial Electron companion. Phase 0 implementation; Windows acceptance pending.

Read [PRD](docs/PRD.md), [DESIGN](docs/DESIGN.md), [AGENTS](AGENTS.md), and [PLAN](docs/PLAN.md).
The root AGENTS.md mirrors docs/AGENTS.md so coding tools discover the project rules.

Use Node 22.12 or newer, then:

```sh
npm install
npm run dev
npm run check
npm test
npm run test:core
npm run test:contracts
npm run test:e2e
npm run dist
```

`npm run dev` starts an offline transparent desktop companion with Pip, an original teal-and-brass robot. Right-click its body or tray icon for settings, teleport/sleep, the showcase, behavior toggles, monitors, and quit. Ctrl+Alt+C toggles the compact form; Ctrl+Alt+Q toggles quiet. Pause companion activity from the tray to cancel the current renderer/action context. The original main.js stays dormant: no agent service, hooks, chat, screen capture, or network setup runs.

`test:core` tests pure policies, transitions, motion, following, and reactions. `test:contracts` tests art and settings boundaries/storage. `test:e2e` tests actual Electron decoding/rendering and the off-screen overlay with isolated original fixtures. `npm run dist` builds an unsigned Windows installer and verifies its unpacked archive; `dist:unpacked` skips the installer. Output stays in ignored release/. No install or Windows startup registration is performed by the build/test commands.

See [Windows acceptance](docs/WINDOWS_ACCEPTANCE.md) for hands-on checks and the one-week gate. The tray shows the active pack name/source; choose a pack preference and restart to apply. [Art-pack instructions](art/README.md) cover private locations. To open only the M1 preview, run `npm run build` followed by `npx electron . --art-preview`. The tray can open the custom sound folder; restart after adding cue files.

Only code was imported. Show-derived face geometry and pose records were omitted. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for exact pins, changes, attribution, and license texts. Never copy reference art or history into this repository.
