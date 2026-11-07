import {expect,it} from 'vitest';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {streamProvider,contextPrompt,ProviderFailure} from '../../src/main/assistant/provider';
import {loadAssistantContext} from '../../src/main/assistant/context';
import {providerConfig,defaultProvider,assistantAction} from '../../src/shared/assistant';
import {providerStore} from '../../src/main/assistant/config';
const ctx=()=>loadAssistantContext('/nonexistent-context',path.resolve('assistant/defaults'));
const compatible={...defaultProvider,kind:'compatible' as const,baseUrl:'https://example.test/v1',cloudConsent:true};
function wire(text:string){return new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(text);for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}}));}
it('decodes fragmented SSE and proposes only after complete validated output',async()=>{
 const events:unknown[]=[];let body='';
 const action={tag:'Remember',text:'Keep tests deterministic'};
 const pieces=[{choices:[{delta:{content:'Hello 🌿'}}]},{choices:[{delta:{tool_calls:[{index:0,function:{name:'request_action',arguments:JSON.stringify({action})}}]},finish_reason:'tool_calls'}]}];
 await streamProvider(compatible,'secret',await ctx(),[{role:'user',text:'Hi'}],e=>events.push(e),new AbortController().signal,(async(_u,init)=>{body=String(init?.body);return wire(pieces.map(p=>'data: '+JSON.stringify(p)+'\r\n\r\n').join('')+'data: [DONE]\n\n');}) as typeof fetch);
 expect(events).toEqual([{tag:'Text',text:'Hello 🌿'},{tag:'Proposal',action}]);expect(body).toContain('parallel_tool_calls');
});
it('decodes Ollama NDJSON, rejects truncated streams and unknown actions',async()=>{
 const config={...defaultProvider,kind:'ollama' as const};const events:unknown[]=[];
 await streamProvider(config,'',await ctx(),[],e=>events.push(e),new AbortController().signal,(async()=>wire('{"message":{"content":"Hi"},"done":false}\n{"done":true}\n')) as typeof fetch);
 expect(events).toEqual([{tag:'Text',text:'Hi'}]);
 for(const text of ['{"message":{"content":"partial"}}\n','{"message":{"tool_calls":[{"function":{"name":"shell","arguments":{}}}]},"done":true}\n'])await expect(streamProvider(config,'',await ctx(),[],()=>{},new AbortController().signal,(async()=>wire(text)) as typeof fetch)).rejects.toThrow();
 expect(assistantAction.safeParse({tag:'Shell',command:'anything'}).success).toBe(false);
});
it('bounds context and rejects remote plaintext, redirects configuration and absent cloud consent',async()=>{
 expect(providerConfig.safeParse({...compatible,baseUrl:'http://remote.test'}).success).toBe(false);
 expect(providerConfig.safeParse({...compatible,cloudConsent:false}).success).toBe(false);
 expect(providerConfig.safeParse({...compatible,baseUrl:'https://key@example.test'}).success).toBe(false);
 const context=await ctx();expect(contextPrompt({...context,SOUL:{...context.SOUL,text:'a'.repeat(64000)}},true).length).toBeLessThan(6000);
});
it('classifies HTTP failures without echoing provider errors or retrying in the adapter',async()=>{
 let calls=0;
 try{await streamProvider(compatible,'',await ctx(),[],()=>{},new AbortController().signal,(async()=>{calls++;return new Response('private error body',{status:503});}) as typeof fetch);}catch(e){expect(e).toBeInstanceOf(ProviderFailure);expect((e as ProviderFailure).transient).toBe(true);expect(String(e)).not.toContain('private');}
 expect(calls).toBe(1);
});
it('stores credentials encrypted and uses memory when encryption is unavailable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'capri-provider-'));
 try{
  const no={isEncryptionAvailable:()=>false,encryptString:()=>{throw Error();},decryptString:()=>{throw Error();}};
  const store=providerStore(dir,no);expect(await store.save({config:compatible,key:'secret'})).toBe(false);expect((await store.load()).key).toBe('secret');expect(await readdir(dir)).toEqual([]);
  const encrypted={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(Buffer.from(s).map(b=>b^42)),decryptString:(b:Buffer)=>Buffer.from(b.map(v=>v^42)).toString()};
  await providerStore(dir,encrypted).save({config:compatible,key:'secret'});expect((await providerStore(dir,encrypted).load()).key).toBe('secret');await store.clear();expect(await readdir(dir)).toEqual([]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('requires cloud disclosure for a cloud-tagged Ollama model even on loopback',()=>{
 expect(providerConfig.safeParse({...defaultProvider,kind:'ollama',model:'model:cloud'}).success).toBe(false);
 expect(providerConfig.safeParse({...defaultProvider,kind:'ollama',model:'model:cloud',cloudConsent:true}).success).toBe(true);
});
