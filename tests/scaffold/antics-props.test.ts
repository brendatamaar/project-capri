import { expect, test } from 'vitest';
import { buildAtlas, burstLabel, CELL_SIZE, DRAW, errorCard } from '../../src/renderer/overlay/antics/props';
import { PROP_NAMES } from '../../src/shared/art';

// A canvas that records what the code under test paints, with every other 2D call a no-op.
function fakeDocument() {
  const calls = { images: [] as unknown[][], fills: [] as string[], text: [] as string[] };
  const context: Record<string | symbol, unknown> = { fillStyle: '' };
  const proxy: CanvasRenderingContext2D = new Proxy(context, {
    get(target, key) {
      if (key === 'drawImage') return (...args: unknown[]) => calls.images.push(args);
      if (key === 'fill') return () => calls.fills.push(String(target.fillStyle));
      if (key === 'fillText') return (text: string) => calls.text.push(text);
      if (key === 'measureText') return () => ({ width: 100 });
      return key in target ? target[key] : () => undefined;
    },
    set(target, key, value) { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const doc = { createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) } as unknown as Document;
  return { doc, calls };
}
const packImage = (naturalWidth: number, naturalHeight: number) => ({ naturalWidth, naturalHeight }) as HTMLImageElement;

test('the manifest keys and the atlas slots are the same names', () => {
  expect(Object.keys(DRAW).sort()).toEqual([...PROP_NAMES].sort());
});
test('a pack without props keeps every code-drawn cell', () => {
  const { doc, calls } = fakeDocument();
  const atlas = buildAtlas(doc);
  expect(calls.images).toEqual([]);
  expect(atlas.packed.size).toBe(0);
  expect(Object.keys(atlas.index)).toEqual(Object.keys(DRAW));
  expect(atlas.canvas.width).toBe(Object.keys(DRAW).length * CELL_SIZE);
});
test('a pack image lands in its own cell and the rest stay code-drawn', () => {
  const { doc, calls } = fakeDocument(), image = packImage(256, 256);
  const atlas = buildAtlas(doc, { star: image });
  expect(calls.images).toEqual([[image, atlas.index.star * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE]]);
  expect([...atlas.packed]).toEqual(['star']);
});
test('a non-square pack image is fitted, not stretched', () => {
  const { doc, calls } = fakeDocument(), image = packImage(512, 256);
  const atlas = buildAtlas(doc, { heart: image });
  expect(calls.images).toEqual([[image, atlas.index.heart * CELL_SIZE, 64, CELL_SIZE, 128]]);
});
test('an image that never decoded falls back to the code-drawn prop', () => {
  const { doc, calls } = fakeDocument();
  buildAtlas(doc, { star: packImage(0, 0) });
  expect(calls.images).toEqual([]);
});
test('word bursts are uppercase and use only the shard palette', () => {
  const { doc, calls } = fakeDocument();
  burstLabel('deal with it', doc);
  expect(calls.text).toEqual(['DEAL WITH IT']);
  expect(new Set(calls.fills)).toEqual(new Set(['#7854f0', '#0a0710', '#ff0046']));
});
test('the error card keeps its joke text and uses only the shard palette', () => {
  const { doc, calls } = fakeDocument();
  errorCard(doc);
  expect(calls.text).toEqual(['capri.exe', 'has stopped caring.', 'Nothing happened. She is being dramatic.']);
  expect(new Set(calls.fills)).toEqual(new Set(['#7854f0', '#0a0710', '#ff0046']));
});
