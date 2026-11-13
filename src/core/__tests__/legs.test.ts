import { expect, test } from 'vitest';
import fc from 'fast-check';
import { KNEE_SPLAY, LEGS, NO_BEND, solveLegs } from '../motion/legs';

const turn = (x: number, y: number, a: number) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
// Rebuilds the foot the way the shader places it: thigh around the moved hip, then shin around the knee.
// Each segment is squashed along the sprite's y by its scale first, as in standingLeg.
function chain(leg: typeof LEGS.left | typeof LEGS.right, thigh: number, knee: number, thighScale: number, shinScale: number, crouch: number, hipX: number) {
  const flip = leg.outward < 0 ? 1 : -1, a = flip * thigh, b = flip * (thigh + knee);
  const upper = turn(leg.knee.x - leg.hip.x, (leg.knee.y - leg.hip.y) * thighScale, a), lower = turn(leg.foot.x - leg.knee.x, (leg.foot.y - leg.knee.y) * shinScale, b);
  const hip = { x: leg.hip.x + hipX, y: leg.hip.y + crouch };
  return { hip, knee: { x: hip.x + upper.x, y: hip.y + upper.y }, foot: { x: hip.x + upper.x + lower.x, y: hip.y + upper.y + lower.y } };
}
const both = (crouch: number, hipX: number) => {
  const legs = solveLegs(crouch, hipX);
  return [
    { leg: LEGS.left, ...chain(LEGS.left, legs.thighL, legs.kneeL, legs.thighScaleL, legs.shinScaleL, crouch, hipX), scales: [legs.thighScaleL, legs.shinScaleL] },
    { leg: LEGS.right, ...chain(LEGS.right, legs.thighR, legs.kneeR, legs.thighScaleR, legs.shinScaleR, crouch, hipX), scales: [legs.thighScaleR, legs.shinScaleR] },
  ];
};

test('no pelvis move means no leg bend', () => {
  expect(solveLegs(0, 0)).toBe(NO_BEND);
  const almost = solveLegs(0.0001, 0);
  for (const key of ["thighL", "kneeL", "thighR", "kneeR"] as const) expect(Math.abs(almost[key])).toBeLessThan(0.01);
  for (const key of ["thighScaleL", "shinScaleL", "thighScaleR", "shinScaleR"] as const) expect(almost[key]).toBeCloseTo(1, 3);
});

test('a small dip bends the knees only a little, and the bend grows smoothly', () => {
  const kneeAt = (c: number) => Math.abs(solveLegs(c, 0).kneeL);
  expect(kneeAt(0.6)).toBeLessThan(0.05);
  expect(kneeAt(3)).toBeLessThan(0.15);
  let previous = 0;
  for (let c = 0; c <= 40; c += 0.5) {
    const now = kneeAt(c);
    expect(now - previous).toBeLessThan(0.06);
    previous = now;
  }
});

test('feet stay planted at every pelvis position, small dips included', () => {
  fc.assert(fc.property(fc.double({ min: -4, max: 60, noNaN: true }), fc.double({ min: -18, max: 18, noNaN: true }), (crouch, hipX) => {
    for (const { leg, foot } of both(crouch, hipX)) {
      expect(Math.abs(foot.x - leg.foot.x)).toBeLessThan(0.05);
      expect(Math.abs(foot.y - leg.foot.y)).toBeLessThan(0.05);
    }
  }));
});

test('a crouch folds the legs toward the viewer: they shorten, and the knees turn out only a little', () => {
  fc.assert(fc.property(fc.double({ min: 4, max: 60, noNaN: true }), fc.double({ min: -12, max: 12, noNaN: true }), (crouch, hipX) => {
    for (const { leg, hip, knee, scales } of both(crouch, hipX)) {
      for (const scale of scales) { expect(scale).toBeLessThan(1); expect(scale).toBeGreaterThan(0.15); }
      // how far the knee is from the straight hip-foot line, against a bend done all in the screen plane
      const dx = leg.foot.x - hip.x, dy = leg.foot.y - hip.y, reach = Math.hypot(dx, dy);
      const off = ((knee.x - hip.x) * dy - (knee.y - hip.y) * dx) / reach;
      const thigh = Math.hypot(leg.knee.x - leg.hip.x, leg.knee.y - leg.hip.y), shin = Math.hypot(leg.foot.x - leg.knee.x, leg.foot.y - leg.knee.y);
      const along = (thigh * thigh + reach * reach - shin * shin) / (2 * reach), flat = Math.sqrt(Math.max(0, thigh * thigh - along * along));
      expect(Math.abs(off)).toBeLessThanOrEqual(flat * KNEE_SPLAY + 5); // 5: the drawn knee is already a few px out
      // ...and what little it turns is away from her body, never knock-kneed
      const lineX = hip.x + dx * (knee.y - hip.y) / dy;
      expect((knee.x - lineX) * leg.outward).toBeGreaterThanOrEqual(-1e-6);
      expect(knee.y).toBeGreaterThan(hip.y);
      expect(knee.y).toBeLessThan(leg.foot.y);
    }
  }));
  const deep = solveLegs(40, 0);
  expect(deep.thighL).toBeGreaterThan(0.05);
  expect(deep.thighR).toBeGreaterThan(0.05);
  expect(deep.kneeL).toBeLessThan(-0.05);
  expect(deep.kneeR).toBeLessThan(-0.05);
  expect(deep.thighL).toBeLessThan(0.45); // the old in-plane solve put this past 0.6: frog legs
});

test('bad input is safe', () => {
  for (const value of Object.values(solveLegs(Number.NaN, Number.POSITIVE_INFINITY))) expect(Number.isFinite(value)).toBe(true);
});
