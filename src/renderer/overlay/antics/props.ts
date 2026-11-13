// Original prop sprites for the antics, baked once into an atlas so nothing is decoded or re-stroked
// per frame. A pack may replace any prop through its `props` map; the code-drawn one is the fallback.
import type { PropName } from '../../../shared/art';

const CELL = 128, SCALE = 2;
const C = { ink: '#14101c', paper: '#fff4f6', red: '#ff2152', green: '#36ff7a', violet: '#7b3dff', blue: '#3d6bff', brass: '#daa84b', teal: '#3fada7', cream: '#ffe9a8', grey: '#8e8aa0' };
type G = CanvasRenderingContext2D;

const shape = (g: G, fill: string, draw: () => void) => { g.beginPath(); draw(); g.fillStyle = fill; g.fill(); g.lineWidth = 4; g.strokeStyle = C.ink; g.lineJoin = 'round'; g.stroke(); };
const rect = (g: G, fill: string, x: number, y: number, w: number, h: number, r = 4) => shape(g, fill, () => g.roundRect(x, y, w, h, r));
const circle = (g: G, fill: string, x: number, y: number, r: number) => shape(g, fill, () => g.arc(x, y, r, 0, Math.PI * 2));
const path = (g: G, fill: string, points: readonly (readonly [number, number])[]) => shape(g, fill, () => { points.forEach(([x, y], index) => index ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); });

export const DRAW: Record<string, (g: G) => void> = {
  boombox(g) {
    rect(g, C.grey, 34, 22, 60, 12, 5); g.clearRect(40, 27, 48, 8);
    rect(g, C.violet, 10, 34, 108, 62, 8); rect(g, C.ink, 54, 42, 20, 16, 2);
    circle(g, C.ink, 32, 68, 19); circle(g, C.teal, 32, 68, 10); circle(g, C.ink, 96, 68, 19); circle(g, C.teal, 96, 68, 10);
    rect(g, C.brass, 56, 78, 16, 8, 2);
  },
  guitar(g) {
    g.save(); g.translate(64, 64); g.rotate(-0.72); g.translate(-64, -64);
    rect(g, C.brass, 58, 2, 12, 24, 3); rect(g, C.grey, 60, 22, 8, 50, 1);
    shape(g, C.red, () => { g.ellipse(64, 86, 28, 34, 0, 0, Math.PI * 2); });
    circle(g, C.ink, 64, 78, 8); rect(g, C.ink, 52, 104, 24, 5, 2);
    g.restore();
  },
  cannon(g) {
    path(g, C.red, [[16, 92], [42, 118], [112, 40], [86, 12]]);
    path(g, C.cream, [[86, 12], [112, 40], [120, 24], [102, 6]]);
    g.strokeStyle = C.paper; g.lineWidth = 7; g.beginPath(); g.moveTo(40, 86); g.lineTo(88, 34); g.stroke();
    circle(g, C.brass, 22, 104, 12);
  },
  popcorn(g) {
    for (const [x, y] of [[44, 30], [68, 22], [90, 32], [34, 44], [58, 40], [82, 46], [100, 46]] as const) circle(g, C.cream, x, y, 13);
    path(g, C.paper, [[26, 50], [102, 50], [90, 122], [38, 122]]);
    g.fillStyle = C.red; for (const x of [46, 70]) g.fillRect(x, 54, 11, 65);
    path(g, 'transparent', [[26, 50], [102, 50], [90, 122], [38, 122]]);
  },
  coffee(g) {
    g.strokeStyle = C.ink; g.lineWidth = 11; g.beginPath(); g.arc(94, 70, 20, -1.3, 1.3); g.stroke();
    g.strokeStyle = C.teal; g.lineWidth = 5; g.beginPath(); g.arc(94, 70, 20, -1.3, 1.3); g.stroke();
    rect(g, C.teal, 26, 40, 72, 80, 10); rect(g, '#5c3a20', 32, 44, 60, 12, 4);
    g.strokeStyle = C.paper; g.lineWidth = 5; for (const x of [44, 62, 80]) { g.beginPath(); g.moveTo(x, 32); g.quadraticCurveTo(x + 8, 22, x, 12); g.stroke(); }
  },
  chicken(g) {
    g.save(); g.translate(64, 64); g.rotate(0.5); g.translate(-64, -64);
    shape(g, C.cream, () => { g.ellipse(64, 80, 19, 42, 0, 0, Math.PI * 2); });
    circle(g, C.cream, 64, 26, 16); path(g, C.red, [[52, 14], [58, 2], [64, 12], [72, 0], [76, 14]]);
    path(g, C.brass, [[76, 24], [96, 30], [76, 34]]); g.fillStyle = C.ink; g.beginPath(); g.arc(68, 24, 3, 0, Math.PI * 2); g.fill();
    g.restore();
  },
  camera(g) {
    rect(g, C.grey, 40, 24, 30, 14, 4); rect(g, C.ink, 12, 36, 104, 70, 10); circle(g, C.teal, 64, 72, 25); circle(g, C.blue, 64, 72, 13); circle(g, C.red, 100, 50, 5);
  },
  balloon(g) {
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 92); g.bezierCurveTo(52, 104, 76, 112, 64, 126); g.stroke();
    shape(g, C.red, () => { g.ellipse(64, 50, 38, 44, 0, 0, Math.PI * 2); });
    path(g, C.red, [[58, 92], [70, 92], [64, 100]]);
    g.fillStyle = C.paper; g.beginPath(); g.ellipse(50, 34, 8, 13, 0.5, 0, Math.PI * 2); g.fill();
  },
  shades(g) {
    g.strokeStyle = C.ink; g.lineWidth = 8; g.beginPath(); g.moveTo(4, 50); g.lineTo(124, 50); g.stroke();
    path(g, C.ink, [[12, 50], [58, 50], [52, 78], [20, 78]]); path(g, C.ink, [[70, 50], [116, 50], [108, 78], [76, 78]]);
    g.strokeStyle = C.paper; g.lineWidth = 3; for (const x of [28, 86]) { g.beginPath(); g.moveTo(x, 58); g.lineTo(x + 14, 58); g.stroke(); }
  },
  note(g) {
    g.fillStyle = C.ink; g.beginPath(); g.ellipse(44, 94, 22, 16, -0.3, 0, Math.PI * 2); g.fill();
    g.fillRect(60, 24, 9, 72); g.fillRect(60, 24, 44, 14);
    g.fillStyle = C.violet; g.beginPath(); g.ellipse(44, 94, 15, 10, -0.3, 0, Math.PI * 2); g.fill(); g.fillRect(62, 26, 5, 66);
  },
  heart(g) { shape(g, C.red, () => { g.moveTo(64, 112); g.bezierCurveTo(4, 70, 18, 16, 64, 42); g.bezierCurveTo(110, 16, 124, 70, 64, 112); }); },
  star(g) {
    path(g, C.green, Array.from({ length: 10 }, (_, index) => {
      const a = -Math.PI / 2 + index * Math.PI / 5, r = index % 2 ? 22 : 54;
      return [64 + Math.cos(a) * r, 64 + Math.sin(a) * r] as const;
    }));
  },
  puff(g) { for (const [x, y, r] of [[46, 74, 28], [80, 70, 30], [62, 48, 26]] as const) circle(g, C.paper, x, y, r); },
};

