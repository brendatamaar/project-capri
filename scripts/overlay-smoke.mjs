import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url), env={...process.env}; delete env.ELECTRON_RUN_AS_NODE;
const packaged=process.argv.includes('--packaged');
const executable=packaged?path.resolve('release/win-unpacked/Capri Companion.exe'):require('electron');
const root=await mkdtemp(path.join(tmpdir(),'capri-overlay-smoke-'));
async function run(face=false) { await new Promise((resolve,reject)=>{
  const child=spawn(executable,[...(process.env.CAPRI_SMOKE_NO_SANDBOX==='1'?['--no-sandbox']:[]),...(process.env.CAPRI_SMOKE_SOFTWARE_GL==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]),...(packaged?[]:['.']),'--smoke','--smoke-overlay',`--smoke-art-root=${root}`],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output=''; child.stdout.on('data',data=>{output+=data;process.stdout.write(data)});child.stderr.on('data',data=>process.stderr.write(data));
  const timer=setTimeout(()=>{child.kill();reject(new Error('Overlay smoke timeout'))},60000);
  child.on('error',error=>{clearTimeout(timer);reject(error)});
  child.on('exit',code=>{clearTimeout(timer);code===0&&output.includes('M2_SMOKE_OK')&&(!face||output.includes('M4_FACE_OK'))?resolve():reject(new Error(`Overlay smoke exit ${code}`))});
}); }
try {
  await run();
  await cp('art/placeholder',path.join(root,'art'),{recursive:true});
  const manifest=JSON.parse(await readFile('art/placeholder/manifest.json','utf8'));
  await writeFile(path.join(root,'art/manifest.json'),JSON.stringify({...manifest,name:'Original face fixture',faceAnchor:{x:100,y:95,width:36,height:30}}));
  await run(true);
} finally { await rm(root,{recursive:true,force:true}); }
