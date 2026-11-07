import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
await new Promise((resolve,reject)=>{
 const child=spawn(require('electron'),[...(process.env.CAPRI_SMOKE_NO_SANDBOX==='1'?['--no-sandbox']:[]),...(process.env.CAPRI_SMOKE_SOFTWARE_GL==='1'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]),process.argv.includes('--archive')?path.resolve('release/win-unpacked/resources/app.asar'):'.','--smoke','--smoke-overlay','--smoke-assistant'],{env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',data=>{output+=data;process.stdout.write(data);});child.stderr.on('data',data=>process.stderr.write(data));
 const timer=setTimeout(()=>{child.kill();reject(new Error('Assistant smoke timed out'));},60000);
 child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('exit',code=>{clearTimeout(timer);code===0&&output.includes('ASSISTANT_SMOKE_OK')?resolve():reject(new Error(`Assistant smoke exit ${code}`));});
});
