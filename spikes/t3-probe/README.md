# M7 T3Code gate probe

Run with Node >=22.12. This spike is separate from Capri startup and packaging.
It does not start agent turns, mutate threads, or send approval decisions.

```sh
cd spikes/t3-probe
npm ci
npm test
npm run probe -- --descriptor-only
```

The descriptor-only command accesses only the public version endpoint. Its default
is http://127.0.0.1:3773. Set T3_PROBE_URL to another loopback HTTP origin if needed.
Authenticated testing MUST use a separate T3Code data directory, never the live
user profile. Start an isolated server using the pinned upstream version's setup,
create a throwaway project, and create a pairing credential limited to
orchestration:read. Save that credential to a private file outside the repository.
Then supply T3_PROBE_URL, T3_PROBE_ISOLATED=yes, and T3_PROBE_PAIRING_FILE and run
`npm run probe`. The explicit isolation flag is an operator assertion, not an
automatic guarantee about the remote server's data directory.

The probe validates the server version/protocol, exchanges the credential, checks
bearer type/lifetime/scope, mints an RPC-specific ticket, subscribes until the
synchronized marker, then opens a new socket with afterSequence. Output contains
only version/protocol, token lifetime/scopes, item kinds and sequence numbers.
Failures suppress exception payloads to avoid leaking secrets or thread text.
There is no automatic retry of credential exchange or approval sends.

## Gate evidence still required

- Authenticated snapshot/delta/synchronized and reconnect passed against isolated data at port 3774 (see DESIGN.md).
- Exact pending-request projection and human Approve/Deny on Supervised Claude,
  Codex, Antigravity and Muse; classify unsupported providers as ThreadOnly.
- Provider-limit payload availability and issued bearer lifetime.
- A sanitized evidence record in DESIGN.md before starting M8.

The current executable covers monitoring transport only. Detail/approval and
provider-limit checks are still unimplemented. Do not treat this spike, its
policy tests, or descriptor discovery as a passed M7 gate.

For a delta check, add `--expect-delta`; after the first synchronized marker,
create or update a synthetic project from another authenticated client against the
same isolated server. The probe exits the first stream after a sequenced delta and
then reconnects. It times out after 20 seconds if no delta arrives.

The production adapter live check is separate from the original spike. From the
repository root, bundle `spikes/t3-probe/live-adapter.ts` with esbuild (platform=node,
format=esm) to the spike's ignored dist/ directory, then run that bundle with the
same isolated URL/credential environment variables. It verifies shell resume and
validates an idle projection when a synthetic thread is available.
`record-fixture.ts --create-idle-fixtures` additionally requires a read/operate
credential and creates idle synthetic threads only. No agent turns or approvals run.
