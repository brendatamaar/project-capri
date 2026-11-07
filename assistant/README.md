# Assistant context

Capri loads three Markdown documents at startup and before each model turn: `SOUL.md` for personality,
`USER.md` for your preferences, and `MEMORY.md` for approved durable facts.

To customize them on Windows, create an `assistant` folder under Capri's Electron
user-data folder (normally `%APPDATA%\Capri Companion\assistant`) and copy the
desired files from `assistant/defaults/`. Edit your local copies; they load before the next model turn or after restart.
Leave unspecified files absent to use bundled defaults. An empty file is a valid
way to suppress that document's default content.

Each document must be a regular UTF-8 file without NUL characters, at most 64 KiB.
Symlinked files and a symlinked assistant directory are rejected. Missing, invalid,
and unreadable local files use defaults with a separate reason in the main-process
snapshot. File contents and local paths are never logged or sent to renderers.
The loader never creates or overwrites files. A separately confirmed memory action
can append to MEMORY.md. There is no file watcher.

These documents are untrusted context, never permission policy. The Assistant window offers optional local/cloud providers and context shortening.
Cloud requests require explicit configuration/consent. Approved memory actions
append exact text to MEMORY.md; SOUL/USER remain manually edited. See
[Phase 2 usage and acceptance](../docs/PHASE2_ACCEPTANCE.md).
Keep personal files outside the repository. Only the generic bundled defaults
are included in releases.

Verification: `npm run test:contracts` covers the loader. After an unpacked Windows
build, `npm run test:context-packaged` uses host Electron to load the built ASAR and
render the placeholder. This checks archive loading, not Windows native behavior.

Manual Windows checks still needed:

- Launch without personal files; confirm normal placeholder/board startup.
- Create valid local copies, restart, and confirm startup remains normal.
- Try a malformed/oversized local copy; confirm startup falls back without modifying it.
- Confirm the installed package contains only generic defaults. Verify the next model turn uses the selected context without granting permissions.
