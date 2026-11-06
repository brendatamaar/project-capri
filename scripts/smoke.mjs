import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, cp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const electron = require('electron');
const root = await mkdtemp(path.join(tmpdir(), 'capri-art-smoke-'));
async function run(expected, optional = '0-0-0') {
  await new Promise((resolve, reject) => {
    const child = spawn(electron, [...(process.env.CAPRI_SMOKE_NO_SANDBOX==='1'?['--no-sandbox']:[]),...(process.env.CAPRI_SMOKE_SOFTWARE_GL==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]),'.', '--smoke', `--smoke-art-root=${root}`], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; process.stdout.write(data); });
    child.stderr.on('data', data => process.stderr.write(data));
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`Smoke timed out: ${expected}`)); }, 60000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => {
      clearTimeout(timeout);
      if (code === 0 && output.includes(`M1_SMOKE_OK:${expected}:sprite-rendered:optional-${optional}`)) resolve();
      else reject(new Error(`Smoke failed: ${expected}, exit ${code}`));
    });
  });
}
try {
  await run('placeholder');
  await cp('art/placeholder', path.join(root, 'development'), { recursive: true });
  // Declared-but-missing optional assets must not break the native loader or renderer.
  const manifest = { name: 'Smoke fixture', version: 1, rig: 'mochi-v1', sprite: 'sprite.png', faces: { calm: 'missing.png' }, cutins: { grin: 'missing.png' }, intro: { grab: 'missing.webp' } };
  await writeFile(path.join(root, 'development/manifest.json'), JSON.stringify(manifest));
  await run('development');
  await cp('art/placeholder', path.join(root, 'art'), { recursive: true });
  await cp(path.join(root, 'optional.webp'), path.join(root, 'art/optional.webp'));
  await writeFile(path.join(root, 'art/manifest.json'), JSON.stringify({ ...manifest,
    faces: { calm: 'optional.webp' }, cutins: { grin: 'optional.webp' }, intro: { grab: 'optional.webp' } }));
  await run('installed', '1-1-1');
  await writeFile(path.join(root, 'art/manifest.json'), '{}');
  await run('development');
} finally {
  await rm(root, { recursive: true, force: true });
}
