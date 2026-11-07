import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {providerConfig,defaultProvider,type ProviderConfig} from '../../shared/assistant';
import type {Encryption} from '../agent/stores';
const saved=z.object({config:providerConfig,key:z.string().max(4096)}).strict();
export type ProviderSettings={config:ProviderConfig;key:string};
export function providerStore(directory:string,encryption:Encryption){
 const file=path.join(directory,'assistant-provider.bin');let memory:ProviderSettings={config:defaultProvider,key:''},tail=Promise.resolve();
 const serial=<T>(f:()=>Promise<T>)=>{const next=tail.then(f);tail=next.then(()=>{},()=>{});return next;};
 return {
  load:()=>serial(async()=>{if(encryption.isEncryptionAvailable()){try{memory=saved.parse(JSON.parse(encryption.decryptString(await readFile(file))));}catch{}}return structuredClone(memory);}),
  save:(value:ProviderSettings)=>serial(async()=>{memory=saved.parse(value);if(!encryption.isEncryptionAvailable())return false;await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',encryption.encryptString(JSON.stringify(memory)),{mode:0o600});await rename(file+'.tmp',file);return true;}),
  clear:()=>serial(async()=>{memory={config:defaultProvider,key:''};await rm(file,{force:true});await rm(file+'.tmp',{force:true});}),
 };
}
