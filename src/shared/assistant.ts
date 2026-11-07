import {z} from 'zod';
import type {Action,Message} from '../core/assistant/model';
const short=z.string().trim().min(1).max(200),id=z.string().min(1).max(512),body=z.string().min(1).max(16000);
export const assistantAction:z.ZodType<Action>=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Note'),title:short,text:body}).strict(),
 z.object({tag:z.literal('Remember'),text:z.string().min(1).max(2000)}).strict(),
 z.object({tag:z.literal('Reminder'),text:short,minutes:z.number().int().min(1).max(10080)}).strict(),
 z.object({tag:z.literal('CancelReminder'),id}).strict(),
 z.object({tag:z.literal('SearchFiles'),query:short}).strict(),z.object({tag:z.literal('OpenFile'),id}).strict(),
 z.object({tag:z.literal('SearchTranscript'),query:short}).strict(),
 z.object({tag:z.literal('LaunchApp'),app:z.enum(['calculator','notepad'])}).strict(),
 z.object({tag:z.literal('CloseApp'),id}).strict(),z.object({tag:z.literal('ListApps')}).strict(),
 z.object({tag:z.literal('Music'),operation:z.enum(['playPause','next','previous','volume']),value:z.number().int().min(0).max(100).optional()}).strict().refine(v=>v.operation==='volume'?v.value!==undefined:v.value===undefined),
 z.object({tag:z.literal('Point'),x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1),label:short}).strict(),
 z.object({tag:z.literal('StartThread'),projectId:id,provider:short,model:short,title:short,prompt:body}).strict(),
 z.object({tag:z.literal('SteerThread'),threadId:id,runId:id,provider:short,projectId:id,text:body}).strict(),
]);
export const providerOrigin=z.string().max(2048).transform((text,ctx)=>{
 try{const u=new URL(text);const local=['127.0.0.1','localhost','[::1]'].includes(u.hostname);if((u.protocol!=='https:'&&!(u.protocol==='http:'&&local))||u.username||u.password||u.search||u.hash)throw Error();return u.href.replace(/\/$/,'');}
 catch{ctx.addIssue({code:'custom',message:'Use HTTPS or loopback HTTP without credentials or query parameters'});return z.NEVER;}
});
export const providerConfig=z.object({kind:z.enum(['offline','ollama','compatible']),baseUrl:providerOrigin,model:short,cloudConsent:z.boolean(),smallContext:z.boolean()}).strict().refine(v=>v.kind==='offline'||v.cloudConsent||(['127.0.0.1','localhost','[::1]'].includes(new URL(v.baseUrl).hostname)&&!(v.kind==='ollama'&&/[:-]cloud$/i.test(v.model))),{message:'Confirm cloud disclosure'});
export type ProviderConfig=z.infer<typeof providerConfig>;
export const defaultProvider:ProviderConfig={kind:'offline',baseUrl:'http://127.0.0.1:11434',model:'local',cloudConsent:false,smallContext:true};
export const assistantUi=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Send'),text:body}).strict(),z.object({tag:z.literal('Stop')}).strict(),
 z.object({tag:z.literal('Decide'),runId:z.number().int().positive(),approve:z.boolean()}).strict(),
 z.object({tag:z.literal('Configure'),config:providerConfig,key:z.string().max(4096)}).strict(),
 z.object({tag:z.literal('ForgetProvider')}).strict(),z.object({tag:z.literal('ClearTranscript')}).strict(),
 z.object({tag:z.literal('ChooseSearchFolder')}).strict(),
 z.object({tag:z.literal('PairOperations'),baseUrl:z.string().max(2048),credential:z.string().min(1).max(4096)}).strict(),
 z.object({tag:z.literal('ForgetOperations')}).strict(),
]);
export type AssistantView={phase:string;runId:number;messages:readonly Message[];draft:string;pending:Action|null;pendingDescription:string;canApprove:boolean;reminderAlerts:string[];result:string;warning:string;config:ProviderConfig;hasKey:boolean;context:{name:string;source:string;reason:string|null}[];searchFolder:string|null;operationsPaired:boolean;reminders:{id:string;text:string;due:number}[];targets:{projects:{id:string;title:string}[];threads:{id:string;title:string;provider:string;projectId:string;runId:string|null}[]}};
export interface AssistantHost{view():Promise<AssistantView>;act(value:unknown):Promise<void>;onView(listener:(view:AssistantView)=>void):()=>void}
