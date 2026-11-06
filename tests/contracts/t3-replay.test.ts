import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseShell,parseDetail} from '../../src/main/t3/parsers';
import {run} from '../../src/core/agent/step';
import type {Input} from '../../src/core/agent/model';
const fixture=async(name:string)=>JSON.parse(await readFile(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
it('replays recorded four-provider shells without metadata refresh erasing threads',async()=>{
 const events=await fixture('t3-shell.json');
 const inputs:Input[]=[{tag:'Started',baseUrl:'http://127.0.0.1:3774'},{tag:'ServerChecked',attempt:1,compatible:true},{tag:'Opened',attempt:1}];
 for(const event of events){const input=parseShell(event,1);if(input)inputs.push(input);}
 const result=run(inputs);expect(result.state.connection.tag).toBe('Live');
 expect(new Set(result.state.threads.map(t=>t.provider))).toEqual(new Set(['claude','codex','antigravity','muse']));
 expect(result.commands.some(c=>c.tag==='Reaction')).toBe(false);
 const marker=events.find((e:any)=>e.resolvedRepositoryIdentityRoots!==undefined);expect(marker).toBeTruthy();expect(parseShell(marker,1)).toBeNull();
});
it('recorded projection only exposes the exact pending request matched by ID',async()=>{
 const p=await fixture('t3-projection.json');expect(parseDetail(p,p.thread.id,'not-pending')).toBeNull();
 const now='2026-11-07T00:00:00.000Z';
 p.runtimeRequests=[{id:'request',nodeId:'node',providerTurnId:null,nativeRequestRef:null,kind:'command',status:'pending',responseCapability:{type:'not_resumable',reason:'fixture'},createdAt:now,resolvedAt:null}];
 p.turnItems=[{type:'approval_request',id:'item',threadId:p.thread.id,runId:null,nodeId:null,providerThreadId:null,providerTurnId:null,nativeItemRef:null,parentItemId:null,ordinal:0,status:'pending',title:null,startedAt:null,completedAt:null,updatedAt:now,requestId:'request',requestKind:'command',prompt:'echo <untrusted>',reason:'Fixture exact reason'}];
 expect(parseDetail(p,p.thread.id,'request')).toMatchObject({text:'echo <untrusted>',reason:'Fixture exact reason'});
 expect(()=>parseDetail(p,'wrong-thread','request')).toThrow();
 p.runtimeRequests[0].status='resolved';expect(parseDetail(p,p.thread.id,'request')).toBeNull();
});
it('vendored contracts remain byte-identical to the upstream pin',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../vendor/t3-contracts/sha256.json',import.meta.url),'utf8'));
 for(const [file,hash] of Object.entries(manifest))expect(createHash('sha256').update(await readFile(new URL(`../../vendor/t3-contracts/${file}`,import.meta.url))).digest('hex')).toBe(hash);
});

it('parses thread delta/removal with the recorded shell shape',async()=>{
 const events=await fixture('t3-shell.json');const thread=events.flatMap((v:any)=>v.kind==='snapshot'?v.snapshot.threads:[])[0];
 expect(parseShell({kind:'thread.updated',sequence:999,location:'active',thread},2)).toMatchObject({tag:'ThreadUpdated',attempt:2,sequence:999,thread:{id:thread.id}});
 expect(parseShell({kind:'thread.removed',sequence:1000,location:'active',threadId:thread.id},2)).toMatchObject({tag:'ThreadRemoved',threadId:thread.id});
});
