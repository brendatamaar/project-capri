# Capri Companion

Personal, non-commercial Electron companion. Phase 1 monitoring fallback implementation; Windows and daily-use acceptance pending.

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

`npm run dev` starts the transparent desktop companion with Pip, an original
teal-and-brass robot. Right-click the body or tray for **Agent board**, settings,
teleport/sleep, showcase, monitors, and quit. Ctrl+Alt+C toggles compact form;
Ctrl+Alt+Q toggles quiet. Pause companion activity from the tray to cancel the
renderer/action context. The imported legacy agent/chat/PC-action entry stays dormant.

The agent board connects to local T3Code **0.1.7 / protocol 2**. In T3Code, create
a pairing code with `t3 pair --scope orchestration:read` (add `--base-dir` for a
separate test instance). Enter its local HTTP origin and pairing code in the board.
Capri requests read scope only, encrypts the resulting token using Electron secure
storage, and reconnects after disconnects. Without secure encryption it keeps the
token in memory and requires pairing again after restart. Disconnect removes the
saved token. There are no network calls before pairing or loading a saved connection.

All providers currently use **ThreadOnly**: the board shows status and pending
requests, then opens the correct T3Code thread for your response. Approve/Deny are
disabled until provider support is explicitly verified. Pending cards show exact
request text when available, otherwise state that details must be reviewed in
T3Code. Provider limits show Unavailable when the server has no valid data.

`npm run demo:agents` runs an offline demonstration using recorded synthetic T3Code
streams. It ignores saved credentials, starts no agent turns, sends no commands,
and labels the board as a demo. `npm run test:agent` exercises the real Electron
board/preload with synthetic events and an isolated Capri profile. See
[Phase 1 acceptance](docs/PHASE1_ACCEPTANCE.md) for remaining human checks.

`test:core` tests pure policies, transitions, motion, following, and reactions. `test:contracts` tests art and settings boundaries/storage. `test:e2e` tests actual Electron decoding/rendering and the off-screen overlay with isolated original fixtures. `npm run dist` builds an unsigned Windows installer and verifies its unpacked archive; `dist:unpacked` skips the installer. Output stays in ignored release/. No install or Windows startup registration is performed by the build/test commands.

See [Windows acceptance](docs/WINDOWS_ACCEPTANCE.md) for hands-on checks and the one-week gate. The tray shows the active pack name/source; choose a pack preference and restart to apply. [Art-pack instructions](art/README.md) cover private locations. To open only the M1 preview, run `npm run build` followed by `npx electron . --art-preview`. The tray can open the custom sound folder; restart after adding cue files.

Only code was imported. Show-derived face geometry and pose records were omitted. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for exact pins, changes, attribution, and license texts. Never copy reference art or history into this repository.
