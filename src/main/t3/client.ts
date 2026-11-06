import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Schema from 'effect/Schema';
import * as Schedule from 'effect/Schedule';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Socket from 'effect/socket/Socket';
import {OrchestrationV2RpcSchemas} from '../../../vendor/t3-contracts/orchestrationV2';
import {descriptorSchema,tokenSchema,loopbackOrigin,parseShell,parseLimits} from './parsers';
import type {AgentRpc} from '../agent/ports';
import {z} from 'zod';
const group=RpcGroup.make(
  Rpc.make('orchestration.subscribeShell',{payload:OrchestrationV2RpcSchemas.subscribeShell.input,success:Schema.Unknown,error:Schema.Unknown,stream:true}),
  Rpc.make('orchestration.getThreadProjection',{payload:OrchestrationV2RpcSchemas.getThreadProjection.input,success:Schema.Unknown,error:Schema.Unknown}),
  Rpc.make('subscribeServerConfig',{payload:Schema.Struct({}),success:Schema.Unknown,error:Schema.Unknown,stream:true}),
);
async function json(url:string,init?:RequestInit) {
  const r=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok){const e=new Error('T3 request failed');if(r.status===401||r.status===403)e.name='AuthRejected';throw e;}
  return r.json();
}
export function t3Client(openExternal:(url:string)=>Promise<void>):AgentRpc {
  const environmentIds=new Map<string,string>();
  let getDetail:((id:string)=>Promise<unknown>)|null=null;
  return {
    async check(baseUrl){const origin=loopbackOrigin.parse(baseUrl);const d=descriptorSchema.parse(await json(`${origin}/.well-known/t3/environment`));environmentIds.set(origin,d.environmentId);return d.serverVersion==='0.1.7'&&d.orchestrationProtocolVersion===2;},
    async pair(baseUrl,credential){
      const origin=loopbackOrigin.parse(baseUrl);const d=descriptorSchema.parse(await json(`${origin}/.well-known/t3/environment`));
      if(d.serverVersion!=='0.1.7'||d.orchestrationProtocolVersion!==2)throw new Error('Incompatible server');
      const token=tokenSchema.parse(await json(`${origin}/oauth/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token_type:'urn:t3:params:oauth:token-type:environment-bootstrap',subject_token:credential,requested_token_type:'urn:ietf:params:oauth:token-type:access_token',scope:'orchestration:read'})}));
      return token.access_token;
    },
    async connect(baseUrl,token,attempt,afterSequence,emit,signal){
      const origin=loopbackOrigin.parse(baseUrl);
      const ticket=z.object({ticket:z.string().min(1)}).parse(await json(`${origin}/api/auth/websocket-ticket/rpc`,{method:'POST',headers:{authorization:`Bearer ${token}`}}));
      if(signal.aborted)return;
      const socket=Socket.layerWebSocket(`${origin.replace('http:','ws:')}/ws?orchestrationProtocol=2&wsTicket=${encodeURIComponent(ticket.ticket)}`).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal));
      const protocol=RpcClient.layerProtocolSocket({retryTransientErrors:false,retryPolicy:Schedule.recurs(0)}).pipe(Layer.provide(socket),Layer.provide(RpcSerialization.layerJson));
      const program=Effect.gen(function*(){
        const client=yield* RpcClient.make(group);
        const detail=(id:string)=>Effect.runPromise(client['orchestration.getThreadProjection']({threadId:id as never}).pipe(Effect.timeout('10 seconds')),{signal});
        getDetail=detail;
        signal.addEventListener('abort',()=>{if(getDetail===detail)getDetail=null;},{once:true});
        emit({tag:'Opened',attempt});
        yield* Effect.raceFirst(
          client['orchestration.subscribeShell']({...afterSequence>=0?{afterSequence}:{},requestCompletionMarker:true}).pipe(Stream.runForEach(raw=>Effect.sync(()=>{const input=parseShell(raw,attempt);if(input)emit(input);}))),
          client.subscribeServerConfig({}).pipe(Stream.runForEach(raw=>Effect.sync(()=>{const limits=parseLimits(raw);if(limits)emit({tag:'Limits',attempt,limits});})),Effect.catch(()=>Effect.void),Effect.andThen(Effect.never)),
        );
      });
      try{await Effect.runPromise(program.pipe(Effect.provide(protocol),Effect.scoped),{signal});}finally{if(!signal.aborted)getDetail=null;}
    },
    async detail(threadId){if(!getDetail)throw new Error('Disconnected');return getDetail(threadId);},
    async open(baseUrl,threadId){const origin=loopbackOrigin.parse(baseUrl),environmentId=environmentIds.get(origin);if(!environmentId)throw new Error('Server identity unavailable');await openExternal(`${origin}/${encodeURIComponent(environmentId)}/${encodeURIComponent(threadId)}`);},
  };
}
