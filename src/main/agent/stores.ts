import {mkdir,readFile,rename,writeFile,rm,appendFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import type {SecureStore,Saved,AuditLog,Scheduler} from './ports';
const saved=z.object({baseUrl:z.string(),token:z.string().min(1)}).strict();
export interface Encryption {isEncryptionAvailable():boolean;encryptString(value:string):Buffer;decryptString(value:Buffer):string}
export function secureStore(directory:string,encryption:Encryption):SecureStore {
  const file=path.join(directory,'t3-connection.bin');let tail=Promise.resolve();
  const serial=<T>(f:()=>Promise<T>)=>{const next=tail.then(f);tail=next.then(()=>{},()=>{});return next;};
  return {
    load:()=>serial(async()=>{if(!encryption.isEncryptionAvailable())return null;try{return saved.parse(JSON.parse(encryption.decryptString(await readFile(file))));}catch{return null;}}),
    save:value=>serial(async()=>{if(!encryption.isEncryptionAvailable())return false;await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',encryption.encryptString(JSON.stringify(saved.parse(value))),{mode:0o600});await rename(file+'.tmp',file);return true;}),
    clear:()=>serial(async()=>{await rm(file,{force:true});await rm(file+'.tmp',{force:true});}),
  };
}
export function memorySecureStore():SecureStore {let value:Saved|null=null;return {load:async()=>value?{...value}:null,save:async v=>{value={...v};return true;},clear:async()=>{value=null;}};}
export function auditLog(directory:string):AuditLog {
  const file=path.join(directory,'approval-audit.jsonl');const seen=new Set<string>();let loaded=false;let tail=Promise.resolve();
  return {append:(key,outcome)=>{
    const next=tail.then(async()=>{
      if(!loaded){try{for(const line of (await readFile(file,'utf8')).split('\n')){try{const value=JSON.parse(line);if(typeof value.key==='string')seen.add(value.key);}catch{}}}catch{}loaded=true;}
      if(seen.has(key))return;
      // Only opaque IDs and allow-listed outcomes, never request text or tokens.
      if(key.length>512||!['detected','closed','opened'].includes(outcome))throw new Error('Invalid audit');
      await mkdir(directory,{recursive:true});await appendFile(file,JSON.stringify({key,outcome,at:new Date().toISOString()})+'\n',{mode:0o600});seen.add(key);
    });tail=next.catch(()=>{});return next;
  }};
}
export function memoryAudit():AuditLog&{entries:{key:string;outcome:string}[]} {const entries:{key:string;outcome:string}[]=[];return {entries,append:async(key,outcome)=>{if(!entries.some(e=>e.key===key))entries.push({key,outcome});}};}
export function scheduler():Scheduler {const timers=new Map<string,ReturnType<typeof setTimeout>>();return {schedule:(key,delay,callback)=>{clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>{timers.delete(key);callback();},delay));},clear:()=>{for(const t of timers.values())clearTimeout(t);timers.clear();}};}
