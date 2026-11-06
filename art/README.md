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
  "intro": {}
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

Omitted or unreadable optional images disable the corresponding effect. The intro
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
