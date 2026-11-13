// Smooth posture layer: the joints of the hand-timed rig follow the drawn pose through critically
// damped springs, so held cels ease into each other instead of popping, and a change of stance
// (sit -> fall, sleep -> wake, tumble -> knocked down) carries on from where the limbs were.
// How stiff the follow is depends on who is driving: a crisp act on the exposure clock barely lags,
// a stance cycle drifts. The method is adapted from TheAgencyMGE's Animator (MIT), see spring.ts.
import { spring, type Spring } from './spring';

/** Joints that follow. Whole-body squash, lean, bob and mirroring stay exactly as drawn. */
export const JOINTS = ['armL', 'armR', 'elbowL', 'elbowR', 'kickL', 'kickR', 'thighL', 'thighR', 'waist', 'bend', 'hipX', 'crouch', 'longL', 'longR'] as const;
export type Joint = (typeof JOINTS)[number];
export type Feel = 'stepped' | 'mixed' | 'soft';
export type Joints = Readonly<Record<Joint, number>>;
export type Tracks = Readonly<Record<Joint, Spring>>;

// Spring stiffness (w squared): ~0.04 s, ~0.1 s and ~0.4 s to settle.
const STIFFNESS: Readonly<Record<Feel, number>> = { stepped: 1600, mixed: 400, soft: 120 };
// The spine and pelvis are heavier than a hand.
const HEAVY = 0.7;
const HEAVY_JOINTS: ReadonlySet<Joint> = new Set(['waist', 'bend', 'hipX', 'crouch']);
const REST = 0.002;

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

export function startTracks(from: Joints): Tracks {
  return Object.fromEntries(JOINTS.map((key) => [key, { value: finite(from[key]), velocity: 0 }])) as Tracks;
}

/** One drawing of follow-through: every joint moves toward its target. No input is mutated. */
export function followPose(tracks: Tracks, target: Joints, dt: number, feel: Feel): Tracks {
  const step = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
  return Object.fromEntries(JOINTS.map((key) => {
    const k = STIFFNESS[feel] * (HEAVY_JOINTS.has(key) ? HEAVY : 1);
    return [key, spring(tracks[key], finite(target[key]), step, k)];
  })) as Tracks;
}

export function valuesOf(tracks: Tracks): Joints {
  return Object.fromEntries(JOINTS.map((key) => [key, tracks[key].value])) as Joints;
}

/** True when nothing is still moving, so the frame rate can drop back down. */
export function settled(tracks: Tracks, target: Joints): boolean {
  return JOINTS.every((key) => Math.abs(tracks[key].value - finite(target[key])) < REST && Math.abs(tracks[key].velocity) < REST * 5);
}
