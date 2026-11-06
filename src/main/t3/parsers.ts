import {z} from 'zod';
import * as Schema from 'effect/Schema';
import * as DateTime from 'effect/DateTime';
import {OrchestrationV2ShellStreamItem,OrchestrationV2ThreadProjection, type OrchestrationV2ThreadShell} from '../../../vendor/t3-contracts/orchestrationV2';
import {ServerConfigStreamEvent} from '../../../vendor/t3-contracts/server';
import {loopbackOrigin} from '../../shared/agent';
import type {Input,Thread,ThreadId,RunId,RequestId,Detail,Limit} from '../../core/agent/model';
export const descriptorSchema=z.object({serverVersion:z.string(),orchestrationProtocolVersion:z.number().int(),environmentId:z.string().min(1)});
export const tokenSchema=z.object({access_token:z.string().min(1),token_type:z.literal('Bearer'),expires_in:z.number().positive().finite(),scope:z.string().refine(s=>s.split(/\s+/).includes('orchestration:read'))});
export {loopbackOrigin};
const shellKinds=new Set(['snapshot','synchronized','project.updated','project.removed','thread.updated','thread.removed']);
export function mapThread(t:OrchestrationV2ThreadShell):Thread {
  return {id:t.id as unknown as ThreadId,projectId:t.projectId,title:t.title,provider:t.providerInstanceId,mode:t.runtimeMode,phase:t.activityRunStatus??t.status,runId:(t.activeRunId??t.latestRunId) as unknown as RunId|null,error:t.lastError??null,summary:t.latestVisibleMessage?.text??null,pending:t.pendingRuntimeRequest?{id:t.pendingRuntimeRequest.id as unknown as RequestId,kind:t.pendingRuntimeRequest.kind,createdAt:DateTime.toEpochMillis(t.pendingRuntimeRequest.createdAt),blocking:t.pendingRuntimeRequest.blocking!==false}:null};
}
export function parseShell(value:unknown,attempt:number):Input|null {
  const kind=z.object({kind:z.string()}).parse(value).kind;
  if(!shellKinds.has(kind))return null;
  const item=Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2ShellStreamItem))(value);
  switch(item.kind){
    case 'snapshot':
      // Marked snapshots enrich repository identity only; they are not thread resets.
      if(item.resolvedRepositoryIdentityRoots!==undefined)return null;
      return {tag:'Snapshot',attempt,sequence:item.snapshot.snapshotSequence,projects:item.snapshot.projects.map(p=>({id:p.id,title:p.title})),threads:[...item.snapshot.threads,...item.snapshot.archivedThreads].filter(t=>!t.deletedAt).map(mapThread)};
    case 'synchronized':return {tag:'Synchronized',attempt};
    case 'thread.updated':return item.thread.deletedAt?{tag:'ThreadRemoved',attempt,sequence:item.sequence,threadId:item.thread.id as unknown as ThreadId}:{tag:'ThreadUpdated',attempt,sequence:item.sequence,thread:mapThread(item.thread)};
    case 'thread.removed':return {tag:'ThreadRemoved',attempt,sequence:item.sequence,threadId:item.threadId as unknown as ThreadId};
    case 'project.updated':return {tag:'ProjectUpdated',attempt,sequence:item.sequence,project:{id:item.project.id,title:item.project.title}};
    case 'project.removed':return {tag:'ProjectRemoved',attempt,sequence:item.sequence,projectId:item.projectId};
  }
}
export function parseDetail(value:unknown,threadId:string,requestId:string):Detail|null {
  const p=Schema.decodeUnknownSync(Schema.toCodecJson(OrchestrationV2ThreadProjection))(value);
  if(p.thread.id!==threadId)throw new Error('Wrong thread projection');
  const req=p.runtimeRequests.find(r=>r.id===requestId&&r.status==='pending');
  const item=p.turnItems.find(i=>i.type==='approval_request'&&i.requestId===requestId);
  if(!req||!item||item.type!=='approval_request'||typeof item.prompt!=='string')return null;
  return {threadId:threadId as ThreadId,requestId:requestId as RequestId,text:item.prompt,reason:item.reason??'',kind:req.kind};
}
export function parseLimits(value:unknown):readonly Limit[]|null {
  const type=z.object({type:z.string()}).parse(value).type;
  if(!['snapshot','providerStatuses'].includes(type))return null;
  const event=Schema.decodeUnknownSync(Schema.toCodecJson(ServerConfigStreamEvent))(value);
  const providers=event.type==='snapshot'?event.config.providers:event.type==='providerStatuses'?event.payload.providers:[];
  return providers.flatMap<Limit>(p=>p.usageLimits&&!p.usageLimits.unavailable&&p.usageLimits.windows.length?p.usageLimits.windows.map(w=>({provider:p.instanceId,label:w.label,remaining:100-w.usedPercent,reset:w.resetsAt??null})):[{provider:p.instanceId,label:'Unavailable',remaining:null,reset:null}]);
}
