// Only creates idle synthetic threads; never sends a message or starts a run.
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Schema from 'effect/Schema';
import * as Socket from 'effect/socket/Socket';
import {OrchestrationV2RpcSchemas} from './contracts/orchestrationV2';
import {parseAddress,checkDescriptor,parseToken} from './policy.mjs';
async function main(){
 if(process.env.T3_PROBE_ISOLATED!=='yes'||!process.env.T3_PROBE_PAIRING_FILE||!process.argv.includes('--create-idle-fixtures'))throw new Error('Isolated fixture creation requires explicit setup');
 const origin=parseAddress(process.env.T3_PROBE_URL??'http://127.0.0.1:3774');
 const get=async(path:string,init?:RequestInit)=>{const r=await fetch(origin+path,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('HTTP failure');return r.json();};
 checkDescriptor(await get('/.well-known/t3/environment'));
 const token=parseToken(await get('/oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token_type:'urn:t3:params:oauth:token-type:environment-bootstrap',subject_token:(await readFile(process.env.T3_PROBE_PAIRING_FILE,'utf8')).trim(),requested_token_type:'urn:ietf:params:oauth:token-type:access_token',scope:'orchestration:read orchestration:operate'})}));
 const ticket=await get('/api/auth/websocket-ticket/rpc',{method:'POST',headers:{authorization:`Bearer ${token.access_token}`}});
 const group=RpcGroup.make(Rpc.make('orchestration.subscribeShell',{payload:OrchestrationV2RpcSchemas.subscribeShell.input,success:Schema.Unknown,error:Schema.Unknown,stream:true}),Rpc.make('orchestration.getThreadProjection',{payload:OrchestrationV2RpcSchemas.getThreadProjection.input,success:Schema.Unknown,error:Schema.Unknown}),Rpc.make('orchestration.dispatchCommand',{payload:OrchestrationV2RpcSchemas.dispatchCommand.input,success:Schema.Unknown,error:Schema.Unknown}));
 const socket=Socket.layerWebSocket(`${origin.replace('http:','ws:')}/ws?orchestrationProtocol=2&wsTicket=${encodeURIComponent(ticket.ticket)}`).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal));
 const protocol=RpcClient.layerProtocolSocket().pipe(Layer.provide(socket),Layer.provide(RpcSerialization.layerJson));
 await Effect.runPromise(Effect.gen(function*(){
  const client=yield* RpcClient.make(group);let snapshot:any;let events:any[]=[];
  const snapshotRun=()=>client['orchestration.subscribeShell']({requestCompletionMarker:true}).pipe(Stream.takeUntil((v:any)=>v.kind==='synchronized'),Stream.runForEach(v=>Effect.sync(()=>{events.push(v);if((v as any).kind==='snapshot')snapshot=v;})));
  yield* snapshotRun();
  const projectId=snapshot.snapshot.projects[0]?.id;if(!projectId)throw new Error('Create a synthetic project first');
  for(const provider of ['claude','codex','antigravity','muse'])yield* client['orchestration.dispatchCommand']({type:'thread.create',commandId:randomUUID(),threadId:randomUUID(),projectId,title:`Capri fixture ${provider}`,createdBy:'user',creationSource:'web',modelSelection:{instanceId:provider,model:'fixture-model'},runtimeMode:'approval-required',interactionMode:'default',branch:null,worktreePath:null} as never);
  events=[];yield* snapshotRun();
  // Remove local filesystem paths from this test-only snapshot.
  const sanitized=JSON.parse(JSON.stringify(events).replaceAll('/tmp/capri-t3-test','C:/capri-test'));
  yield* Effect.promise(()=>writeFile('tests/fixtures/t3-shell.json',JSON.stringify(sanitized,null,2)+'\n'));
  const projection=yield* client['orchestration.getThreadProjection']({threadId:events.flatMap((e:any)=>e.kind==='snapshot'?e.snapshot.threads:e.kind==='thread.updated'?[e.thread]:[]).find((t:any)=>t.title.startsWith('Capri fixture'))!.id});
  yield* Effect.promise(()=>writeFile('tests/fixtures/t3-projection.json',JSON.stringify(projection,null,2).replaceAll('/tmp/capri-t3-test','C:/capri-test')+'\n'));
  console.log('RECORDED_SYNTHETIC_SHELL_OK');
 }).pipe(Effect.provide(protocol),Effect.scoped,Effect.timeout('20 seconds')));
}
main().catch(()=>{console.error('Fixture recording failed; payloads withheld');process.exitCode=1;});
