import { expect, test } from 'vitest';
import fc from 'fast-check';
import { ACT_FACE, BLINK_MS, EXPRESSIONS, FLASH_LIMIT_MS, LOOK_THRESHOLD, MOODS, faceFor, initialFace, resolveExpression, stepFace, type Expression, type FaceContext, type FaceState } from '../motion/expression';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS } from '../../renderer/js/acting.js';

const unit = fc.double({ min: 0, max: 1, noNaN: true });
const anyNumber = fc.oneof(fc.double(), fc.constantFrom(NaN, Infinity, -Infinity));
const expression = fc.constantFrom<Expression>(...EXPRESSIONS);
const idle: FaceContext = { act: null, asleep: false, alert: false, petted: false, look: 0, mouthOpen: false, clip: {} };
const tick = (state: FaceState, now: number, playful = true, units = { blink: 0.5, mood: 0.5, choice: 0.5 }) => stepFace(state, { tag: 'Tick', now, playful, ...units }).state;

test('every act with a face names a real sheet and a real expression', () => {
  for (const [act, face] of Object.entries(ACT_FACE)) {
    expect(ACTS[act], act).toBeDefined();
    expect(EXPRESSIONS, act).toContain(face);
  }
  for (const mood of MOODS) expect(EXPRESSIONS).toContain(mood);
  // her plain standing and sitting cycles leave her face free for blinks, looks and moods
  expect(ACT_FACE.stand).toBeUndefined();
  expect(ACT_FACE.sit).toBeUndefined();
});

test('a missing expression falls back to one the pack has, ending at neutral', () => {
  fc.assert(fc.property(expression, fc.subarray([...EXPRESSIONS]), (wanted, have) => {
    const available = new Set<string>([...have, 'neutral']);
    const shown = resolveExpression(wanted, available);
    expect(available.has(shown)).toBe(true);
    if (available.has(wanted)) expect(shown).toBe(wanted);
  }));
  expect(resolveExpression('laugh', new Set(['neutral', 'joy']))).toBe('joy');
  expect(resolveExpression('wink', new Set(['neutral', 'blink']))).toBe('blink');
  expect(resolveExpression('many', new Set(['neutral']))).toBe('neutral');
});

test('she blinks every few seconds, each blink is short, and a double blink never chains', () => {
  fc.assert(fc.property(fc.array(fc.tuple(unit, unit, unit), { minLength: 40, maxLength: 40 }), (rolls) => {
    let state = initialFace(0), blinks = 0, closedSince = -1, longest = 0, previous = 'Open';
    for (let now = 0, i = 0; now <= 60_000; now += 16, i++) {
      const [blink, mood, choice] = rolls[i % rolls.length];
      state = stepFace(state, { tag: 'Tick', now, blink, mood, choice, playful: false }).state;
      if (state.tag === 'Blinking' && previous !== 'Blinking') { blinks++; closedSince = now; }
      if (state.tag !== 'Blinking' && closedSince >= 0) { longest = Math.max(longest, now - closedSince); closedSince = -1; }
      previous = state.tag;
    }
    expect(blinks).toBeGreaterThanOrEqual(8); // at least every 6.5 s or so
    expect(blinks).toBeLessThanOrEqual(60);
    expect(longest).toBeLessThanOrEqual(BLINK_MS + 32);
  }));
});

test('moods only come when she is free to play, and never the moment she becomes free', () => {
  let state = initialFace(0);
  for (let now = 0; now <= 120_000; now += 50) {
    state = tick(state, now, false);
    expect(state.tag).not.toBe('Mood');
  }
  // free again: no mood for a beat, then one within the usual wait
  let seen = -1;
  for (let now = 120_050; now <= 160_000 && seen < 0; now += 50) {
    state = tick(state, now, true);
    if (state.tag === 'Mood') seen = now;
  }
  expect(seen).toBeGreaterThan(120_000 + 2500);
  expect(seen).toBeLessThan(160_000);
});

test('ten idle minutes show several different moods', () => {
  let state = initialFace(0); const moods = new Set<string>();
  for (let now = 0, i = 0; now <= 600_000; now += 33, i++) {
    state = stepFace(state, { tag: 'Tick', now, playful: true, blink: (i * 0.618) % 1, mood: (i * 0.381) % 1, choice: (i * 0.7548) % 1 }).state;
    if (state.tag === 'Mood') { moods.add(state.mood); expect(MOODS).toContain(state.mood); }
  }
  expect(moods.size).toBeGreaterThanOrEqual(4);
});