export interface Atlas { canvas: HTMLCanvasElement; index: Record<string, number>; packed: ReadonlySet<string> }
export type PackProps = Partial<Record<PropName, HTMLImageElement>>;
export const CELL_SIZE = CELL * SCALE;

/** Each cell is the pack's image when it has one, otherwise the code-drawn prop. */
export function buildAtlas(doc: Document = document, props: PackProps = {}): Atlas {
  const names = Object.keys(DRAW), canvas = doc.createElement('canvas');
  canvas.width = names.length * CELL_SIZE; canvas.height = CELL_SIZE;
  const g = canvas.getContext('2d')!;
  const index: Record<string, number> = {}, packed = new Set<string>();
  names.forEach((name, slot) => {
    index[name] = slot;
    const image = props[name as PropName];
    if (image?.naturalWidth && image.naturalHeight) {
      // Fit, never stretch: a pack image need not be square.
      const fit = Math.min(CELL_SIZE / image.naturalWidth, CELL_SIZE / image.naturalHeight), w = image.naturalWidth * fit, h = image.naturalHeight * fit;
      g.drawImage(image, slot * CELL_SIZE + (CELL_SIZE - w) / 2, (CELL_SIZE - h) / 2, w, h);
      packed.add(name);
      return;
    }
    g.save(); g.setTransform(SCALE, 0, 0, SCALE, slot * CELL_SIZE, 0);
    DRAW[name](g);
    g.restore();
  });
  return { canvas, index, packed };
}

