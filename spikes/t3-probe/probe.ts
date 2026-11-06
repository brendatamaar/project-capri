// Deliberately monitoring-only until the M7 provider gate has evidence.
import { readFile } from 'node:fs/promises';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Socket from 'effect/socket/Socket';
import { OrchestrationV2RpcSchemas } from './contracts/orchestrationV2.ts';
import { parseAddress, checkDescriptor, parseToken, shellInput } from './policy.mjs';

async function json(url: string, init?: RequestInit) {
  const result = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!result.ok) throw new Error(`HTTP ${result.status}`);
  return result.json();
}
async function main() {
  const origin = parseAddress(process.env.T3_PROBE_URL ?? 'http://127.0.0.1:3773');
  console.log(checkDescriptor(await json(`${origin}/.well-known/t3/environment`)));
  if (process.argv.includes('--descriptor-only')) return;
  if (process.env.T3_PROBE_ISOLATED !== 'yes') throw new Error('Set T3_PROBE_ISOLATED=yes only for a separate test data directory');
  const file = process.env.T3_PROBE_PAIRING_FILE;
  if (!file) throw new Error('T3_PROBE_PAIRING_FILE must name a private credential file');
  const credential = (await readFile(file, 'utf8')).trim();
  const token = parseToken(await json(`${origin}/oauth/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:t3:params:oauth:token-type:environment-bootstrap', subject_token: credential,
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token', scope: 'orchestration:read' }),
  }));
  console.log({ expiresIn: token.expires_in, scope: token.scope });
  let sequence: number | undefined;
  // A second, fresh ticket/socket proves resubscription afterSequence.
  for (let pass = 0; pass < 2; pass++) {
    console.log({ stage: 'ticket', pass });
    const ticket = await json(`${origin}/api/auth/websocket-ticket/rpc`, {
      method: 'POST', headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (typeof ticket.ticket !== 'string' || !ticket.ticket) throw new Error('Invalid ticket');
    const group = RpcGroup.make(Rpc.make('orchestration.subscribeShell', {
      payload: OrchestrationV2RpcSchemas.subscribeShell.input,
      success: OrchestrationV2RpcSchemas.subscribeShell.output, stream: true,
    }));
    const socket = Socket.layerWebSocket(`${origin.replace('http:', 'ws:')}/ws?orchestrationProtocol=2&wsTicket=${encodeURIComponent(ticket.ticket)}`)
      .pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal));
    const protocol = RpcClient.layerProtocolSocket().pipe(Layer.provide(socket), Layer.provide(RpcSerialization.layerJson));
    console.log({ stage: 'socket', pass });
    await Effect.runPromise(Effect.gen(function* () {
      const client = yield* RpcClient.make(group);
      yield* client['orchestration.subscribeShell'](shellInput(sequence)).pipe(
        Stream.takeUntil(item => pass === 0 && process.argv.includes('--expect-delta')
          ? 'sequence' in item : item.kind === 'synchronized'),
        Stream.runForEach(item => Effect.sync(() => {
          if (item.kind === 'snapshot') sequence = item.snapshot.snapshotSequence;
          else if ('sequence' in item) sequence = item.sequence;
          // Never print project names, thread text, requests, tokens, or ticket URLs.
          console.log({ pass, kind: item.kind, sequence });
        })),
      );
    }).pipe(Effect.provide(protocol), Effect.scoped, Effect.timeout('20 seconds')));
  }
}
main().catch(() => { console.error('Probe failed; credentials and server payloads withheld. Check setup and compatibility.'); process.exitCode = 1; });
