import { expect, test } from 'vitest';
import fc from 'fast-check';
import { JOINTS, followPose, settled, startTracks, valuesOf, type Feel, type Joints } from '../motion/blend';

const pose = (value: number): Joints => Object.fromEntries(JOINTS.map((key) => [key, value])) as Joints;
const feels: Feel[] = ['stepped', 'mixed', 'soft'];

test('a held pose is reached and the layer reports it settled', () => {
  for (const feel of feels) {
    let tracks = startTracks(pose(0));
    for (let i = 0; i < 240; i++) tracks = followPose(tracks, pose(1), 1 / 30, feel);
    expect(settled(tracks, pose(1))).toBe(true);
  }
});

test('following never overshoots a pose it starts at rest for', () => {
  fc.assert(fc.property(fc.double({ min: -3, max: 3, noNaN: true }), fc.constantFrom(...feels), fc.double({ min: 0.001, max: 0.1, noNaN: true }), (target, feel, dt) => {
    let tracks = startTracks(pose(0));
    for (let i = 0; i < 120; i++) {
      tracks = followPose(tracks, pose(target), dt, feel);
      for (const value of Object.values(valuesOf(tracks))) {
        expect(value * Math.sign(target)).toBeLessThanOrEqual(Math.abs(target) + 1e-9);
      }
    }
  }));
});

test('soft follows slower than stepped, and bad input stays finite', () => {
  const soft = valuesOf(followPose(startTracks(pose(0)), pose(1), 1 / 30, 'soft')).armL;
  const stepped = valuesOf(followPose(startTracks(pose(0)), pose(1), 1 / 30, 'stepped')).armL;
  expect(soft).toBeLessThan(stepped);
  const bad = followPose(startTracks(pose(Number.NaN)), pose(Number.POSITIVE_INFINITY), Number.NaN, 'soft');
  for (const value of Object.values(valuesOf(bad))) expect(Number.isFinite(value)).toBe(true);
});

test('following does not change its input', () => {
  const tracks = startTracks(pose(0));
  followPose(tracks, pose(1), 0.03, 'mixed');
  expect(tracks.armL).toEqual({ value: 0, velocity: 0 });
});
