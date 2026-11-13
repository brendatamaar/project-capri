import { expect, test } from 'vitest';
import fc from 'fast-check';
import { BODY_AXIS, buildBodyHull, buildHull, isBodyContact } from '../motion/contact';

// Independent oracle for the contact rule: distance to the head-feet segment,
// with a narrower radius above the legs so shoulder-height mane is excluded.
function expectedContact(x: number, y: number): boolean {
  const dx = BODY_AXIS.bx - BODY_AXIS.ax, dy = BODY_AXIS.by - BODY_AXIS.ay;
  const t = Math.max(0, Math.min(1, ((x - BODY_AXIS.ax) * dx + (y - BODY_AXIS.ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (BODY_AXIS.ax + t * dx), y - (BODY_AXIS.ay + t * dy)) <= (y >= 200 ? 45 : 28);
}

test('head, torso and feet count as body; mane tips and the outstretched hand do not', () => {
  for (const [x, y] of [[118, 130], [95, 170], [120, 250], [107, 410], [85, 400], [118, 105], [128, 418]]) expect(isBodyContact(x, y), `${x},${y}`).toBe(true);
  for (const [x, y] of [[215, 80], [24, 212], [30, 60], [200, 180], [165, 177], [73, 105], [0, 0]]) expect(isBodyContact(x, y), `${x},${y}`).toBe(false);
  expect(isBodyContact(Number.NaN, 100)).toBe(false);
  expect(isBodyContact(118, Number.POSITIVE_INFINITY)).toBe(false);
});

test('contact matches distance to the axis and never throws', () => {
  fc.assert(fc.property(fc.integer({ min: -50, max: 290 }), fc.integer({ min: -50, max: 470 }), (x, y) => {
    expect(isBodyContact(x, y)).toBe(expectedContact(x, y));
  }));
  fc.assert(fc.property(fc.double({ noNaN: false }), fc.double({ noNaN: false }), (x, y) => {
    expect(() => isBodyContact(x, y)).not.toThrow();
    if (!Number.isFinite(x) || !Number.isFinite(y)) expect(isBodyContact(x, y)).toBe(false);
  }));
});

function alphaWith(rects: Array<[number, number, number, number]>, w = 240, h = 420) {
  const alpha = new Uint8ClampedArray(w * h * 4);
  for (const [x0, y0, x1, y1] of rects)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) alpha[(y * w + x) * 4 + 3] = 255;
  return { alpha, w, h };
}

test('the body hull drops a mane spike and a reaching hand but keeps the foot', () => {
  const { alpha, w, h } = alphaWith([[100, 100, 140, 418], [180, 40, 220, 120], [20, 200, 30, 220]]);
  const full = buildHull(alpha, w, h, 118, 232);
  const body = buildBodyHull(alpha, w, h, 118, 232);
  const reach = (hull: readonly (readonly [number, number])[]) => Math.max(...hull.map(([hx]) => hx));
  expect(reach(full)).toBeGreaterThan(80); // the mane spike props the full outline
  expect(reach(body)).toBeLessThan(30); // body contact rests on the torso column
  expect(body.length).toBeGreaterThan(0);
});

test('an empty body filter falls back to the full outline', () => {
  const { alpha, w, h } = alphaWith([[0, 0, 10, 10]]); // far from the axis: nothing is body
  expect(buildBodyHull(alpha, w, h, 118, 232)).toEqual(buildHull(alpha, w, h, 118, 232));
});
