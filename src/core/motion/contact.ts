// Floor-contact geometry for lying poses: which sprite pixels count as body.
// Pure. Keep the axis and radius in step with the SPRITE landmarks in
// src/renderer/js/sprite.js and MID in src/renderer/js/capri.js.
export const BODY_AXIS = { ax: 118, ay: 105, bx: 128, by: 418 } as const;
// Below the shoulders the legs and kicked feet need room; up top only the
// head, neck and shoulders count, so mane strands draped beside them are out.
const LOWER_Y = 200, LOWER_RADIUS = 45, UPPER_RADIUS = 28;

export type HullPoint = readonly [number, number];

/** True when a sprite pixel belongs to the lying body: head, neck, shoulders,
 *  torso, legs. The mane cloud and the outstretched rest arm are hair and
 *  reach, not floor contact, so they never prop her up when she lies down. */
export function isBodyContact(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const { ax, ay, bx, by } = BODY_AXIS;
  const radius = y >= LOWER_Y ? LOWER_RADIUS : UPPER_RADIUS;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= radius;
}

/** Convex hull of opaque pixels around (midX, midY), in sprite px, for
 *  placement: how far she reaches in any direction once she's turned.
 *  `keep` filters pixels first (body contact drops mane and rest arm); an
 *  empty filter falls back to the full outline so placement never goes
 *  unbounded. */
export function buildHull(alpha: Uint8ClampedArray | Uint8Array, width: number, height: number, midX: number, midY: number, keep: (x: number, y: number) => boolean = () => true): HullPoint[] {
  const scan = (allow: (x: number, y: number) => boolean) => {
    const pts: Array<[number, number]> = [];
    for (let y = 0; y < height; y += 3) {
      let a = -1, b = -1;
      for (let x = 0; x < width; x++) {
        if (alpha[(y * width + x) * 4 + 3] > 40 && allow(x, y)) {
          if (a < 0) a = x;
          b = x;
        }
      }
      if (a >= 0) pts.push([a - midX, y - midY], [b - midX, y - midY]);
    }
    return pts;
  };
  let pts = scan(keep);
  if (!pts.length) pts = scan(() => true);
  // Andrew's monotone chain
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: [number, number], p: [number, number], q: [number, number]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const half = (list: Array<[number, number]>) => {
    const out: Array<[number, number]> = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half([...pts].reverse())];
}

/** Outline of the lying body only: head, torso and legs around the head-feet
 *  axis. Lying placement rests on this, so the mane never holds her floating
 *  above the floor. */
export function buildBodyHull(alpha: Uint8ClampedArray | Uint8Array, width: number, height: number, midX: number, midY: number): HullPoint[] {
  return buildHull(alpha, width, height, midX, midY, isBodyContact);
}
