import {randomUUID} from 'node:crypto';
import type {Action} from '../../core/assistant/model';import type {assistantData} from './data';import {sensitiveMemory} from './data';
import {fileSearch} from './files';import {nativeApps,nativeControl} from './native';import type {OperationCredential} from '../t3/operations';import {sendOperation} from '../t3/operations';
export type Targets={live:boolean;server:string|null;projects:{id:string;title:string}[];threads:{id:string;title:string;provider:string;projectId:string;runId:string|null;phase:string;mode:string}[]};
export function actionExecutor(deps:{data:Awaited<ReturnType<typeof assistantData>>;files:ReturnType<typeof fileSearch>;targets:()=>Targets;auth:()=>OperationCredential|null;point:(runId:number,x:number,y:number,label:string)=>void;native?:typeof nativeControl;t3?:typeof sendOperation;platform?:string;remindersChanged:()=>void}){
 const apps=new Map<string,{pid:number;name:string;stamp:string}>();
 const policy=(action:Action):string|null=>{
  if(action.tag==='CancelReminder'&&!deps.data.reminders().some(r=>r.id===action.id))return 'Reminder no longer exists.';
  if(action.tag==='Remember'&&sensitiveMemory(action.text))return 'Private credentials, payment details and contact details cannot be saved as memory.';
  if(action.tag==='OpenFile'&&!deps.files.describe(action.id))return 'Search result is unavailable. Search again.';
  if(action.tag==='CloseApp'&&!apps.has(action.id))return 'App handle is unavailable. List apps again.';
  if(action.tag==='SearchFiles'&&!deps.files.root())return 'Choose a search folder first.';
  if(['LaunchApp','CloseApp','ListApps','Music'].includes(action.tag)&&(deps.platform??process.platform)!=='win32')return 'Native app/music controls require Windows.';
  if(action.tag==='StartThread'||action.tag==='SteerThread'){
   const targets=deps.targets(),auth=deps.auth();if(!auth||!targets.live||targets.server!==auth.baseUrl)return 'Pair operations with the connected monitoring server first.';
   if(!targets.projects.some(p=>p.id===action.projectId))return 'Unknown project.';
   if(action.tag==='StartThread'&&!['claude','codex','antigravity','muse',...targets.threads.map(t=>t.provider)].includes(action.provider))return 'Unknown provider instance.';
   if(action.tag==='SteerThread'&&!targets.threads.some(t=>t.id===action.threadId&&t.projectId===action.projectId&&t.provider===action.provider&&t.runId===action.runId&&t.mode==='approval-required'&&['running','starting','preparing'].includes(t.phase)))return 'Only the current active Supervised run can be steered.';
  }return null;
 };
 const describe=(action:Action)=>{
  const extra=action.tag==='CancelReminder'?`Cancel reminder: ${deps.data.reminders().find(r=>r.id===action.id)?.text??'unavailable'}`:action.tag==='OpenFile'?`Reveal in Explorer: ${deps.files.describe(action.id)??'unavailable'}`:action.tag==='CloseApp'?`Graceful close: ${apps.get(action.id)?.name??'unavailable'}, PID ${apps.get(action.id)?.pid??'unavailable'}`:action.tag==='Remember'?'Append the exact text below to local MEMORY.md.':action.tag==='StartThread'?`Start Supervised in project ${deps.targets().projects.find(p=>p.id===action.projectId)?.title??action.projectId}, provider ${action.provider}, model ${action.model}, project root workspace.`:action.tag==='SteerThread'?`Steer ${deps.targets().threads.find(t=>t.id===action.threadId)?.title??action.threadId}, provider ${action.provider}, project ${action.projectId}, active run ${action.runId}.`:action.tag==='SearchFiles'?`Search filenames under ${deps.files.root()??'no selected folder'}.`:'Run this exact action once.';
  return extra+'\n'+JSON.stringify(action,null,2);
 };
 return {policy,describe,async execute(action:Action,runId:number,signal:AbortSignal):Promise<string>{
  signal.throwIfAborted();const blocked=policy(action);if(blocked)return 'Action blocked: '+blocked;
  switch(action.tag){
   case 'Note':{const file=await deps.data.note(randomUUID(),action.title,action.text,signal);return `Note saved: ${file}`;}
   case 'Remember':await deps.data.remember(action.text,signal);return 'Approved memory appended to MEMORY.md.';
   case 'Reminder':deps.data.addReminder({id:randomUUID(),text:action.text,due:Date.now()+action.minutes*60000});deps.remindersChanged();return `Reminder scheduled in ${action.minutes} minutes.`;
   case 'CancelReminder':deps.data.finishReminder(action.id);deps.remindersChanged();return 'Reminder cancelled.';
   case 'SearchFiles':return JSON.stringify(await deps.files.search(action.query,signal),null,2);
   case 'OpenFile':await deps.files.open(action.id,signal);return 'File revealed in Explorer. No file was executed.';
   case 'SearchTranscript':return JSON.stringify(deps.data.search(action.query),null,2);
   case 'ListApps':{apps.clear();const rows=nativeApps.parse(await (deps.native??nativeControl)({op:'list'},signal));return JSON.stringify(rows.map(row=>{const id=randomUUID();apps.set(id,row);return {id,name:row.name};}),null,2);}
   case 'CloseApp':{const app=apps.get(action.id)!;await (deps.native??nativeControl)({op:'close',pid:app.pid,stamp:app.stamp},signal);apps.delete(action.id);return 'Graceful close requested. The app may ask you to save or remain open.';}
   case 'LaunchApp':await (deps.native??nativeControl)({op:'launch',app:action.app},signal);return `Launch requested: ${action.app}.`;
   case 'Music':await (deps.native??nativeControl)({op:'music',operation:action.operation,...action.value!==undefined?{value:action.value}:{}},signal);return `Media control accepted: ${action.operation}.`;
   case 'Point':deps.point(runId,action.x,action.y,action.label);return 'Guide queued for the current monitor. It waits for signature animations and expires after five seconds.';
   case 'StartThread':case 'SteerThread':return (deps.t3??sendOperation)(deps.auth()!,action,{commandId:randomUUID(),threadId:action.tag==='SteerThread'?action.threadId:randomUUID(),messageId:randomUUID()},signal);
   default:{const exhaustive:never=action;return exhaustive;}
  }
 }};
}
