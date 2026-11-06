import { expect, test } from 'vitest';
// @ts-expect-error Repository tooling remains JavaScript.
import { prohibitedPath } from '../../scripts/check-repository.mjs';
test.each(['assets/capri/sprite.png', 'docs/frame.png', 'reference/cutouts/body.svg', 'model.json', 'art/private/sprite.png', 'CAPRI-face.webp', 'tools/output.png', 'docs\\cutin.jpg', 'renamed-folder/intro-grab.webp', 'public/face-smug.png', 'public/face_infobox.png'])('rejects prohibited path %s', file => {
  expect(prohibitedPath(file)).toBe(true);
});
test.each(['src/renderer/js/capri.js', 'art/placeholder/sprite.png', 'docs/PRD.md', 'licenses/TheAgencyMGE-MIT.txt'])('allows code and original art path %s', file => {
  expect(prohibitedPath(file)).toBe(false);
});
