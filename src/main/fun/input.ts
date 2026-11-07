import {spawn} from 'node:child_process';import path from 'node:path';import {z} from 'zod';import {jobStep,jobTarget} from '../../shared/fun';
export const inputRequest=z.discriminatedUnion('op',[
 z.object({op:z.literal('list')}).strict(),
 z.object({op:z.literal('job'),target:jobTarget,steps:z.array(jobStep).min(1).max(20)}).strict(),
]);
export function inputControl(value:unknown,signal:AbortSignal):Promise<unknown>{
 const parsed=inputRequest.safeParse(value);if(!parsed.success)throw Error('Invalid input job');signal.throwIfAborted();if(process.platform!=='win32')return Promise.reject(Error('Windows only'));
 const script=path.join(__dirname,'input-jobs.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`),exe=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 return new Promise((resolve,reject)=>{let done=false,output='';const child=spawn(exe,['-STA','-NoProfile','-NonInteractive','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(error){child.kill();reject(error);}else{try{resolve(JSON.parse(output));}catch{reject(Error('Invalid input result'));}}};const abort=()=>finish(Error('Input job cancelled; inspect the target before retrying'));const timer=setTimeout(()=>finish(Error('Input job timed out; inspect the target')),15000);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();child.stdout.on('data',data=>{output+=data;if(output.length>65536)finish(Error('Input result too large'));});child.stderr.resume();child.on('error',()=>finish(Error('Input helper unavailable')));child.on('exit',code=>finish(code===0?undefined:Error('Input job refused or outcome unknown')));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(parsed.data));});
}
