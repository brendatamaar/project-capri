import * as Effect from 'effect/Effect';import * as Schema from 'effect/Schema';import * as Rpc from 'effect/rpc/Rpc';import * as RpcGroup from 'effect/rpc/RpcGroup';import * as RpcClient from 'effect/rpc/RpcClient';import * as RpcSerialization from 'effect/rpc/RpcSerialization';import * as Socket from 'effect/socket/Socket';import * as Layer from 'effect/Layer';import * as Schedule from 'effect/Schedule';
import {OrchestrationV2RpcSchemas,OrchestrationV2ThreadProjection} from '../../../vendor/t3-contracts/orchestrationV2';
import {z} from 'zod';import {loopbackOrigin,descriptorSchema} from './parsers';import {assistantAction} from '../../shared/assistant';import type {Action} from '../../core/assistant/model';
export type T3Action=Extract<Action,{tag:'StartThread'|'SteerThread'}>;
export type OperationCredential={baseUrl:string;environmentId:string;token:string};
const group=RpcGroup.make(
 Rpc.make('orchestration.launchThread',{payload:OrchestrationV2RpcSchemas.launchThread.input,success:Schema.Unknown,error:Schema.Unknown}),
 Rpc.make('orchestration.dispatchCommand',{payload:OrchestrationV2RpcSchemas.dispatchCommand.input,success:Schema.Unknown,error:Schema.Unknown}),
 Rpc.make('orchestration.getThreadProjection',{payload:OrchestrationV2RpcSchemas.getThreadProjection.input,success:Schema.Unknown,error:Schema.Unknown}),
);
async function json(url:string,init:RequestInit={},fetcher:typeof fetch=fetch){const response=await fetcher(url,{...init,redirect:'error',signal:init.signal??AbortSignal.timeout(10000)});if(!response.ok)throw Error('T3 operations unavailable');return response.json();}
export async function pairOperations(baseUrl:string,credential:string,fetcher:typeof fetch=fetch):Promise<OperationCredential>{
 const origin=loopbackOrigin.parse(baseUrl),descriptor=descriptorSchema.parse(await json(origin+'/.well-known/t3/environment',{},fetcher));
 if(descriptor.serverVersion!=='0.1.7'||descriptor.orchestrationProtocolVersion!==2)throw Error('Incompatible T3Code');
 const token=z.object({access_token:z.string().min(1),token_type:z.literal('Bearer'),scope:z.string().refine(v=>['orchestration:read','orchestration:operate'].every(s=>v.split(/\s+/).includes(s)))}).parse(await json(origin+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token_type:'urn:t3:params:oauth:token-type:environment-bootstrap',subject_token:credential,requested_token_type:'urn:ietf:params:oauth:token-type:access_token',scope:'orchestration:read orchestration:operate'})},fetcher));
 return {baseUrl:origin,environmentId:descriptor.environmentId,token:token.access_token};
}
export function operationPayload(value:T3Action,ids:{commandId:string;threadId:string;messageId:string}){
 const action=assistantAction.parse(value) as T3Action;
 if(action.tag==='StartThread')return {method:'orchestration.launchThread' as const,payload:Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2RpcSchemas.launchThread.input))({commandId:ids.commandId,threadId:ids.threadId,reuseExistingThread:false,creationSource:'web',projectId:action.projectId,title:action.title,modelSelection:{instanceId:action.provider,model:action.model},runtimeMode:'approval-required',interactionMode:'default',workspaceStrategy:{type:'root'},initialMessage:{messageId:ids.messageId,text:action.prompt,attachments:[]}})};
 return {method:'orchestration.dispatchCommand' as const,payload:Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2RpcSchemas.dispatchCommand.input))({type:'message.dispatch',commandId:ids.commandId,threadId:action.threadId,messageId:ids.messageId,text:action.text,attachments:[],createdBy:'user',creationSource:'web',deliveryIntent:'steer',dispatchMode:{type:'steer_active',targetRunId:action.runId}})};
}
export function assertSteeringTarget(raw:unknown,action:Extract<T3Action,{tag:'SteerThread'}>){
 const p=Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2ThreadProjection))(raw);
 if(p.thread.id!==action.threadId||p.thread.projectId!==action.projectId||p.thread.providerInstanceId!==action.provider||p.thread.runtimeMode!=='approval-required'||p.runtimeRequests.some(r=>r.status==='pending')||!p.runs.some(r=>r.id===action.runId&&['running','starting','preparing'].includes(r.status)))throw Error('Thread changed or cannot be steered safely');
}
export async function sendOperation(auth:OperationCredential,action:T3Action,ids:{commandId:string;threadId:string;messageId:string},signal:AbortSignal):Promise<string>{
 const origin=loopbackOrigin.parse(auth.baseUrl);signal.throwIfAborted();const descriptor=descriptorSchema.parse(await json(origin+'/.well-known/t3/environment',{signal}));
 if(descriptor.serverVersion!=='0.1.7'||descriptor.orchestrationProtocolVersion!==2||descriptor.environmentId!==auth.environmentId)throw Error('T3 identity changed');
 const ticket=z.object({ticket:z.string().min(1)}).parse(await json(origin+'/api/auth/websocket-ticket/rpc',{method:'POST',headers:{authorization:`Bearer ${auth.token}`},signal}));signal.throwIfAborted();
 const socket=Socket.layerWebSocket(`${origin.replace('http:','ws:')}/ws?orchestrationProtocol=2&wsTicket=${encodeURIComponent(ticket.ticket)}`).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal));
 const protocol=RpcClient.layerProtocolSocket({retryTransientErrors:false,retryPolicy:Schedule.recurs(0)}).pipe(Layer.provide(socket),Layer.provide(RpcSerialization.layerJson));
 const operation=operationPayload(action,ids);
 const program=Effect.gen(function*(){const client=yield* RpcClient.make(group);
  if(action.tag==='SteerThread'){const raw=yield* client['orchestration.getThreadProjection']({threadId:action.threadId as never});assertSteeringTarget(raw,action);}
  signal.throwIfAborted();
  if(operation.method==='orchestration.launchThread'){
   const raw=yield* client['orchestration.launchThread'](operation.payload);const result=Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2RpcSchemas.launchThread.output))(raw);if(result.threadId!==ids.threadId||result.projection.thread.runtimeMode!=='approval-required')throw Error('Unexpected thread result');return `Started supervised thread ${result.threadId}.`;
  }
  const raw=yield* client['orchestration.dispatchCommand'](operation.payload);Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2RpcSchemas.dispatchCommand.output))(raw);return 'Steering request accepted by T3Code.';
 });
 try{return await Effect.runPromise(program.pipe(Effect.provide(protocol),Effect.scoped,Effect.timeout('20 seconds')),{signal});}
 catch{throw Error('T3 action outcome may be unknown. Open the thread in T3Code before trying again. No automatic retry was sent.');}
}
