# Local art packs

Load order (first usable pack wins):

1. `%APPDATA%/Capri/art/manifest.json`
2. `art/private/manifest.json` in a development checkout
3. Bundled `art/placeholder/manifest.json`

Restart the app after changing packs. A missing/invalid manifest or required sprite
falls through to the next pack. The preview labels the selected source. It never
prints a private filesystem path. Both private locations stay out of packages;
`art/private/` is ignored by Git. Keep show-derived art private.

M6 adds a tray preference: `auto` retains this load order; selecting a particular
source tries only that source, then the placeholder. `placeholder` bypasses both
private locations. Use the tray's restart action after choosing. The active pack's
name/source remain visible in the tray, so invalid private packs falling back are apparent.

```json
{
  "name": "My local pack",
  "version": 1,
  "rig": "mochi-v1",
  "sprite": "sprite.png",
  "faces": {},
  "cutins": {},
  "intro": {},
  "views": {}
}
```

The required PNG/JPEG sprite must be 240×420 and use the existing rig coordinates:
NECK (118,152), shoulders (98,168) and (136,168), MANE (116,92), HIP y=232,
KNEE y=305, feet near (128,418). PNG is recommended for transparency. See
`src/renderer/js/sprite.js` for the precise deformation regions.

Optional maps contain semantic keys and relative PNG/JPEG/WebP paths:

- `faces`: calm, aside, smug, wide, look, laugh, many, grin.
- `cutins`: grin, laugh, eyes, many, look.
- `intro`: grab, mouth1, mouth2, mouth3, wave1, wave2, wave3, smear, happy.
- `props`: boombox, guitar, cannon, popcorn, coffee, chicken, camera, balloon, shades,
  note, heart, star, puff. Any other key rejects the manifest.

A `props` entry replaces that Antics prop. Use a transparent 256×256 PNG with the
object centered; other sizes are fitted to the cell without stretching. Omitted or
unreadable props keep their built-in code-drawn version, so a pack can replace some
or none of them. Paths, the 10 MiB size limit and file types work as for `cutins`.

A `views` entry (`side`, `quarter`, `back`) shows her turned that way during the
`turn` and `spin` acts; right-side views mirror the left. Each view must be a
transparent 240×420 PNG/JPEG on the same grid as the sprite, with the front arms
kept in the arm zone (see `armL` in `src/renderer/js/sprite.js`): the shader draws
both arms from the front texture, so views omit baked-in arms and carry the front
arms there instead. Omitted or mis-sized views fall back toward the front sprite
(`quarter` falls back to `side`); the placeholder ships code-drawn `side` and
`back`, with `quarter` falling back to `side`.

A `poses` entry (`loungeCoiled`, `loungeSprawl`) is a drawn picture of one lounge
pose on the same transparent 240×420 grid. `loungeCoiled` is drawn upright: perched
on the ledge with her legs hanging, the ledge line near row 294. `loungeSprawl` is
drawn as a 420×240 picture of her lying along the ledge (ledge line near y = 134),
then turned a quarter anticlockwise into the grid (picture `(x, y)` lands on grid
`(y, 420 − x)`); the app turns it back to lay her down. Pose pictures are drawn
flat: no arm zone, joints or mane warp, unlike the sprite and the views, and what
hangs below the ledge line still shows. Supply both or neither — with both, each
lounge shows one of the two, picked at random; omitted or mis-sized poses keep the rig poses.

An `expressions` map gives her a face that changes on the body sprite: she blinks, glances at
the pointer, and shows what she is up to. Keys: neutral, blink, joy, laugh, smug, wink, wide, many,
sleepy, pout, lookLeft, lookRight, talk; any other key rejects the manifest. Each image is a
transparent picture of just her face, drawn over the `faceAnchor` rectangle (so it must cover the
face painted on the sprite), at any resolution with that rectangle's proportions; 8 px per sprite
pixel is plenty. `faceAnchor` and `neutral` are required for any of them to show, and a missing
expression falls back to the nearest one the pack has. They show on the front view only. A pack
with `expressions` does not get the generic face described below.

Omitted or unreadable images in the other maps disable the corresponding effect. The intro
needs `grab`; absent extra cels fall back to it. The current preview displays only
the sprite; portrait/cut-in/intro lookups are prepared for M2. There is no live-face
anchor required for Pip. M4 packs may add `faceAnchor` with numeric `x`, `y`, `width`,
and `height` inside the sprite, plus an optional six-digit hex `background` color.
That rectangle is covered by an original generic blinking, gaze-tracking face.

Paths must stay within the pack, including after resolving symlinks/junctions.
Absolute paths, `..`, backslashes, URL encoding, executable/vector files, and Windows
device/stream names are rejected. Limits: 16 KiB manifest, 32 entries per optional
map, 10 MiB per image. No scripts or remote URLs are loaded from a pack.

To test private loading without any show art, copy the contents of `art/placeholder/`
into an ignored `art/private/` folder and change its manifest name. Remove that test
folder when finished. Do not overwrite an existing private pack. The automated
tests make these copies only in temporary directories outside the checkout.
