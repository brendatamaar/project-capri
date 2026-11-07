# Phase 1 monitoring fallback acceptance

Scope approved by the user on 2026-11-07: monitoring plus Open in T3Code for every
unverified provider. Claude, Codex, Antigravity and Muse are ThreadOnly. No outside
approval sends are implemented or claimed. Full approval enablement requires a
separate provider gate and read/operate scopes; never infer support from this release.

## Automated evidence

- Pure core: attempts/sequences, deterministic replay, stale run results, quiet,
  presence, pending focus, detail retry, edge reactions and reconnect cursors.
- Store/boundary contracts: encrypted atomic persistence, no plaintext fallback,
  audit deduplication, timer cancellation, read-only auth scope, decision IPC denial,
  pinned-source hashes, four-provider recorded replay and exact request matching.
- Isolated server at loopback port 3774, version 0.1.7 / protocol 2: pairing,
  read-scope token exchange (~30-day lifetime), RPC ticket, snapshot, project delta,
  synchronized and fresh-socket afterSequence. Idle synthetic threads only;
  no agent turn or real provider approval ran.
- Electron: original art fallback/live-face fixtures and overlay smoke; board for
  four synthetic providers, exact request text, HTML injection rejection, disabled
  decision controls, known-thread opening, hide/fullscreen, quiet and reconnect.
- Linux host smoke uses a temporary Xvfb display and temporary shared libraries.
  CAPRI_SMOKE_NO_SANDBOX=1 and CAPRI_SMOKE_SOFTWARE_GL=1 are explicit test-only
  launch options for this container. They do not change production sandbox settings
  or validate native Windows rendering/security behavior.

## Required manual checks (not yet accepted)

Current-checkout revalidation on 2026-11-07: npm run check, 114 Vitest tests,
5 hook tests, dedicated core (35) and contracts (59), and existing Windows archive
checks pass. Tests used cached Node 22.23.4 because the default Node 18 does not
meet package.json's >=22.12 requirement. No real provider turn, approval response,
new installer build, or Windows runtime check was performed during this revalidation.
Full Linux Electron e2e also passes (four art scenarios, two overlay/live-face
cases and agent board smoke), using the temporary runtime and explicit test-only
flags described above. Placeholder rendering is verified; native Windows behavior
remains a manual check.

- [ ] Install the updated unsigned Windows build with only original placeholder art.
- [ ] Open Agent board from the tray; pair with the intended local T3Code instance.
- [ ] Confirm real Claude/Codex/Antigravity/Muse thread statuses and permission labels.
- [ ] In a Supervised thread, verify provider/project/thread and exact request text.
- [ ] Open in T3Code lands on that exact environment/thread; respond there.
- [ ] Hide and reopen the panel; pending requests survive.
- [ ] Restart T3Code; status becomes unavailable, then recovers without replaying celebrations.
- [ ] Quiet removes sound/speech; reduced motion avoids travel/large flashes.
- [ ] Signature animations finish before queued agent reactions; stale reactions expire.
- [ ] Pending card stays readable beside animation, including on multiple monitors/DPI.
- [ ] Restart Capri; secure token persistence works, and Disconnect clears it.
- [ ] Confirm installer/startup behavior on Windows.
- [ ] Keep Capri with T3Code running for a full work week and record issues.

Record each issue with Windows/T3Code version, provider, reproduction steps,
expected/actual result and whether quiet/reduced-motion/fullscreen was active.
Do not attach tokens, request bodies, or private project content to public reports.

Implementation completion is distinct from human acceptance. Do not check these
boxes without user evidence, and do not call the full-week trial complete from tests.

## Release-build result (2026-11-07)

Alpha.1 Windows unpacked output and archive checks pass. This Linux cross-build
used signAndEditExecutable=false, so Windows executable resource editing/signing
was skipped. The installer attempt failed with spawn wine ENOENT; its incomplete
installer was removed. Use npm run dist on Windows to finish the installer and
then perform the manual checklist. No Windows runtime/installer acceptance is
claimed from the cross-build or from Linux Electron smoke.
