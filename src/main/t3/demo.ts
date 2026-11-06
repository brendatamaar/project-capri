import recordings from '../../../tests/fixtures/t3-shell.json';
import projection from '../../../tests/fixtures/t3-projection.json';
import {parseShell,parseDetail} from './parsers';
import {memorySecureStore} from '../agent/stores';
import type {AgentRpc} from '../agent/ports';
import type {Thread,Input,RequestId,RunId} from '../../core/agent/model';
export async function demoConnection(){
 const store=memorySecureStore();await store.save({baseUrl:'http://127.0.0.1:3774',token:'offline-demo-not-a-token'});
 let pendingId:string|null=null;
 const rpc:AgentRpc={check:async()=>true,pair:async()=>{throw new Error('Offline demo');},open:async()=>{},detail:async()=>{
  const p=structuredClone(projection) as any;const now='2026-11-07T00:00:00.000Z';
  p.runtimeRequests=[{id:pendingId,nodeId:'demo-node',providerTurnId:null,nativeRequestRef:null,kind:'command',status:'pending',responseCapability:{type:'not_resumable',reason:'Offline demo'},createdAt:now,resolvedAt:null}];
  p.turnItems=[{type:'approval_request',id:'demo-item',threadId:p.thread.id,runId:null,nodeId:null,providerThreadId:null,providerTurnId:null,nativeItemRef:null,parentItemId:null,ordinal:0,status:'pending',title:null,startedAt:null,completedAt:null,updatedAt:now,requestId:pendingId,requestKind:'command',prompt:'npm test (synthetic request; never executed)',reason:'Offline demo only'}];return p;
 },connect:async(_url,_token,attempt,_after,emit,signal)=>{
  emit({tag:'Opened',attempt});let sequence=0;let threads:readonly Thread[]=[];
  for(const raw of recordings){const input=parseShell(raw,attempt);if(input){emit(input);if(input.tag==='Snapshot'){sequence=input.sequence;threads=input.threads;}}}
  const selected=threads.filter((t,index)=>threads.findIndex(v=>v.provider===t.provider)===index);
  const timers:ReturnType<typeof setTimeout>[]=[];
  const update=(index:number,delay:number,patch:Partial<Thread>)=>{const thread=selected[index];if(!thread)return;timers.push(setTimeout(()=>{if(!signal.aborted)emit({tag:'ThreadUpdated',attempt,sequence:++sequence,thread:{...thread,...patch}});},delay));};
  for(let i=0;i<selected.length;i++)update(i,1000,{phase:'running',runId:`demo-run-${i}` as RunId,summary:'Synthetic work started'});
  const first=selected.find(t=>t.id===projection.thread.id)??selected[0];
  if(first){pendingId='offline-demo-request';const index=selected.indexOf(first);update(index,5000,{phase:'waiting',runId:`demo-run-${index}` as RunId,pending:{id:pendingId as RequestId,kind:'command',blocking:true,createdAt:1}});}
  update(1,8000,{phase:'completed',runId:'demo-run-1' as RunId,summary:'Synthetic task finished'});
  update(2,11000,{phase:'failed',runId:'demo-run-2' as RunId,error:'Synthetic failure: no real command was run'});
  await new Promise<void>(resolve=>signal.addEventListener('abort',()=>{for(const timer of timers)clearTimeout(timer);resolve();},{once:true}));
 }};
 return {rpc,store,parseDetail};
}
