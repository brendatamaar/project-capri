import {spawn} from 'node:child_process';import path from 'node:path';import {z} from 'zod';
export const nativeRequest=z.discriminatedUnion('op',[
 z.object({op:z.literal('list')}).strict(),
 z.object({op:z.literal('close'),pid:z.number().int().positive(),stamp:z.string().regex(/^\d{1,30}$/)}).strict(),
 z.object({op:z.literal('launch'),app:z.enum(['calculator','notepad'])}).strict(),
 z.object({op:z.literal('music'),operation:z.enum(['playPause','next','previous','volume']),value:z.number().int().min(0).max(100).optional()}).strict(),
]);
export const nativeApps=z.array(z.object({pid:z.number().int().positive(),name:z.string().max(512),stamp:z.string().regex(/^\d{1,30}$/)})).max(128);
export function nativeControl(value:unknown,signal:AbortSignal):Promise<unknown>{
 const request=nativeRequest.parse(value);signal.throwIfAborted();if(process.platform!=='win32')return Promise.reject(Error('Windows only'));
 const script=path.join(__dirname,'assistant-controls.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
 const executable=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,['-STA','-NoProfile','-NonInteractive','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',settled=false;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(error){child.kill();reject(error);}else{try{resolve(JSON.parse(output));}catch{reject(Error('Invalid native response'));}}};
  const abort=()=>finish(Error('Native action cancelled; it may already have completed'));
  const timer=setTimeout(()=>finish(Error('Native action timed out')),15000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  child.stdout.on('data',data=>{output+=data.toString();if(output.length>65536)finish(Error('Native response too large'));});child.stderr.resume();
  child.on('error',()=>finish(Error('Native controls unavailable')));child.on('exit',code=>finish(code===0?undefined:Error('Native action failed')));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({...request,parentId:process.pid}));
 });
}
