import { expect, it } from 'vitest';
import fc from 'fast-check';
import { ANTICS, MOVING_ANTICS, POKE_COMBOS, POKE_WINDOW_MS, candidates, initialAntics, stepAntics, type AnticInput, type AnticState } from '../antics';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS, Player } from '../../../renderer/js/acting.js';

const pulse = (over: Partial<Extract<AnticInput, { tag: 'Pulse' }>> = {}): AnticInput => ({ tag: 'Pulse', now: 100_000, runId: 1, choice: 0.5, delay: 0.5, eligible: true, enabled: true, music: false, ...over });
const unit = fc.double({ min: 0, max: 1, noNaN: true });

it('every antic and poke combo is a real exposure sheet', () => {
  for (const item of ANTICS) expect(ACTS[item.name], item.name).toBeDefined();
  for (const [, name] of POKE_COMBOS) expect(ACTS[name], name).toBeDefined();
});

it('every antic returns to rest and stays inside rig limits', () => {
  for (const item of ANTICS) {
    const sheet = ACTS[item.name], player = new Player(item.name, { at: 0, dir: 1 });
    expect(Object.keys(sheet.keys.at(-1)[1]).length, item.name).toBe(0);
    for (const [hold, pose] of sheet.keys) {
      expect(hold, item.name).toBeGreaterThan(0);
      const resolved = player.resolve(pose, 1);
      for (const key of ['armL', 'armR']) if (resolved[key] !== undefined) expect(Math.abs(resolved[key]), `${item.name}.${key}`).toBeLessThanOrEqual(1.5);
      if (resolved.head !== undefined) expect(Math.abs(resolved.head), `${item.name}.head`).toBeLessThanOrEqual(0.5);
      if (resolved.mane !== undefined) expect(Math.abs(resolved.mane), `${item.name}.mane`).toBeLessThanOrEqual(0.5);
    }
  }
});

it('disabled, ineligible and early pulses never perform', () => {
  fc.assert(fc.property(fc.boolean(), fc.boolean(), unit, unit, (music, enabled, choice, delay) => {
    const state = initialAntics(0);
    expect(stepAntics(state, pulse({ enabled: false, music, choice, delay })).commands).toEqual([]);
    expect(stepAntics(state, pulse({ eligible: false, enabled, music, choice, delay })).commands).toEqual([]);
    expect(stepAntics(state, pulse({ now: 1, enabled, music, choice, delay })).commands).toEqual([]);
  }));
});

it('gentle and wild antics share one pool, music only picks dances, picks avoid the recent list', () => {
  fc.assert(fc.property(unit, unit, fc.boolean(), fc.subarray(ANTICS.map(item => item.name), { maxLength: 6 }), (choice, delay, music, recent) => {
    const state: AnticState = { ...initialAntics(0), recent };
    const step = stepAntics(state, pulse({ choice, delay, music }));
    expect(step.commands).toHaveLength(1);
    const picked = ANTICS.find(item => item.name === step.commands[0].name)!;
    if (music) expect(picked.dance).toBe(true);
    if (candidates(music, recent).some(item => !recent.includes(item.name))) expect(recent).not.toContain(picked.name);
  }));
});

it('seated pulses never pick an antic that leaves the spot', () => {
  fc.assert(fc.property(unit, unit, (choice, delay) => {
    const step = stepAntics(initialAntics(0), pulse({ choice, delay, seated: true }));
    expect(MOVING_ANTICS.has(step.commands[0].name)).toBe(false);
  }));
  for (const name of MOVING_ANTICS) expect(ANTICS.some(item => item.name === name)).toBe(true);
});

it('one performance at a time, stale finishes are ignored, and the watchdog recovers', () => {
  fc.assert(fc.property(fc.integer({ min: 2, max: 1000 }), unit, (stale, delay) => {
    const started = stepAntics(initialAntics(0), pulse({ runId: 1 }));
    expect(stepAntics(started.state, pulse({ runId: 2, now: 100_001 })).commands).toEqual([]);
    expect(stepAntics(started.state, { tag: 'Finished', runId: stale, now: 100_100, delay, enabled: true }).state).toBe(started.state);
    expect(stepAntics(started.state, { tag: 'Finished', runId: 1, now: 100_100, delay, enabled: true }).state.tag).toBe('Resting');
    expect(stepAntics(started.state, pulse({ runId: 3, now: 121_000 })).state.tag).toBe('Resting');
  }));
});

it('bursts chain quickly, then fall back to the normal wait', () => {
  const first = stepAntics(initialAntics(0), pulse({ delay: 0.1, runId: 1 }));
  if (first.state.tag !== 'Performing') throw new Error('not performing');
  expect(first.state.burst).toBe(2);
  const rest = stepAntics(first.state, { tag: 'Finished', runId: 1, now: 110_000, delay: 0.5, enabled: true }).state;
  expect(rest).toMatchObject({ tag: 'Resting', nextAt: 110_500, burst: 1 });
});

it('stop clears a burst and goes back to resting', () => {
  const first = stepAntics(initialAntics(0), pulse({ delay: 0.1, runId: 1 }));
  expect(stepAntics(first.state, { tag: 'Stop', now: 110_000 }).state).toMatchObject({ tag: 'Resting', burst: 0 });
});

it('poke combos fire exactly on their counts and a pause restarts the count', () => {
  let state: AnticState = initialAntics(0);
  const seen: string[] = [];
  for (let index = 1; index <= 8; index++) {
    const step = stepAntics(state, { tag: 'Poke', now: 1000 + index * 300, runId: index, eligible: true });
    state = step.state;
    seen.push(...step.commands.map(command => command.name));
    if (state.tag === 'Performing') state = stepAntics(state, { tag: 'Finished', runId: state.runId, now: 1000 + index * 300, delay: 0, enabled: false }).state;
  }
  expect(seen).toEqual(['huff', 'tantrum', 'boo']);
  expect(state.pokes).toBe(0);
  const a = stepAntics(initialAntics(0), { tag: 'Poke', now: 1000, runId: 1, eligible: true }).state;
  expect(stepAntics(a, { tag: 'Poke', now: 1000 + POKE_WINDOW_MS + 1, runId: 2, eligible: true }).state.pokes).toBe(1);
});

it('pokes while ineligible are remembered but never act', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 20 }), count => {
    let state: AnticState = initialAntics(0);
    for (let index = 0; index < count; index++) {
      const step = stepAntics(state, { tag: 'Poke', now: index * 100, runId: index, eligible: false });
      expect(step.commands).toEqual([]);
      state = step.state;
    }
  }));
});
