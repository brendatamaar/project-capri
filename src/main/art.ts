import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { isArtPath } from '../core/art-policy';
import { EXPRESSION_NAMES, POSE_NAMES, PROP_NAMES, VIEW_NAMES, type ArtDescriptor, type ArtSource } from '../shared/art';

const imagePath = z.string().refine(isArtPath, 'Expected a safe, relative raster image path');
const assets = z.record(z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/), imagePath)
  .refine(value => Object.keys(value).length <= 32).default({});
// Unlike the open maps above, a prop key names a fixed slot in the atlas.
const props = z.record(z.string().refine(key => (PROP_NAMES as readonly string[]).includes(key), 'Unknown prop name'), imagePath).default({});
// A rotation view reuses the front sprite's rig and arm, so it must match its exact grid.
const views = z.record(z.string().refine(key => (VIEW_NAMES as readonly string[]).includes(key), 'Unknown view name'), imagePath).default({});
const poses = z.record(z.string().refine(key => (POSE_NAMES as readonly string[]).includes(key), 'Unknown pose name'), imagePath).default({});
// Her face on the body sprite. Like props, each key names a fixed slot.
const expressions = z.record(z.string().refine(key => (EXPRESSION_NAMES as readonly string[]).includes(key), 'Unknown expression name'), imagePath).default({});
const schema = z.object({
  name: z.string().trim().min(1).max(80), version: z.literal(1), rig: z.literal('mochi-v1'),
  // The required sprite uses Electron's portable native PNG/JPEG decoder.
  sprite: imagePath.refine(value => /\.(png|jpe?g)$/i.test(value)), faces: assets, cutins: assets, intro: assets, props, views, poses, expressions,
  faceAnchor: z.object({ x: z.number().min(0).max(240), y: z.number().min(0).max(420), width: z.number().positive().max(120), height: z.number().positive().max(120), background: z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#1a3139') }).strict()
    .refine(anchor => anchor.x+anchor.width<=240 && anchor.y+anchor.height<=420).optional(),
}).strict();

export const parseArtManifest = (value: unknown) => schema.parse(value);
type ImageSize = (bytes: Buffer) => { width: number; height: number } | null;
export interface LoadedArtPack {
  readonly descriptor: ArtDescriptor;
  readonly root: string;
  readonly files: ReadonlySet<string>;
}
const MAX_IMAGE = 10 * 1024 * 1024;

// Resolve symlinks/junctions before checking containment, on load and on every request.
async function readWithin(root: string, relative: string, limit: number): Promise<Buffer> {
  const target = await realpath(path.join(root, relative));
  const rel = path.relative(root, target);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error('Outside art pack');
  const info = await stat(target);
  if (!info.isFile() || info.size > limit) throw new Error('Invalid art file');
  const bytes = await readFile(target);
  if (bytes.length > limit) throw new Error('Art file too large');
  return bytes;
}

/** Startup-only selection; private failures fall through, placeholder failure is fatal. */
export async function loadArtPack(roots: Record<ArtSource, string>, imageSize: ImageSize, preference: ArtSource|'auto'='auto'): Promise<LoadedArtPack> {
  const order: readonly ArtSource[]=preference==='auto'?['installed','development','placeholder']:preference==='placeholder'?['placeholder']:[preference,'placeholder'];
  for (const source of order) {
    try {
      const root = await realpath(roots[source]);
      const manifest = parseArtManifest(JSON.parse((await readWithin(root, 'manifest.json', 16384)).toString('utf8')));
      const sprite = await readWithin(root, manifest.sprite, MAX_IMAGE);
      const dimensions = imageSize(sprite);
      if (dimensions?.width !== 240 || dimensions.height !== 420) continue;
      const files = new Set([manifest.sprite]);
      const optional = async (map: Record<string, string>) => {
        const entries: [string, string][] = [];
        for (const [key, relative] of Object.entries(map)) {
          try {
            const bytes = await readWithin(root, relative, MAX_IMAGE);
            // NativeImage guarantees PNG/JPEG, while Chromium decodes optional WebP.
            // Validate its container here; loadArtImages omits browser decode failures.
            const webp = /\.webp$/i.test(relative) && bytes.length >= 20
              && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
            if (!webp && !imageSize(bytes)) continue;
            files.add(relative);
            entries.push([key, `art://pack/${relative}`]);
          } catch { /* Optional missing, corrupt, or escaping asset: omit this effect. */ }
        }
        return Object.fromEntries(entries);
      };
      // Rotation views share the front sprite's deformation grid, so a view that is not
      // exactly 240x420 is omitted and the renderer falls back toward the front sprite.
      const fittedViews = async (map: Record<string, string>) => {
        const entries: [string, string][] = [];
        for (const [key, relative] of Object.entries(map)) {
          try {
            const bytes = await readWithin(root, relative, MAX_IMAGE);
            const dimensions = imageSize(bytes);
            if (!dimensions || dimensions.width !== 240 || dimensions.height !== 420) continue;
            files.add(relative);
            entries.push([key, `art://pack/${relative}`]);
          } catch { /* Missing, corrupt, or escaping view: fall back without it. */ }
        }
        return Object.fromEntries(entries);
      };
      // Expressions are drawn over the faceAnchor, and every other one falls back to neutral:
      // without both there is nothing to show, and the face stays as drawn on the sprite.
      const faces = manifest.faceAnchor ? await optional(manifest.expressions) : {};
      return { root, files, descriptor: {
        name: manifest.name, version: 1, rig: 'mochi-v1', source,
        sprite: `art://pack/${manifest.sprite}`,
        faces: await optional(manifest.faces), cutins: await optional(manifest.cutins), intro: await optional(manifest.intro), props: await optional(manifest.props),
        views: await fittedViews(manifest.views),
        poses: await fittedViews(manifest.poses),
        expressions: 'neutral' in faces ? faces : {},
        ...(manifest.faceAnchor ? { faceAnchor: manifest.faceAnchor } : {}),
      } };
    } catch { /* Invalid candidate: try the next source without logging private paths. */ }
  }
  throw new Error('No usable art pack: the bundled placeholder must contain a valid 240x420 sprite');
}

/** Only the active pack's declared, validated images can be served. No filesystem URLs leave main. */
export async function serveArt(pack: LoadedArtPack, requestUrl: string): Promise<Response> {
  let relative: string;
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== 'art:' || url.host !== 'pack' || url.username || url.password || url.search || url.hash) return new Response(null, { status: 400 });
    // Require canonical paths: URL normalization must not silently erase traversal segments.
    if (url.href !== requestUrl) return new Response(null, { status: 400 });
    relative = url.pathname.slice(1);
    if (relative === 'manifest.json') return Response.json(pack.descriptor, { headers: { 'Cache-Control': 'no-store' } });
    if (!isArtPath(relative)) return new Response(null, { status: 400 });
  } catch { return new Response(null, { status: 400 }); }
  if (!pack.files.has(relative)) return new Response(null, { status: 404 });
  try {
    const bytes = await readWithin(pack.root, relative, MAX_IMAGE);
    const ext = path.extname(relative).toLowerCase();
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
    } });
  } catch { return new Response(null, { status: 404 }); }
}