const SHARD = { ink: '#0a0710', crimson: '#ff0046', violet: '#7854f0', white: '#ffffff' };
type Point = readonly [number, number];
const fillPoints = (g: G, fill: string, points: readonly Point[]) => {
  g.beginPath(); points.forEach(([x, y], index) => index ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillStyle = fill; g.fill();
};
// A stable pseudo-random value, so a given word always breaks the same way.
const jitter = (seed: number, index: number) => { const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453; return value - Math.floor(value); };
const seedOf = (text: string) => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 9973, 7);
// A broken-edged panel: straight runs and hard points walked around a rectangle.
function shardPanel(left: number, top: number, right: number, bottom: number, reach: number, seed: number) {
  const points: Point[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const steps = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 24));
    for (let index = 0; index < steps; index++) {
      const r = jitter(seed, points.length), t = (index + (r - 0.5) * 0.5) / steps, out = reach * (index % 2 ? -0.35 : 0.45 + 0.55 * r);
      points.push([ax + (bx - ax) * t + nx * out, ay + (by - ay) * t + ny * out]);
    }
  };
  edge(left, top, right, top, 0, -1); edge(right, top, right, bottom, 1, 0); edge(right, bottom, left, bottom, 0, 1); edge(left, bottom, left, top, -1, 0);
  return points;
}
const offset = (points: readonly Point[], dx: number, dy: number) => points.map(([x, y]) => [x + dx, y + dy] as const);
// Slivers knocked off the panel's corners.
function slivers(g: G, w: number, h: number, seed: number) {
  ([[2, 12], [w - 2, 14], [3, h - 14], [w - 3, h - 12]] as const).forEach(([x, y], index) => {
    const size = 5 + jitter(seed, 40 + index) * 5, lean = x < w / 2 ? 1 : -1;
    fillPoints(g, index % 2 ? SHARD.violet : SHARD.crimson, [[x, y], [x + lean * size, y - size * 0.8], [x + lean * size * 0.7, y + size * 0.9]]);
  });
}

// A shard burst with a word on it, pre-rendered so a pop costs one drawImage a frame.
export function burstLabel(word: string, doc: Document = document) {
  const text = word.toUpperCase(), size = 40, font = `${size}px Impact, Haettenschweiler, "Arial Narrow", sans-serif`;
  const probe = doc.createElement('canvas').getContext('2d')!; probe.font = font;
  const textW = Math.ceil(probe.measureText(text).width), w = textW + 64, h = 92, seed = seedOf(text);
  const canvas = doc.createElement('canvas'); canvas.width = w * SCALE; canvas.height = h * SCALE;
  const g = canvas.getContext('2d')!; g.scale(SCALE, SCALE);
  const body = shardPanel(14, 14, w - 18, h - 18, 10, seed);
  fillPoints(g, SHARD.violet, offset(body, 5, 6)); fillPoints(g, SHARD.ink, body);
  fillPoints(g, SHARD.crimson, shardPanel(22, 22, w - 26, h - 26, 5, seed + 1));
  slivers(g, w, h, seed);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SHARD.ink; g.fillText(text, w / 2 - 2, h / 2 - 1);
  return { canvas, w, h };
}

// A little joke error card; deliberately styled as hers, not as any real system dialog.
export function errorCard(doc: Document = document) {
  const w = 300, h = 118, seed = seedOf('capri.exe'), canvas = doc.createElement('canvas'); canvas.width = w * SCALE; canvas.height = h * SCALE;
  const g = canvas.getContext('2d')!; g.scale(SCALE, SCALE);
  const body = shardPanel(14, 14, w - 18, h - 18, 9, seed);
  fillPoints(g, SHARD.violet, offset(body, 5, 6)); fillPoints(g, SHARD.ink, body);
  fillPoints(g, SHARD.crimson, [[20, 17], [122, 13], [110, 38], [26, 41]]);
  slivers(g, w, h, seed);
  g.textBaseline = 'middle';
  g.fillStyle = SHARD.ink; g.font = '18px Impact, Haettenschweiler, "Arial Narrow", sans-serif'; g.fillText('capri.exe', 32, 28);
  g.fillStyle = SHARD.crimson; g.font = '700 16px "Segoe UI", sans-serif'; g.fillText('has stopped caring.', 28, 62);
  g.fillStyle = SHARD.white; g.font = '12px "Segoe UI", sans-serif'; g.fillText('Nothing happened. She is being dramatic.', 28, 85);
  return { canvas, w, h };
}
