import { expect, test } from 'vitest';
// @ts-expect-error Retained renderer stays JavaScript.
import { poseChanged, poseKey, resolveView, VIEW_ORDER } from '../../src/renderer/js/sprite.js';

const pose = () => ({ seed: 3, boil: 0.9, hair: 0, head: 0, mane: 0, armL: -0.85, armR: -0.85, longL: 1, longR: 1, sit: 0, bend: 0, kickL: 0, kickR: 0, smear: [0, 0], echo: [0, 0], glitch: 0, glitchSeed: 0, split: 0, collapse: 0, dissolve: 0, sparkle: 1, grade: 1, sil: [0, 0, 0], silAmount: 0, misreg: [-2.6, 2.2], alpha: 1, elbowL: -0.2, elbowR: -0.3, view: 'front' });
const key = (value: ReturnType<typeof pose>) => poseKey(value, new Float64Array(VIEW_ORDER.length + 36));

test('an identical held drawing needs no redraw, and spring noise does not count', () => {
  expect(poseChanged(key(pose()), key(pose()))).toBe(false);
  expect(poseChanged(key(pose()), key({ ...pose(), head: 0.0001 }))).toBe(false);
});

test('anything visible forces a redraw', () => {
  for (const change of [{ head: 0.1 }, { armL: 0 }, { elbowL: 1 }, { elbowR: 1 }, { waist: 0.2 }, { crouch: 8 }, { hipX: 4 }, { thighL: 0.3 }, { ikKneeR: -0.4 }, { alpha: 0.5 }, { seed: 9 }, { glitch: 0.2, glitchSeed: 4 }, { silAmount: 0.4 }, { smear: [4, 0] }, { view: 'side' }, { view: 'quarter' }, { view: 'back' }, { face: 2 }]) {
    expect(poseChanged(key(pose()), key({ ...pose(), ...change }), JSON.stringify(change))).toBe(true);
  }
});

test('a new context or resize always draws', () => {
  expect(poseChanged(new Float64Array(VIEW_ORDER.length + 36).fill(NaN), key(pose()))).toBe(true);
});

test('the seed is ignored when no effect reads it', () => {
  const still = { ...pose(), boil: 0, sparkle: 0 };
  expect(poseChanged(key(still), key({ ...still, seed: 50 }))).toBe(false);
});

test('missing views fall back toward the front sprite', () => {
  expect(resolveView('side', new Set(['front']))).toBe('front');
  expect(resolveView('quarter', new Set(['front']))).toBe('front');
  expect(resolveView('quarter', new Set(['front', 'side']))).toBe('side');
  expect(resolveView('back', new Set(['front', 'side', 'quarter']))).toBe('front');
  expect(resolveView('side', new Set(['front', 'side']))).toBe('side');
  expect(resolveView('back', new Set(['front', 'back']))).toBe('back');
  expect(resolveView('nope', new Set(['front']))).toBe('front');
});

test('the hand follows the elbow, and a straight arm matches the old single-joint reach', async () => {
  // @ts-expect-error Retained renderer stays JavaScript.
  const { handPoint, SPRITE } = await import('../../src/renderer/js/sprite.js');
  const straight = handPoint(0, 1, 0);
  expect(straight.x).toBeCloseTo(SPRITE.hand.x, 1);
  expect(straight.y).toBeCloseTo(SPRITE.hand.y, 1);
  const bent = handPoint(0, 1, 1.5);
  expect(Math.hypot(bent.x - SPRITE.shoulder.x, bent.y - SPRITE.shoulder.y)).toBeLessThan(Math.hypot(straight.x - SPRITE.shoulder.x, straight.y - SPRITE.shoulder.y));
  expect(Math.hypot(bent.x - SPRITE.elbow.x, bent.y - SPRITE.elbow.y)).toBeCloseTo(Math.hypot(SPRITE.hand.x - SPRITE.elbow.x, SPRITE.hand.y - SPRITE.elbow.y), 1);
});
