import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, checkDescriptor, parseToken } from './policy.mjs';
test('only credential-free loopback origins are accepted', () => {
  assert.equal(parseAddress('http://127.0.0.1:3773'), 'http://127.0.0.1:3773');
  for (const url of ['https://example.com', 'http://user:secret@localhost', 'http://localhost/path', 'http://localhost/?token=secret']) assert.throws(() => parseAddress(url));
});
test('version and protocol both gate access', () => {
  assert.deepEqual(checkDescriptor({ serverVersion: '0.1.7', orchestrationProtocolVersion: 2 }), { serverVersion: '0.1.7', orchestrationProtocolVersion: 2 });
  for (const value of [null, {}, {serverVersion: '0.1.7', orchestrationProtocolVersion: 1}, {serverVersion: '0.1.8', orchestrationProtocolVersion: 2}]) assert.throws(() => checkDescriptor(value));
});
test('reject expired, wrong-scope and non-bearer credentials', () => {
  const value = { access_token: 'fixture', token_type: 'Bearer', expires_in: 60, scope: 'orchestration:read' };
  assert.equal(parseToken(value), value);
  for (const patch of [{expires_in: 0}, {scope: 'mcp:read'}, {token_type: 'DPoP'}, {access_token: ''}]) assert.throws(() => parseToken({...value, ...patch}));
});
test('copied contracts match the pinned source hashes', async () => {
  const {readFile} = await import('node:fs/promises');
  const {createHash} = await import('node:crypto');
  const manifest = JSON.parse(await readFile(new URL('./contracts.sha256.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(manifest)) {
    assert.equal(createHash('sha256').update(await readFile(new URL(`./contracts/${file}`, import.meta.url))).digest('hex'), hash);
  }
});

test('initial subscription omits afterSequence; reconnect preserves zero', async () => {
  const {shellInput} = await import('./policy.mjs');
  assert.deepEqual(shellInput(undefined), {requestCompletionMarker: true});
  assert.deepEqual(shellInput(0), {afterSequence: 0, requestCompletionMarker: true});
  for (const value of [-1, NaN, 1.5]) assert.throws(() => shellInput(value));
});
