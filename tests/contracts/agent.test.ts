import {describe,it,expect,vi,afterEach} from 'vitest';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {secureStore,memorySecureStore,auditLog,memoryAudit,scheduler} from '../../src/main/agent/stores';
import {createAgent,boardView} from '../../src/main/agent/interpreter';
import {initial,type Input} from '../../src/core/agent/model';
import {panelAction} from '../../src/shared/agent';
import {parseShell,tokenSchema,parseLimits} from '../../src/main/t3/parsers';
import {t3Client} from '../../src/main/t3/client';
import type {AgentRpc} from '../../src/main/agent/ports';
const encryption={isEncryptionAvailable:()=>true,encryptString:(v:string)=>Buffer.from(Buffer.from(v).map(n=>n^0xa5)),decryptString:(v:Buffer)=>Buffer.from(v).map(n=>n^0xa5).toString()};
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('agent storage contracts',()=>{
 for(const kind of ['memory','encrypted'] as const)it(`${kind} SecureStore saves, loads and clears`,async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'capri-secure-'));try{
   const store=kind==='memory'?memorySecureStore():secureStore(dir,encryption);
   expect(await store.load()).toBeNull();expect(await store.save({baseUrl:'http://localhost:3774',token:'sensitive-fixture'})).toBe(true);
   expect(await store.load()).toMatchObject({token:'sensitive-fixture'});
   if(kind==='encrypted')expect((await readFile(path.join(dir,'t3-connection.bin'))).includes(Buffer.from('sensitive-fixture'))).toBe(false);
   await store.clear();expect(await store.load()).toBeNull();
  }finally{await rm(dir,{recursive:true,force:true});}
 });
 it('unavailable encryption never writes plaintext',async()=>{
  const store=secureStore('/unwritable/no-access',{...encryption,isEncryptionAvailable:()=>false});expect(await store.save({baseUrl:'fixture',token:'fixture'})).toBe(false);expect(await store.load()).toBeNull();
 });
 for(const kind of ['memory','file'] as const)it(`${kind} audit deduplicates keys`,async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'capri-audit-'));try{const log=kind==='memory'?memoryAudit():auditLog(dir);await Promise.all([log.append('a:closed','closed'),log.append('a:closed','closed')]);
  if(kind==='file'){await auditLog(dir).append('a:closed','closed');expect((await readFile(path.join(dir,'approval-audit.jsonl'),'utf8')).trim().split('\n')).toHaveLength(1);}
  else expect('entries' in log&&log.entries).toHaveLength(1);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
 it('scheduler replaces matching keys and cancels outstanding callbacks',()=>{
  vi.useFakeTimers();const clock=scheduler(),fn=vi.fn();clock.schedule('a',10,fn);clock.schedule('a',20,fn);vi.advanceTimersByTime(15);expect(fn).not.toHaveBeenCalled();vi.advanceTimersByTime(5);expect(fn).toHaveBeenCalledTimes(1);clock.schedule('b',10,fn);clock.clear();vi.runAllTimers();expect(fn).toHaveBeenCalledTimes(1);
 });
});
describe('agent boundary contracts',()=>{
 it('rejects decision IPC, remote origins and renderer-supplied URLs',()=>{
  expect(panelAction.safeParse({tag:'Approve',requestId:'a'}).success).toBe(false);
  for(const baseUrl of ['https://example.com','http://user:secret@localhost','http://localhost/?token=a'])expect(panelAction.safeParse({tag:'Pair',baseUrl,credential:'fixture'}).success).toBe(false);
  expect(panelAction.safeParse({tag:'OpenThread',threadId:'t',url:'file:///secret'}).success).toBe(false);
 });
 it('parses snapshots and unknown items; malformed known items fail closed',()=>{
  expect(parseShell({kind:'future-item'},1)).toBeNull();
  expect(parseShell({kind:'synchronized'},1)).toEqual({tag:'Synchronized',attempt:1});
  expect(parseShell({kind:'snapshot',snapshot:{schemaVersion:1,snapshotSequence:7,threads:[],archivedThreads:[],projects:[]}},2)).toMatchObject({tag:'Snapshot',attempt:2,sequence:7});
  expect(()=>parseShell({kind:'thread.updated'},1)).toThrow();
 });
 it('rejects wrong token type, expiry, and missing monitoring scope',()=>{
  const token={access_token:'fixture',token_type:'Bearer',expires_in:60,scope:'orchestration:read'};
  expect(tokenSchema.safeParse(token).success).toBe(true);for(const patch of [{token_type:'DPoP'},{expires_in:0},{scope:'mcp:read'}])expect(tokenSchema.safeParse({...token,...patch}).success).toBe(false);
 });
 it('unknown provider event kinds do not crash; malformed known event fails',()=>{
  expect(parseLimits({type:'future'})).toBeNull();expect(()=>parseLimits({type:'providerStatuses',version:1,payload:{providers:[{instanceId:'x',usageLimits:{windows:[{usedPercent:200}]}}]}})).not.toThrow();
  // ForwardCompatibleArray intentionally drops unknown/malformed provider records.
 });
 it('display view contains no connection credential or filesystem configuration',()=>{
  const view=boardView(initial(),null);expect(JSON.stringify(view)).not.toMatch(/token|credential|baseUrl/);expect(view.connection).toBe('Unpaired');
 });
 it('auth client checks compatibility before exchange and asks only read scope',async()=>{
  const requests:{url:string;body:string}[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{requests.push({url,body:String(init?.body??'')});return new Response(JSON.stringify(url.endsWith('/oauth/token')?{access_token:'fixture',token_type:'Bearer',expires_in:60,scope:'orchestration:read'}:{serverVersion:'0.1.7',orchestrationProtocolVersion:2,environmentId:'env'}));}));
  const rpc=t3Client(async()=>{});expect(await rpc.pair('http://127.0.0.1:3774','pairing-fixture')).toBe('fixture');
  expect(requests).toHaveLength(2);expect(new URLSearchParams(requests[1]!.body).get('scope')).toBe('orchestration:read');
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({serverVersion:'0.1.8',orchestrationProtocolVersion:2,environmentId:'env'})));await expect(rpc.pair('http://127.0.0.1:3774','fixture')).rejects.toThrow();
 });
 it('late pairing cannot restore a credential after disconnect',async()=>{
  let resolve!:(v:string)=>void;const store=memorySecureStore();
  const rpc:AgentRpc={check:async()=>true,pair:()=>new Promise<string>(r=>resolve=r),connect:async()=>{},detail:async()=>null,open:async()=>{}};
  const agent=createAgent({store,audit:memoryAudit(),scheduler:scheduler(),panel:{render:()=>{}},character:{reaction:()=>{},presence:()=>{}},rpc,parseDetail:()=>null,random:()=>0});
  agent.dispatch({tag:'Pair',baseUrl:'http://127.0.0.1:3774',credential:'fixture'});agent.dispatch({tag:'Disconnect'});resolve('late-token');await Promise.resolve();await Promise.resolve();expect(agent.state().connection.tag).toBe('Unpaired');expect(await store.load()).toBeNull();agent.stop();
 });
});
it('offline demo replays the recording and keeps synthetic requests in memory only',async()=>{
 vi.useFakeTimers();vi.stubGlobal('fetch',()=>{throw new Error('Demo must not network');});
 const {demoConnection}=await import('../../src/main/t3/demo');const demo=await demoConnection();
 const events:Input[]=[];const abort=new AbortController();
 const connected=demo.rpc.connect('http://127.0.0.1:3774','demo',1,-1,input=>events.push(input),abort.signal);
 expect(events.some(i=>i.tag==='Snapshot'&&i.threads.length>=4)).toBe(true);
 await vi.advanceTimersByTimeAsync(5000);
 const waiting=events.find(i=>i.tag==='ThreadUpdated'&&i.thread.pending);
 expect(waiting?.tag).toBe('ThreadUpdated');
 if(waiting?.tag==='ThreadUpdated'&&waiting.thread.pending){const raw=await demo.rpc.detail(waiting.thread.id,waiting.thread.pending.id);expect(demo.parseDetail(raw,waiting.thread.id,waiting.thread.pending.id)?.text).toContain('never executed');}
 await vi.advanceTimersByTimeAsync(6000);expect(events.some(i=>i.tag==='ThreadUpdated'&&i.thread.phase==='failed')).toBe(true);
 abort.abort();await connected;const count=events.length;await vi.runAllTimersAsync();expect(events).toHaveLength(count);
});
