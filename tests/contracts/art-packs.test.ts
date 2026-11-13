import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { mkdtemp, mkdir, writeFile, rm, symlink, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArtManifest, loadArtPack, serveArt } from '../../src/main/art';
import { isArtPath } from '../../src/core/art-policy';
import { EXPRESSION_NAMES, PROP_NAMES, VIEW_NAMES } from '../../src/shared/art';

const manifest = { name: 'Test construct', version: 1, rig: 'mochi-v1', sprite: 'sprite.png' };
const image = Buffer.from('original test image');
const size = (bytes: Buffer) => bytes.equals(image) ? { width: 240, height: 420 } : null;
let base: string;
let roots: { installed: string; development: string; placeholder: string };
async function pack(root: string, extra = {}) {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ ...manifest, ...extra }));
  await writeFile(path.join(root, 'sprite.png'), image);
}
beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'capri-art-contract-'));
  roots = { installed: path.join(base, 'installed'), development: path.join(base, 'development'), placeholder: path.join(base, 'placeholder') };
  await pack(roots.placeholder);
});
afterEach(async () => { await rm(base, { recursive: true, force: true }); });

describe('ArtPacks', () => {
  test('falls back to the placeholder with no private folders', async () => {
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
  });
  test('development pack loads, installed takes precedence', async () => {
    await pack(roots.development, { name: 'Development' });
    expect((await loadArtPack(roots, size)).descriptor.name).toBe('Development');
    await pack(roots.installed, { name: 'Installed' });
    expect((await loadArtPack(roots, size)).descriptor.name).toBe('Installed');
  });
  test('explicit source selection falls back only to the placeholder',async()=>{
    await pack(roots.installed);await pack(roots.development);
    expect((await loadArtPack(roots,size,'placeholder')).descriptor.source).toBe('placeholder');
    expect((await loadArtPack(roots,size,'development')).descriptor.source).toBe('development');
    await writeFile(path.join(roots.installed,'manifest.json'),'{}');
    expect((await loadArtPack(roots,size,'installed')).descriptor.source).toBe('placeholder');
  });
  test('unusable private packs fall through', async () => {
    await pack(roots.installed, { sprite: '../outside.png' });
    await pack(roots.development);
    await writeFile(path.join(roots.development, 'sprite.png'), 'corrupt');
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
  });
  test('wrong sprite dimensions fall through', async () => {
    await expect(loadArtPack(roots, () => ({ width: 1, height: 1 }))).rejects.toThrow('No usable art pack');
  });
  test('missing and corrupt optional assets are omitted', async () => {
    await pack(roots.development, { faces: { calm: 'missing.png', wide: 'bad.png', grin: 'sprite.png' }, cutins: {}, intro: {} });
    await writeFile(path.join(roots.development, 'bad.png'), 'corrupt');
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.faces).toEqual({ grin: 'art://pack/sprite.png' });
    expect(loaded.descriptor.cutins).toEqual({});
    expect(loaded.descriptor.intro).toEqual({});
  });
  test('rotation views are served when fitted, and a pack without them has none', async () => {
    expect((await loadArtPack(roots, size)).descriptor.views).toEqual({});
    await mkdir(path.join(roots.development, 'views'), { recursive: true });
    await pack(roots.development, { views: { side: 'views/side.png', back: 'views/back.png' } });
    await writeFile(path.join(roots.development, 'views/side.png'), image);
    await writeFile(path.join(roots.development, 'views/back.png'), image);
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.views).toEqual({ side: 'art://pack/views/side.png', back: 'art://pack/views/back.png' });
    const response = await serveArt(loaded, 'art://pack/views/side.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });
  test('missing, corrupt, and mis-sized views fall back without losing the pack', async () => {
    const short = Buffer.from('a view that is not the full grid');
    const sized = (bytes: Buffer) => bytes.equals(image) ? { width: 240, height: 420 } : bytes.equals(short) ? { width: 120, height: 210 } : null;
    await pack(roots.development, { name: 'Partial', views: { side: 'missing.png', quarter: 'bad.png', back: 'short.png' } });
    await writeFile(path.join(roots.development, 'bad.png'), 'corrupt');
    await writeFile(path.join(roots.development, 'short.png'), short);
    const loaded = await loadArtPack(roots, sized);
    expect(loaded.descriptor.name).toBe('Partial');
    expect(loaded.descriptor.views).toEqual({});
  });
  test('lounge poses are served when fitted, mis-sized ones are omitted, unknown keys fall through', async () => {
    expect((await loadArtPack(roots, size)).descriptor.poses).toEqual({});
    await mkdir(path.join(roots.development, 'poses'), { recursive: true });
    await pack(roots.development, { poses: { loungeCoiled: 'poses/coiled.png', loungeSprawl: 'poses/sprawl.png' } });
    await writeFile(path.join(roots.development, 'poses/coiled.png'), image);
    await writeFile(path.join(roots.development, 'poses/sprawl.png'), image);
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.poses).toEqual({ loungeCoiled: 'art://pack/poses/coiled.png', loungeSprawl: 'art://pack/poses/sprawl.png' });
    expect((await serveArt(loaded, 'art://pack/poses/coiled.png')).status).toBe(200);
    const short = Buffer.from('a pose that is not the full grid');
    const sized = (bytes: Buffer) => bytes.equals(image) ? { width: 240, height: 420 } : bytes.equals(short) ? { width: 120, height: 210 } : null;
    await pack(roots.development, { name: 'Partial', poses: { loungeCoiled: 'short.png', loungeSprawl: 'missing.png' } });
    await writeFile(path.join(roots.development, 'short.png'), short);
    const partial = await loadArtPack(roots, sized);
    expect(partial.descriptor.name).toBe('Partial');
    expect(partial.descriptor.poses).toEqual({});
    await pack(roots.development, { poses: { loungeSideways: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
  });
  test('a pack with an unknown view key falls through', async () => {
    await pack(roots.development, { views: { left: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
  });
  test('expressions need a faceAnchor and a neutral face, and only known names are accepted', async () => {
    const anchor = { x: 96, y: 122, width: 40, height: 34 };
    expect((await loadArtPack(roots, size)).descriptor.expressions).toEqual({});
    await pack(roots.development, { faceAnchor: anchor, expressions: { neutral: 'sprite.png', joy: 'sprite.png', wink: 'missing.png' } });
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.expressions).toEqual({ neutral: 'art://pack/sprite.png', joy: 'art://pack/sprite.png' });
    // no anchor: nowhere to draw them
    await pack(roots.development, { expressions: { neutral: 'sprite.png', joy: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor).toMatchObject({ source: 'development', expressions: {} });
    // no neutral: nothing for the others to fall back to
    await pack(roots.development, { faceAnchor: anchor, expressions: { joy: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor).toMatchObject({ source: 'development', expressions: {} });
    // an unknown name rejects the manifest, like props and views
    await pack(roots.development, { faceAnchor: anchor, expressions: { neutral: 'sprite.png', angry: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
    for (const name of EXPRESSION_NAMES) expect(() => parseArtManifest({ ...manifest, expressions: { [name]: 'a.png' } })).not.toThrow();
  });
  test('a valid props map is served, and a pack without one has none', async () => {
    expect((await loadArtPack(roots, size)).descriptor.props).toEqual({});
    await mkdir(path.join(roots.development, 'props'), { recursive: true });
    await pack(roots.development, { props: { boombox: 'props/boombox.png', star: 'props/star.png' } });
    await writeFile(path.join(roots.development, 'props/boombox.png'), image);
    await writeFile(path.join(roots.development, 'props/star.png'), image);
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.props).toEqual({ boombox: 'art://pack/props/boombox.png', star: 'art://pack/props/star.png' });
    const response = await serveArt(loaded, 'art://pack/props/star.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });
  test('missing and corrupt props are omitted without losing the pack', async () => {
    await pack(roots.development, { name: 'Partial', props: { star: 'missing.png', heart: 'bad.png', note: 'sprite.png' } });
    await writeFile(path.join(roots.development, 'bad.png'), 'corrupt');
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.name).toBe('Partial');
    expect(loaded.descriptor.props).toEqual({ note: 'art://pack/sprite.png' });
  });
  test('an oversized prop is omitted', async () => {
    await pack(roots.development, { props: { star: 'huge.png' } });
    await writeFile(path.join(roots.development, 'huge.png'), Buffer.alloc(10 * 1024 * 1024 + 1));
    expect((await loadArtPack(roots, () => ({ width: 240, height: 420 }))).descriptor.props).toEqual({});
  });
  test('a prop reached through a junction is omitted', async () => {
    const outside = path.join(base, 'outside');
    await pack(outside);
    await pack(roots.development, { props: { star: 'escape/sprite.png' } });
    await symlink(outside, path.join(roots.development, 'escape'), 'junction');
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.source).toBe('development');
    expect(loaded.descriptor.props).toEqual({});
    expect((await serveArt(loaded, 'art://pack/escape/sprite.png')).status).toBe(404);
  });
  test('a pack with an unknown prop key falls through', async () => {
    await pack(roots.development, { props: { trombone: 'sprite.png' } });
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
  });
  test('optional WebP containers reach the browser decoder', async () => {
    await pack(roots.placeholder, { intro: { grab: 'grab.webp' } });
    const webp = Buffer.alloc(20);
    webp.write('RIFF'); webp.write('WEBP', 8);
    await writeFile(path.join(roots.placeholder, 'grab.webp'), webp);
    const loaded = await loadArtPack(roots, size);
    expect(loaded.descriptor.intro.grab).toBe('art://pack/grab.webp');
    expect((await serveArt(loaded, loaded.descriptor.intro.grab)).headers.get('Content-Type')).toBe('image/webp');
  });
  test('serves only validated assets and a descriptor without local paths', async () => {
    const loaded = await loadArtPack(roots, size);
    const response = await serveArt(loaded, 'art://pack/sprite.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(image);
    const info = await (await serveArt(loaded, 'art://pack/manifest.json')).text();
    expect(info).not.toContain(base.replaceAll('\\', '\\\\'));
    expect(JSON.parse(info).sprite).toBe('art://pack/sprite.png');
    expect((await serveArt(loaded, 'art://pack/not-declared.png')).status).toBe(404);
  });
  test.each(['art://elsewhere/sprite.png', 'art://pack/%2e%2e%2fsecret.png', 'art://pack/%252e%252e/secret.png', 'art://pack/%5csecret.png', 'art://pack/sprite.png?secret', 'art://user@pack/sprite.png', 'https://pack/sprite.png'])('rejects protocol request %s', async url => {
    expect((await serveArt(await loadArtPack(roots, size), url)).status).toBe(400);
  });
  test('rejects symlink escapes both at load and after selection', async () => {
    await pack(roots.development);
    const outside = path.join(base, 'outside');
    await pack(outside);
    // Directory junctions work without Windows developer mode/admin privileges.
    await symlink(outside, path.join(roots.development, 'escape'), 'junction');
    await pack(roots.development, { sprite: 'escape/sprite.png' });
    expect((await loadArtPack(roots, size)).descriptor.source).toBe('placeholder');
    const loaded = await loadArtPack(roots, size);
    await rm(path.join(roots.placeholder, 'sprite.png'));
    expect((await serveArt(loaded, 'art://pack/sprite.png')).status).toBe(404);
  });
  test('oversized manifest is rejected', async () => {
    await writeFile(path.join(roots.placeholder, 'manifest.json'), ' '.repeat(17000));
    await expect(loadArtPack(roots, size)).rejects.toThrow('No usable art pack');
  });
  test('rechecks containment when an allowed asset directory becomes a junction', async () => {
    await mkdir(path.join(roots.placeholder, 'images'));
    await writeFile(path.join(roots.placeholder, 'images/sprite.png'), image);
    await pack(roots.placeholder, { sprite: 'images/sprite.png' });
    const loaded = await loadArtPack(roots, size);
    const outside = path.join(base, 'outside');
    await pack(outside);
    await rename(path.join(roots.placeholder, 'images'), path.join(roots.placeholder, 'original-images'));
    await symlink(outside, path.join(roots.placeholder, 'images'), 'junction');
    expect((await serveArt(loaded, loaded.descriptor.sprite)).status).toBe(404);
  });
});

describe('parseArtManifest boundary', () => {
  test('defaults optional maps and rejects unsupported versions/rigs', () => {
    expect(parseArtManifest(manifest).faces).toEqual({});
    expect(() => parseArtManifest({ ...manifest, version: 2 })).toThrow();
    expect(() => parseArtManifest({ ...manifest, rig: 'other' })).toThrow();
    expect(() => parseArtManifest({ ...manifest, extra: 'unknown' })).toThrow();
  });
  test('face anchors must fit within the sprite and contain no executable styling',()=>{
    expect(parseArtManifest({...manifest,faceAnchor:{x:90,y:90,width:40,height:30}}).faceAnchor?.background).toBe('#1a3139');
    expect(()=>parseArtManifest({...manifest,faceAnchor:{x:230,y:90,width:40,height:30}})).toThrow();
    expect(()=>parseArtManifest({...manifest,faceAnchor:{x:90,y:90,width:40,height:30,background:'url(https://bad)'}})).toThrow();
  });
  test.each(['../secret.png', '/absolute.png', 'C:/secret.png', '\\\\server\\x.png', 'nested/../sprite.png', 'nested\\sprite.png', '%2e%2e/secret.png', 'https://example.com/x.png', 'sprite.svg', 'sprite.png:stream', 'sprite.png\0', './sprite.png', 'CON.png', 'a//b.png'])('rejects unsafe image path %s', sprite => {
    expect(() => parseArtManifest({ ...manifest, sprite })).toThrow();
  });
  test('rejects traversal in optional assets too', () => {
    expect(() => parseArtManifest({ ...manifest, faces: { grin: '../x.png' } })).toThrow();
    expect(() => parseArtManifest({ ...manifest, intro: { grab: 'https://example.com/x.png' } })).toThrow();
  });
  test('props accepts each known name and defaults to empty', () => {
    expect(parseArtManifest(manifest).props).toEqual({});
    const props = Object.fromEntries(PROP_NAMES.map(name => [name, `props/${name}.png`]));
    expect(parseArtManifest({ ...manifest, props }).props).toEqual(props);
  });
  test('views accepts each known rotation and defaults to empty', () => {
    expect(parseArtManifest(manifest).views).toEqual({});
    const views = Object.fromEntries(VIEW_NAMES.map(name => [name, `views/${name}.png`]));
    expect(parseArtManifest({ ...manifest, views }).views).toEqual(views);
  });
  test.each(['left', 'front', 'Side', 'side ', 'constructor', ''])('views rejects unknown key %j', key => {
    expect(() => parseArtManifest({ ...manifest, views: { [key]: 'side.png' } })).toThrow();
  });
  test('views rejects unsafe paths', () => {
    expect(() => parseArtManifest({ ...manifest, views: { side: '../x.png' } })).toThrow();
    expect(() => parseArtManifest({ ...manifest, views: { back: 'https://example.com/x.png' } })).toThrow();
  });
  test.each(['trombone', 'Boombox', 'boombox ', 'constructor', ''])('props rejects unknown key %j', key => {
    expect(() => parseArtManifest({ ...manifest, props: { [key]: 'sprite.png' } })).toThrow();
  });
  test('a __proto__ key never reaches the props map', () => {
    const parsed = parseArtManifest({ ...manifest, props: JSON.parse('{"__proto__":"sprite.png"}') });
    expect(Object.keys(parsed.props)).toEqual([]);
    expect(Object.getPrototypeOf(parsed.props)).toBe(Object.prototype);
  });
  test.each(['../secret.png', '/absolute.png', 'C:/secret.png', '\\\\server\\x.png', 'nested/../sprite.png', 'nested\\sprite.png', '%2e%2e/secret.png', 'https://example.com/x.png', 'prop.svg', 'prop.png:stream', './prop.png', 'CON.png'])('props rejects unsafe path %s', relative => {
    expect(() => parseArtManifest({ ...manifest, props: { star: relative } })).toThrow();
  });
  test('accepted paths stay relative and contain no traversal or Windows metacharacters', () => {
    fc.assert(fc.property(fc.string(), candidate => {
      if (!isArtPath(candidate)) return;
      expect(candidate.split('/').every(segment => segment !== '.' && segment !== '..' && segment.length > 0)).toBe(true);
      expect(path.win32.isAbsolute(candidate)).toBe(false);
      expect(/[\\:%\x00-\x1f]/.test(candidate)).toBe(false);
    }), { numRuns: 1000 });
  });
  test('round trips generated safe manifests', () => {
    const segment = fc.stringMatching(/^[a-z][a-z0-9]{0,12}$/);
    fc.assert(fc.property(segment, segment, (dir, stem) => {
      fc.pre(!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(dir) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem));
      const input = { ...manifest, sprite: `${dir}/${stem}.png`, faces: {}, cutins: {}, intro: {}, props: {}, views: {}, poses: {}, expressions: {} };
      expect(parseArtManifest(JSON.parse(JSON.stringify(input)))).toEqual(input);
    }));
  });
});
