// Opt-in test: only against a separate T3Code data directory, no agent turns.
import {readFile} from 'node:fs/promises';
import {t3Client} from '../../src/main/t3/client';
import {parseDetail} from '../../src/main/t3/parsers';
import type {Input} from '../../src/core/agent/model';
if(process.env.T3_PROBE_ISOLATED!=='yes'||!process.env.T3_PROBE_PAIRING_FILE)throw new Error('Isolated instance and private credential file required');
const rpc=t3Client(async()=>{throw new Error('No browser opening during contract test');});
const url=process.env.T3_PROBE_URL??'http://127.0.0.1:3774';
try {
 if(!await rpc.check(url))throw new Error('Incompatible');
 const token=await rpc.pair(url,(await readFile(process.env.T3_PROBE_PAIRING_FILE,'utf8')).trim());
 let sequence=-1;
 for(let attempt=1;attempt<=2;attempt++){
  const abort=new AbortController();const kinds:string[]=[];let threadId:string|null=null,projectionChecked=false;
  const timeout=setTimeout(()=>abort.abort(),15000);
  try{await rpc.connect(url,token,attempt,sequence,(input:Input)=>{
    kinds.push(input.tag);if(input.tag==='Snapshot'){sequence=input.sequence;threadId=input.threads[0]?.id??null;}
    if(input.tag==='Synchronized'){if(threadId){const id=threadId;void rpc.detail(id,'not-pending').then(raw=>{if(parseDetail(raw,id,'not-pending')!==null)throw new Error('Unexpected request');projectionChecked=true;abort.abort();},()=>abort.abort());}else abort.abort();}
  },abort.signal);}catch(error){if(!abort.signal.aborted)throw error;}finally{clearTimeout(timeout);}
  if(threadId&&!projectionChecked)throw new Error('Projection was not validated');
  if(!kinds.includes('Synchronized'))throw new Error('No synchronized marker');
  console.log({attempt,sequence,kinds,projectionChecked});
 }
 console.log('T3_ADAPTER_LIVE_OK');
}catch{console.error('Live contract failed; payloads withheld');process.exitCode=1;}
