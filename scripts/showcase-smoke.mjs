// Plays every showcase entry through the real renderer and fails on any step error or GL breakage.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const extra = process.argv.slice(2);
const child = spawn(require('electron'), ['.', '--smoke', '--showcase', ...(process.env.CAPRI_SMOKE_NO_SANDBOX === '1' ? ['--no-sandbox'] : []), ...extra], { env, stdio: ['ignore', 'pipe', 'inherit'] });
let output = '';
child.stdout.on('data', data => { output += data; process.stdout.write(data); });
const timer = setTimeout(() => { child.kill(); console.error('Showcase smoke timed out'); process.exit(1); }, 12 * 60 * 1000);
child.on('exit', code => { clearTimeout(timer); process.exit(code === 0 && output.includes('SHOWCASE_SMOKE_OK') ? 0 : 1); });
