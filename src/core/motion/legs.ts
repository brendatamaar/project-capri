// Standing leg solver: where the pelvis goes, the feet stay. Sprite pixels; keep in step with sprite.js.
//
// She is drawn from the front, so a bending knee comes mostly toward the viewer: on screen the thigh
// and shin get shorter (foreshortening) and the knee turns out only a little. Solving the bend
// entirely in the screen plane instead throws both knees far out sideways, like a frog.
type Point = { readonly x: number; readonly y: number };
export const LEGS = {
  left: { hip: { x: 105, y: 240 }, knee: { x: 106, y: 305 }, foot: { x: 107, y: 412 }, outward: -1 },
  right: { hip: { x: 130, y: 240 }, knee: { x: 136, y: 305 }, foot: { x: 133, y: 412 }, outward: 1 },
} as const;
/** Angles in radians, and how long each drawn segment is on screen (1 = as drawn). */
export type LegAngles = {
  readonly thighL: number; readonly kneeL: number; readonly thighR: number; readonly kneeR: number;
  readonly thighScaleL: number; readonly shinScaleL: number; readonly thighScaleR: number; readonly shinScaleR: number;
};
export const NO_BEND: LegAngles = { thighL: 0, kneeL: 0, thighR: 0, kneeR: 0, thighScaleL: 1, shinScaleL: 1, thighScaleR: 1, shinScaleR: 1 };

/** How much of the in-plane knee swing shows sideways; the rest of the bend comes toward the viewer. */
export const KNEE_SPLAY = 0.3;
export const SOFT_KNEE = 10;
const SCALE_RANGE: readonly [number, number] = [0.15, 1.08];

const finite = (value: number) => Number.isFinite(value) ? value : 0;
const minus = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const length = (v: Point) => Math.hypot(v.x, v.y);
const signed = (from: Point, to: Point) => Math.atan2(from.x * to.y - from.y * to.x, from.x * to.x + from.y * to.y);
const soften = (drop: number) => {
  const t = Math.max(0, Math.min(1, drop / SOFT_KNEE));
  return t * t * (3 - 2 * t);
};

// A drawn segment `rest`, squashed along the sprite's y by a scale and then turned, so it spans `target`.
function fit(rest: Point, target: Point) {
  const scale = Math.max(SCALE_RANGE[0], Math.min(SCALE_RANGE[1], Math.sqrt(Math.max(0, target.x * target.x + target.y * target.y - rest.x * rest.x)) / Math.abs(rest.y)));
  return { scale, turn: signed({ x: rest.x, y: rest.y * scale }, target) };
}

function solve(leg: typeof LEGS.left | typeof LEGS.right, crouch: number, hipX: number, splay: number) {
  const hip = { x: leg.hip.x + hipX, y: leg.hip.y + crouch };
  const thigh = length(minus(leg.knee, leg.hip)), shin = length(minus(leg.foot, leg.knee));
  const toFoot = minus(leg.foot, hip), reach = length(toFoot) || 1;
  const ux = toFoot.x / reach, uy = toFoot.y / reach;
  // Where the knee sits along the hip-foot line, and how far off it an in-plane bend would put it.
  const along = (thigh * thigh + reach * reach - shin * shin) / (2 * reach);
  // The drawn knee already sits a few px off that line; the pose grows out of it, so nothing pops at rest.
  const drawn = minus(leg.foot, leg.hip), drawnReach = length(drawn), drawnSide = Math.sign(-drawn.y * leg.outward) || 1;
  const drawnKnee = minus(leg.knee, leg.hip);
  const rest = (drawnKnee.x * -drawn.y + drawnKnee.y * drawn.x) / drawnReach * drawnSide;
  const off = rest + (Math.sqrt(Math.max(0, thigh * thigh - along * along)) - rest) * splay;
  // Knees turn away from her body: the perpendicular that points to this leg's own side.
  const side = Math.sign(-uy * leg.outward) || 1;
  const knee = { x: hip.x + ux * along - uy * side * off, y: hip.y + uy * along + ux * side * off };
  const upper = fit(minus(leg.knee, leg.hip), minus(knee, hip)), lower = fit(minus(leg.foot, leg.knee), minus(leg.foot, knee));
  // In the rig, positive swings a leg away from her body on either side.
  const flip = leg.outward < 0 ? 1 : -1;
  return { thigh: flip * upper.turn, knee: flip * (lower.turn - upper.turn), thighScale: upper.scale, shinScale: lower.scale };
}

/** Thigh and knee angles and segment lengths that keep both feet planted while the pelvis drops by crouch and slides by hipX. */
export function solveLegs(crouch: number, hipX: number): LegAngles {
  const drop = Math.max(-6, Math.min(70, finite(crouch))), slide = Math.max(-30, Math.min(30, finite(hipX)));
  if (!drop && !slide) return NO_BEND;
  // Rest legs are almost straight, so an in-plane bend grows like sqrt(drop): a 0.6 px breathing dip
  // would pop the knees out. The sideways part eases in over the first SOFT_KNEE px; until then the
  // dip is pure foreshortening, which is exact at any size.
  const splay = KNEE_SPLAY * soften(drop);
  const left = solve(LEGS.left, drop, slide, splay), right = solve(LEGS.right, drop, slide, splay);
  return {
    thighL: left.thigh, kneeL: left.knee, thighR: right.thigh, kneeR: right.knee,
    thighScaleL: left.thighScale, shinScaleL: left.shinScale, thighScaleR: right.thighScale, shinScaleR: right.shinScale,
  };
}
