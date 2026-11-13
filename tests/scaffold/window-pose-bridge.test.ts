import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// All window-riding transitions between perched sit and lying lounge
// (lieDown/getUp, including lounge -> fall which routes through getUp)
// must share the reference stretch bridge (angle 33, lead-leg extension,
// mane flare, glitch echo) from art/private/references/window-perch-lounge-ref.png.
const src = readFileSync(join(__dirname, '../../src/renderer/js/capri.js'), 'utf8');

const lieDownBlock = src.slice(src.indexOf('async lieDown()'), src.indexOf('getUp() {'));
const getUpBlock = src.slice(src.indexOf('getUp() {'), src.indexOf('async playLying'));

for (const [name, block] of [['lieDown', lieDownBlock], ['getUp', getUpBlock]] as const) {
  test(`${name} passes through the reference stretch bridge`, () => {
    expect(block, `${name} block`).toContain('[2, 33,');
    expect(block, `${name} lead leg`).toContain('kickL: 0.3');
    expect(block, `${name} glitch echo`).toContain('echo: [6, 0]');
  });
}

// The held lounge-on-edge loop (what the showcase gallery shows) must use the
// two attached reference poses: the tucked flare and the extended sprawl.
test('lounge on edge alternates the two reference poses', async () => {
  // @ts-expect-error Retained exposure-sheet module stays JavaScript.
  const { ACTS } = await import('../../src/renderer/js/acting.js');
  const keys = ACTS.lounge.keys as [number, Record<string, number | number[]>][];
  const tucked = keys.some(([, pose]) => pose.longL === 0.01 && (pose.mane as number) >= 0.25);
  const sprawl = keys.some(([, pose]) => pose.longL === 1.2 && (pose.sy as number) >= 1.18);
  const glitch = keys.some(([, pose]) => Array.isArray(pose.echo));
  expect(tucked, 'tucked flare pose (left reference)').toBe(true);
  expect(sprawl, 'extended sprawl pose (right reference)').toBe(true);
  expect(glitch, 'glitch echo from the reference').toBe(true);
  // Only the two silhouettes (plus the brief glitch swap between them), in turn.
  const silhouettes = keys.map(([, pose]) => pose.longL);
  expect(silhouettes).toEqual([0.01, 0.01, 0.5, 1.2, 1.2, 0.5]);
  expect(keys.filter(([hold]) => hold <= 2)).toHaveLength(2);
  // Visibly different body angles: tucked sits up, sprawl lies flat (a rig-only
  // value change at showcase scale reads as the old pose).
  const tilts = keys.map(([, pose]) => pose.tilt as number);
  expect(Math.min(...tilts)).toBeLessThanOrEqual(-6);
  expect(Math.max(...tilts)).toBeGreaterThanOrEqual(10);
});

test('sleep mode does not flatten the lounge poses', () => {
  const at = src.indexOf("mode === 'sleep' && this.stance === 'sit'");
  const sleepBlock = src.slice(at, at + 300);
  expect(sleepBlock).toContain('!this.lounge');
  expect(sleepBlock).not.toContain('mane: -0.14');
});

// With drawn pose pictures the two poses are variants: one picked at random per lounge and
// never swapped mid-lounge. She arrives on the ledge already in the pose: no sitting up facing
// you first, and no rig lean-in.
test('drawn lounge poses are random variants she arrives in', () => {
  expect(lieDownBlock).toContain('if (this.loungeArt) return this.lieDownDrawn();');
  expect(getUpBlock).toContain('if (lounge.art) return this.getUpDrawn(lounge);');
  const loungeOn = src.slice(src.indexOf('  loungeOn({ win, dx }, variant) {'), src.indexOf('  canPossess() {'));
  expect(loungeOn).toContain("Math.random() < 0.5 ? 'loungeCoiled' : 'loungeSprawl'");
  expect(loungeOn).toContain("stance: 'sit'");
  expect(loungeOn).toContain('lounge }');
  const drawn = src.slice(src.indexOf('async lieDownDrawn('), src.indexOf('getUpDrawn(lounge) {'));
  expect(drawn).toContain('this.loungeOn(');
  expect(drawn).not.toContain('playLying');
  const arrive = src.slice(src.indexOf('  async arrive('), src.indexOf('  async teleport('));
  expect(arrive).toContain('shown: true');
  expect(arrive).toContain("else if (stance === 'sit') this.perform('plop');");
  const held = src.slice(src.indexOf('let drawnTex = null;'), src.indexOf('p.head = pose.head;'));
  expect(held).toContain('drawnTex = this.lounge.art;');
  expect(held).not.toContain('loungeSprawl');
  const moves = src.slice(src.indexOf('const LOUNGE_MOVES = {'), src.indexOf('const LOUNGE_ART = {'));
  expect(moves).not.toContain('down:');
  for (const part of ['settle', 'lift', 'up']) expect(moves.split(part + ': [').length - 1, part).toBe(2);
});
