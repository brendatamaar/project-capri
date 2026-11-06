import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const knownNames = new Set(JSON.parse(readFileSync(new URL('./prohibited-assets.json', import.meta.url), 'utf8')));

export function prohibitedPath(file) {
  const value = file.replaceAll('\\', '/').toLowerCase();
  return knownNames.has(path.posix.basename(value))
    || /(^|\/)(assets\/capri|art\/private|reference|cutouts|tools)(\/|$)/.test(value)
    || /(^|\/)docs\/.*\.(png|jpe?g|webp|gif|svg)$/i.test(value)
    || /(^|\/)(model\.json|capri[^/]*\.(png|jpe?g|webp|gif|ico)|frame[-_]?\d+\.(png|jpe?g|webp)|cut[-_]?in[^/]*\.(png|jpe?g|webp))$/.test(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Include ignored files if they are tracked, plus untracked publishable files.
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const bad = files.filter(prohibitedPath);
  if (bad.length) { console.error('Prohibited asset paths:\n' + bad.join('\n')); process.exitCode = 1; }
  else console.log(`Repository asset guard passed (${files.length} tracked/untracked paths).`);
}