test('a flash shows at once, over anything, and always ends', () => {
  fc.assert(fc.property(expression, anyNumber, fc.double({ min: 0, max: 1e7, noNaN: true }), (mood, ms, now) => {
    const flashed = stepFace(tick(initialFace(now), now + 2000, false), { tag: 'Flash', now: now + 2000, mood, ms }).state;
    expect(flashed.tag).toBe('Flash');
    expect(faceFor({ ...idle, act: 'victory', asleep: true }, flashed)).toBe(mood);
    expect(tick(flashed, now + 2000 + FLASH_LIMIT_MS + 1).tag).toBe('Open');
  }));
});

test('what she is doing decides her face, and a blink shows through only when her eyes are open', () => {
  const open = initialFace(0), blinking = tick(open, 1900, false);
  expect(blinking.tag).toBe('Blinking');
  expect(faceFor(idle, open)).toBe('neutral');
  expect(faceFor(idle, blinking)).toBe('blink');
  expect(faceFor({ ...idle, act: 'victory' }, open)).toBe('laugh');
  expect(faceFor({ ...idle, act: 'victory' }, blinking)).toBe('laugh'); // eyes already shut with laughing
  expect(faceFor({ ...idle, act: 'zap' }, open)).toBe('smug');
  expect(faceFor({ ...idle, act: 'zap' }, blinking)).toBe('blink');
  expect(faceFor({ ...idle, asleep: true, act: 'wave' }, open)).toBe('sleepy');
  expect(faceFor({ ...idle, petted: true }, open)).toBe('joy');
  expect(faceFor({ ...idle, alert: true }, open)).toBe('wide');
  expect(faceFor({ ...idle, mouthOpen: true }, open)).toBe('talk');
  expect(faceFor({ ...idle, act: 'stand' }, open)).toBe('neutral');
});

test('she looks at the pointer only when it is well to one side, and clips drive her face', () => {
  fc.assert(fc.property(anyNumber, (look) => {
    const face = faceFor({ ...idle, look }, initialFace(0));
    if (!Number.isFinite(look) || Math.abs(look) <= LOOK_THRESHOLD) expect(face).toBe('neutral');
    else expect(face).toBe(look > 0 ? 'lookRight' : 'lookLeft');
  }));
  const open = initialFace(0);
  expect(faceFor({ ...idle, clip: { blinkL: 1, blinkR: 1 } }, open)).toBe('blink');
  expect(faceFor({ ...idle, clip: { blinkL: 1 } }, open)).toBe('wink');
  expect(faceFor({ ...idle, clip: { eyeWide: 0.9 } }, open)).toBe('wide');
  expect(faceFor({ ...idle, clip: { manyEyes: 0.7, eyeWide: 1 } }, open)).toBe('many');
  expect(faceFor({ ...idle, clip: { mouthSmile: 1, squint: 0.6 } }, open)).toBe('joy');
  expect(faceFor({ ...idle, clip: { mouthSmile: -0.8 } }, open)).toBe('pout');
  expect(faceFor({ ...idle, clip: { gazeX: 0.9 } }, open)).toBe('lookRight');
  expect(faceFor({ ...idle, clip: { gazeX: NaN, squint: NaN } }, open)).toBe('neutral');
});

test('any input leaves a valid state and names a known expression', () => {
  fc.assert(fc.property(fc.array(fc.tuple(anyNumber, anyNumber, anyNumber, anyNumber, fc.boolean(), fc.boolean()), { maxLength: 30 }), (steps) => {
    let state = initialFace(0);
    for (const [now, blink, mood, choice, playful, flash] of steps) {
      state = stepFace(state, flash ? { tag: 'Flash', now, mood: 'many', ms: blink } : { tag: 'Tick', now, blink, mood, choice, playful }).state;
      expect(Number.isFinite(state.nextBlinkAt) && Number.isFinite(state.nextMoodAt)).toBe(true);
      expect(EXPRESSIONS).toContain(faceFor({ ...idle, look: now }, state));
    }
  }));
});
