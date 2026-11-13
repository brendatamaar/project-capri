import { expect, test } from 'vitest';
import fc from 'fast-check';
import { FLOURISHES, FLOURISH_MEMORY, SIT_CYCLES, STAND_CYCLES, cycleHold, nextCycle, pickFresh, remember } from '../motion/variety';
import { clipEnvelope } from '../motion/mixer';
import { REST_RANGE_MS, restAfter, stepMotion, type MotionState } from '../motion/scheduler';
import { sampleIdleLife } from '../motion/playful';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS } from '../../renderer/js/acting.js';

const names = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 1, maxLength: 8 });
const anyNumber = fc.oneof(fc.double(), fc.constantFrom(NaN, Infinity, -Infinity, -1, 2));

test('a fresh pick is always from the pool and never a recent one while another is left', () => {
  fc.assert(fc.property(names, fc.array(fc.string({ maxLength: 6 }), { maxLength: 8 }), anyNumber, (pool, recent, choice) => {
    const picked = pickFresh(pool, recent, choice)!;
    expect(pool).toContain(picked);
    if (pool.some(name => !recent.includes(name))) expect(recent).not.toContain(picked);
    expect(pickFresh(pool, recent, choice)).toBe(picked);
  }));
  expect(pickFresh([], ['a'], 0.5)).toBeUndefined();
});

test('every pool member can be reached, so nothing is dead weight', () => {
  fc.assert(fc.property(names, pool => {
    const seen = new Set(pool.map((_, index) => pickFresh(pool, [], (index + 0.5) / pool.length)));
    expect(seen.size).toBe(pool.length);
  }));
});

test('memory keeps only the last few, newest last', () => {
  fc.assert(fc.property(fc.array(fc.string(), { maxLength: 10 }), fc.string(), fc.integer({ min: -2, max: 6 }), (recent, name, keep) => {
    const next = remember(recent, name, keep);
    expect(next.length).toBeLessThanOrEqual(Math.max(0, keep));
    if (keep > 0) expect(next.at(-1)).toBe(name);
  }));
});

test('she never settles back into the stance cycle she is already in, and holds it a bounded while', () => {
  fc.assert(fc.property(anyNumber, anyNumber, (choice, delay) => {
    for (const pool of [STAND_CYCLES, SIT_CYCLES]) for (const current of pool) {
      const next = nextCycle<string>(pool, current, choice);
      expect(pool).toContain(next);
      expect(next).not.toBe(current);
    }
    expect(cycleHold(delay)).toBeGreaterThanOrEqual(12_000);
    expect(cycleHold(delay)).toBeLessThanOrEqual(38_000);
  }));
  expect(nextCycle(['only'], 'only', 0.3)).toBe('only');
});

test('every cycle and flourish is a real sheet: cycles loop and start level, flourishes end at rest', () => {
  for (const name of [...STAND_CYCLES, ...SIT_CYCLES]) {
    expect(ACTS[name]?.loop, name).toBe(true);
    expect(ACTS[name].keys[0][1].bob ?? 0, name).toBe(0); // she changes cycle on the first drawing
  }
  for (const name of new Set([...FLOURISHES.stand, ...FLOURISHES.sit])) {
    expect(ACTS[name], name).toBeDefined();
    expect(ACTS[name].loop, name).toBeFalsy();
  }
  for (const name of ['wave', 'shrug', 'think', 'sway', 'scout', 'bounce', 'legswing']) expect(Object.keys(ACTS[name].keys.at(-1)[1]), name).toHaveLength(0);
  expect(FLOURISHES.stand.length).toBeGreaterThan(FLOURISH_MEMORY + 1);
  expect(FLOURISHES.sit.length).toBeGreaterThan(FLOURISH_MEMORY + 1);
});

test('an hour of idle flourishes never repeats one of the last four', () => {
  let recent: readonly string[] = [];
  const counts = new Map<string, number>();
  for (let i = 0; i < 400; i++) {
    const name = pickFresh(FLOURISHES.stand, recent, (i * 0.618033) % 1)!;
    expect(recent).not.toContain(name);
    recent = remember(recent, name, FLOURISH_MEMORY);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  expect(counts.size).toBe(FLOURISHES.stand.length);
});

test('a clip fades in and out without a jump, and is fully on in between', () => {
  fc.assert(fc.property(fc.double({ min: 0.5, max: 6, noNaN: true }), fc.double({ min: -1, max: 7, noNaN: true }), (duration, elapsed) => {
    const weight = clipEnvelope(elapsed, duration);
    expect(weight).toBeGreaterThanOrEqual(0);
    expect(weight).toBeLessThanOrEqual(1);
    if (elapsed <= 0 || elapsed >= duration) expect(weight).toBe(0);
    if (elapsed >= 0.2 && elapsed <= duration - 0.2) expect(weight).toBe(1);
    expect(Math.abs(clipEnvelope(elapsed + 1 / 60, duration) - weight)).toBeLessThan(0.13); // eased: no step at 60 fps
  }));
  expect(clipEnvelope(0.01, 2)).toBeLessThan(0.01); // starts slowly, where a straight ramp is already at 0.05
});

test('the rest between fidgets varies with the delay and stays in range', () => {
  fc.assert(fc.property(anyNumber, fc.double({ min: 0, max: 1e6, noNaN: true }), (delay, now) => {
    const playing: MotionState = { tag: 'Playing', name: 'a', runId: 3, startedAt: 0, endsAt: now, recent: ['a'] };
    for (const state of [
      stepMotion(playing, { tag: 'Ended', runId: 3, now, delay }).state,
      stepMotion(playing, { tag: 'Pulse', now, runId: 4, choice: 0, delay, eligible: true, quiet: false, candidates: [] }).state,
    ]) {
      expect(state.tag).toBe('Waiting');
      if (state.tag !== 'Waiting') return;
      expect(state.nextAt - now).toBeGreaterThanOrEqual(REST_RANGE_MS[0] - 1e-6);
      expect(state.nextAt - now).toBeLessThanOrEqual(REST_RANGE_MS[1] + 1e-6);
    }
  }));
  expect(restAfter(0.9)).toBeGreaterThan(restAfter(0.1));
});

test('idle weight shift does not repeat on its short period', () => {
  const period = 2300 * 2 * Math.PI;
  let differs = 0;
  for (let i = 0; i < 40; i++) {
    const t = 1000 + i * 733;
    if (Math.abs(sampleIdleLife(t, 0, 1).hipX - sampleIdleLife(t + period, 0, 1).hipX) > 0.05) differs++;
  }
  expect(differs).toBeGreaterThan(20);
});
