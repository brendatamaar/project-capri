import { expect, test } from 'vitest';
import fc from 'fast-check';
import { BUST_LINE, HALF_INSET, PEEK_KINDS, PEEK_SPRITE, peekPlan, type PeekKind } from '../motion/peek';
// @ts-expect-error Retained renderer landmarks stay JavaScript.
import { SPRITE } from '../../renderer/js/sprite.js';

const view = fc.record({ w: fc.integer({ min: 640, max: 5120 }), h: fc.integer({ min: 480, max: 2880 }), gap: fc.integer({ min: 0, max: 120 }) })
  .map(({ w, h, gap }) => ({ w, h, floor: h - gap }));
const scale = fc.double({ min: 0.3, max: 1.4, noNaN: true });
const unit = fc.double({ min: 0, max: 1, noNaN: true });
const kind = fc.constantFrom<PeekKind>(...PEEK_KINDS);
// Screen x of a sprite column, for an upright plan.
const columnX = (feet: number, facing: number, s: number, column: number) => feet + (column - PEEK_SPRITE.feetX) * s * facing;

test('the peek landmarks match the renderer', () => {
  expect(PEEK_SPRITE).toMatchObject({ feetX: SPRITE.feet.x, feetY: SPRITE.feet.y, headY: SPRITE.head.y, width: SPRITE.width });
  expect(BUST_LINE).toBeGreaterThan(SPRITE.shoulder.y);
  expect(BUST_LINE).toBeLessThan(SPRITE.hip);
});

test('every plan is finite, deterministic, and ends its way in exactly in place', () => {
  fc.assert(fc.property(kind, view, scale, unit, unit, (name, v, s, along, flip) => {
    const plan = peekPlan(name, v, s, along, flip);
    expect(peekPlan(name, v, s, along, flip)).toEqual(plan);
    for (const value of [plan.at.x, plan.at.y, plan.from.x, plan.from.y]) expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(plan.facing)).toBe(1);
    expect(Math.abs(plan.dir)).toBe(1);
    expect(plan.steps.at(-1)).toBe(1);
    expect(Math.max(...plan.steps)).toBeGreaterThan(1); // she overshoots and settles
    expect(Math.max(...plan.steps)).toBeLessThanOrEqual(1.12);
    expect(plan.dir).toBe(plan.at.x > v.w / 2 ? -1 : 1); // her cycle plays toward the middle
  }));
});

test('head peeks keep the placement they always had', () => {
  const v = { w: 1920, h: 1080, floor: 1040 };
  expect(peekPlan('left', v, 0.6, 0.5, 0)).toMatchObject({ side: 'left', style: 'head', facing: -1, dir: 1, at: { x: 18, y: 1080 * 0.51 + 266 * 0.6 }, from: { x: -114 }, clipBelow: null });
  expect(peekPlan('right', v, 0.6, 0.5, 0)).toMatchObject({ side: 'right', style: 'head', facing: 1, dir: -1, at: { x: 1920 - 18 }, from: { x: 1920 + 114 } });
  expect(peekPlan('top', v, 0.5, 0, 0.9)).toMatchObject({ side: 'top', style: 'head', facing: -1, dir: 1, at: { x: 384, y: -113 }, from: { x: 384, y: -235 } });
});

test('a bust shows her head and shoulders over the floor line and nothing below it', () => {
  fc.assert(fc.property(view, scale, unit, (v, s, along) => {
    const plan = peekPlan('bottom', v, s, along, 0);
    expect(plan).toMatchObject({ side: 'bottom', style: 'bust', clipBelow: v.floor });
    const rowY = (row: number) => plan.at.y - (PEEK_SPRITE.feetY - row) * s;
    expect(rowY(BUST_LINE)).toBeCloseTo(v.floor, 6);
    expect(rowY(PEEK_SPRITE.headY)).toBeLessThan(v.floor - 80 * s); // her face is well clear of the line
    expect(rowY(SPRITE.hip)).toBeGreaterThan(v.floor); // hips and legs stay hidden
    expect(plan.from.y - PEEK_SPRITE.feetY * s).toBeGreaterThan(v.floor); // she starts wholly below it
    expect(plan.at.x).toBeGreaterThanOrEqual(v.w * 0.15);
    expect(plan.at.x).toBeLessThanOrEqual(v.w * 0.85);
  }));
});

test('a half peek stands her on the floor with her middle on the edge, and starts her wholly behind it', () => {
  fc.assert(fc.property(fc.constantFrom<PeekKind>('lean-left', 'lean-right'), view, scale, unit, (name, v, s, along) => {
    const plan = peekPlan(name, v, s, along, 0), left = name === 'lean-left';
    expect(plan).toMatchObject({ side: left ? 'left' : 'right', style: 'half', clipBelow: null, facing: left ? -1 : 1, dir: left ? 1 : -1 });
    expect(plan.at.y).toBeLessThanOrEqual(v.floor);
    const axis = columnX(plan.at.x, plan.facing, s, PEEK_SPRITE.axisX), edge = left ? 0 : v.w;
    expect(Math.abs(axis - edge)).toBeCloseTo(HALF_INSET * s, 6);
    // at rest some of her is on screen and some is not
    const columns = [0, PEEK_SPRITE.width].map(column => columnX(plan.at.x, plan.facing, s, column));
    expect(Math.min(...columns)).toBeLessThan(left ? 0 : v.w);
    expect(Math.max(...columns)).toBeGreaterThan(left ? 0 : v.w);
    // before she comes in, none of her is
    const hidden = [0, PEEK_SPRITE.width].map(column => columnX(plan.from.x, plan.facing, s, column));
    if (left) expect(Math.max(...hidden)).toBeLessThan(0);
    else expect(Math.min(...hidden)).toBeGreaterThan(v.w);
  }));
});

test('bad numbers never produce a broken plan', () => {
  for (const name of PEEK_KINDS) {
    const plan = peekPlan(name, { w: NaN, h: -5, floor: Infinity }, NaN, NaN, NaN);
    for (const value of [plan.at.x, plan.at.y, plan.from.x, plan.from.y]) expect(Number.isFinite(value)).toBe(true);
  }
});
