import { expect, test, vi } from 'vitest';
import { loadArtImages } from '../../src/renderer/js/art';
import type { ArtDescriptor } from '../../src/shared/art';
const descriptor: ArtDescriptor = { name: 'Pip', version: 1, rig: 'mochi-v1', source: 'placeholder',
  sprite: 'art://pack/sprite.png', faces: {}, cutins: {}, intro: {}, props: {}, views: {}, poses: {}, expressions: {} };
const image = { src: descriptor.sprite } as HTMLImageElement;
test('no optional assets produces empty maps and disables intro', async () => {
  const loader = vi.fn(async () => image);
  expect(await loadArtImages(descriptor, loader)).toEqual({ image, faces: {}, cutins: {}, intro: null, props: {}, views: {}, poses: {}, expressions: {} });
  expect(loader).toHaveBeenCalledTimes(1);
});
test('optional browser decode failures disable only their assets', async () => {
  const result = await loadArtImages({ ...descriptor, faces: { grin: 'broken' }, cutins: { grin: 'broken' }, intro: { grab: 'broken', wave1: 'ok' }, props: { star: 'broken', heart: 'ok' }, views: { side: 'broken', back: 'ok' }, expressions: { neutral: 'ok', joy: 'broken' } }, async url => {
    if (url === 'broken') throw new Error('Decode failure');
    return image;
  });
  expect(result).toEqual({ image, faces: {}, cutins: {}, intro: null, props: { heart: image }, views: { back: image }, poses: {}, expressions: { neutral: image } });
});
test('valid optional frames remain available and required sprite failures surface', async () => {
  const result = await loadArtImages({ ...descriptor, intro: { grab: 'ok' }, faces: { calm: 'ok' }, cutins: { grin: 'ok' }, props: { star: 'ok' }, views: { side: 'ok' } }, async () => image);
  expect(result.intro).toEqual({ grab: image });
  expect(result.faces).toEqual({ calm: image });
  expect(result.cutins).toEqual({ grin: image });
  expect(result.props).toEqual({ star: image });
  expect(result.views).toEqual({ side: image });
  await expect(loadArtImages(descriptor, async () => { throw new Error('Sprite unavailable'); })).rejects.toThrow('Sprite unavailable');
});
