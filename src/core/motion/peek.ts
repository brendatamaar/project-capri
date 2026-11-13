// Where she goes when she shows only part of herself at a screen edge. Pure geometry: screen px
// in, positions of her feet out. Keep the landmarks in step with SPRITE in src/renderer/js/sprite.js.
//
//   head  left, right, top: laid out past the edge, only her head and mane in view
//   half  lean-left, lean-right: upright behind the edge, leaning out from the waist up
//   bust  bottom: risen from behind the floor line, head and shoulders in view

export const PEEK_KINDS = ['left', 'right', 'top', 'bottom', 'lean-left', 'lean-right'] as const;
export type PeekKind = (typeof PEEK_KINDS)[number];
export type PeekSide = 'left' | 'right' | 'top' | 'bottom';
export type PeekStyle = 'head' | 'half' | 'bust';
export interface PeekView { readonly w: number; readonly h: number; readonly floor: number }
type Point = { readonly x: number; readonly y: number };
export interface PeekPlan {
  readonly side: PeekSide;
  readonly style: PeekStyle;
  /** Her feet once she is in view, and where they start from, out of view. */
  readonly at: Point;
  readonly from: Point;
  readonly facing: 1 | -1;
  /** Which way the middle of the screen is: the direction her peek cycle is played toward. */
  readonly dir: 1 | -1;
  /** How far along from -> at each drawing of the way in is. Past 1 is the overshoot. */
  readonly steps: readonly number[];
  /** Nothing of her is drawn below this screen y (the floor line she hides behind), or null. */
  readonly clipBelow: number | null;
}

export const PEEK_SPRITE = { feetX: 128, feetY: 418, axisX: 118, headY: 132, width: 240 } as const;
/** The sprite row that sits on the floor line in a bust peek: just under her shoulders and chest. */
export const BUST_LINE = 222;
/** How far past the edge her middle is in a half peek, sprite px. */
export const HALF_INSET = 4;
const FLOOR_MARGIN = 6;

const unit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5);
const size = (value: number, fallback: number) => (Number.isFinite(value) && value > 0 ? value : fallback);
const between = (a: number, b: number, k: number) => a + (b - a) * k;

const STEPS: Readonly<Record<PeekStyle, readonly number[]>> = {
  head: [0.4, 0.85, 1.06, 1],
  half: [0.35, 0.8, 1.05, 1],
  bust: [0.3, 0.75, 1.1, 0.96, 1],
};

/** `along` picks the spot along the edge and `flip` the way she faces hanging from the top; both 0..1. */
export function peekPlan(kind: PeekKind, view: PeekView, scale: number, along: number, flip: number): PeekPlan {
  const s = size(scale, 0.6), w = size(view.w, 1), h = size(view.h, 1);
  const floor = Number.isFinite(view.floor) ? Math.min(h, Math.max(0, view.floor)) : h;
  const k = unit(along);
  const { feetX, feetY, axisX } = PEEK_SPRITE;
  switch (kind) {
    case 'left':
    case 'right': {
      const left = kind === 'left';
      const y = between(h * 0.3, h * 0.72, k) + 266 * s; // her neck there, the rest of her laid out past the edge
      return {
        side: kind, style: 'head', facing: left ? -1 : 1, dir: left ? 1 : -1, steps: STEPS.head, clipBelow: null,
        at: { x: left ? 30 * s : w - 30 * s, y }, from: { x: left ? -190 * s : w + 190 * s, y },
      };
    }
    case 'top': {
      // hanging upside down from the top edge, only the head and the mane showing
      const x = between(w * 0.2, w * 0.8, k);
      return {
        side: 'top', style: 'head', facing: unit(flip) < 0.5 ? 1 : -1, dir: x > w / 2 ? -1 : 1, steps: STEPS.head, clipBelow: null,
        at: { x, y: -226 * s }, from: { x, y: -470 * s },
      };
    }
    case 'bottom': {
      const x = between(w * 0.15, w * 0.85, k);
      return {
        side: 'bottom', style: 'bust', facing: x > w / 2 ? 1 : -1, dir: x > w / 2 ? -1 : 1, steps: STEPS.bust, clipBelow: floor,
        at: { x, y: floor + (feetY - BUST_LINE) * s }, from: { x, y: floor + (feetY + 60) * s },
      };
    }
    case 'lean-left':
    case 'lean-right': {
      const left = kind === 'lean-left';
      const facing = left ? -1 : 1, inward = left ? 1 : -1, edge = left ? 0 : w;
      // her middle (the sprite's axis) a little inside the edge, so half of her is behind it
      const feet = (axis: number) => axis - (axisX - feetX) * s * facing;
      const y = floor - FLOOR_MARGIN;
      return {
        side: left ? 'left' : 'right', style: 'half', facing, dir: inward, steps: STEPS.half, clipBelow: null,
        at: { x: feet(edge + inward * HALF_INSET * s), y }, from: { x: feet(edge - inward * 170 * s), y },
      };
    }
  }
  const exhaustive: never = kind; return exhaustive;
}
