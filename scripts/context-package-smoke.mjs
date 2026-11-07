import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';

// Exercise archive-aware file reads using the host Electron runtime. This does
// not execute the cross-built Windows executable or validate Windows behavior.
const require = createRequire(import.meta.url);
const root = await mkdtemp(path.join(tmpdir(), 'capri-context-archive-'));
const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
try {
  await new Promise((resolve, reject) => {
    const child = spawn(require('electron'), [
      ...(env.CAPRI_SMOKE_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
      ...(env.CAPRI_SMOKE_SOFTWARE_GL === '1' ? ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] : []),
      path.resolve('release/win-unpacked/resources/app.asar'), '--smoke', `--smoke-art-root=${root}`,
    ], {env, stdio:['ignore','pipe','pipe']});
    let output = '';
    child.stdout.on('data', data => {output += data; process.stdout.write(data);});
    child.stderr.on('data', data => process.stderr.write(data));
    const timer = setTimeout(() => {child.kill(); reject(new Error('Archive context smoke timeout'));}, 60000);
    child.on('error', error => {clearTimeout(timer); reject(error);});
    child.on('exit', code => {
      clearTimeout(timer);
      if (code === 0 && output.includes('ASSISTANT_CONTEXT_OK:bundled-defaults') && output.includes('M1_SMOKE_OK:placeholder:')) resolve();
      else reject(new Error(`Archive context smoke failed (${code})`));
    });
  });
} finally {await rm(root, {recursive:true, force:true});}
