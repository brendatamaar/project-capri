import {z} from 'zod';
import {providerOrigin} from './assistant';
const local=(url:string)=>['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname);
export const mediaConfig=z.object({mode:z.enum(['typed','local','custom','cloud']),tts:providerOrigin,stt:providerOrigin,voice:z.string().trim().min(1).max(200),ttsModel:z.string().trim().min(1).max(200),sttModel:z.string().trim().min(1).max(200),consent:z.boolean(),wake:z.boolean(),phrase:z.string().trim().min(2).max(80),display:z.string().max(100)}).strict().refine(c=>c.mode==='typed'||((c.mode!=='local'||(local(c.tts)&&local(c.stt)))&&((local(c.tts)&&local(c.stt))||c.consent)),{message:'Local mode requires loopback; remote audio requires consent'});
export type MediaConfig=z.infer<typeof mediaConfig>;
export const defaults:MediaConfig={mode:'typed',tts:'http://127.0.0.1:8880/v1',stt:'http://127.0.0.1:8000/v1',voice:'af_heart',ttsModel:'kokoro',sttModel:'parakeet',consent:false,wake:false,phrase:'hey companion',display:''};
export const mediaUi=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Configure'),config:mediaConfig,key:z.string().max(4096)}).strict(),
 z.object({tag:z.literal('Stop')}).strict(),
 z.object({tag:z.literal('Listen')}).strict(),
 z.object({tag:z.literal('Look')}).strict(),
 z.object({tag:z.literal('Speak')}).strict(),
 z.object({tag:z.literal('Analyze')}).strict(),
 z.object({tag:z.literal('Watch'),enabled:z.boolean()}).strict(),
 z.object({tag:z.literal('Audio'),runId:z.number().int().positive(),samples:z.array(z.number().int().min(-32768).max(32767)).min(1).max(16000*30)}).strict(),
 z.object({tag:z.literal('Level'),runId:z.number().int().positive(),level:z.number().finite().min(0).max(1)}).strict(),
 z.object({tag:z.literal('Ended'),runId:z.number().int().positive()}).strict(),
]);
export type MediaView={config:MediaConfig;phase:string;runId:number|null;watching:boolean;review:string;image:string;warning:string;displays:{id:string;label:string}[]};
export type MediaEvent={tag:'Record';runId:number;wake:boolean}|{tag:'Play';runId:number;audio:Uint8Array}|{tag:'Cancel'};
export interface MediaHost{view():Promise<MediaView>;act(value:unknown):Promise<void>;onView(fn:(v:MediaView)=>void):()=>void;onEvent(fn:(v:MediaEvent)=>void):()=>void}
