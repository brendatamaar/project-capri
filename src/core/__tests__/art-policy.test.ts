import { expect, test } from 'vitest';
import fc from 'fast-check';
import { isArtPath } from '../art-policy';

test('artPathsCannotEscape: traversal and absolute prefixes are always rejected', () => {
  const name = fc.stringMatching(/^[a-z][a-z0-9_-]{0,20}$/);
  fc.assert(fc.property(name, stem => {
    for (const prefix of ['../', '/', 'C:/', '\\\\server\\', 'nested/../', '%2e%2e/', './']) {
      expect(isArtPath(`${prefix}${stem}.png`)).toBe(false);
    }
  }), { numRuns: 500 });
});
test('pathPolicyIsDeterministic: validation does not depend on call order', () => {
  fc.assert(fc.property(fc.string(), fc.string(), (first, other) => {
    const before = isArtPath(first);
    isArtPath(other);
    expect(isArtPath(first)).toBe(before);
  }));
});
