import {z} from 'zod';
import type {State} from '../core/agent/model';
export const loopbackOrigin=z.string().max(2048).transform((value,ctx)=>{
  try {const url=new URL(value);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error();return url.origin;}
  catch {ctx.addIssue({code:'custom',message:'Use a loopback HTTP origin'});return z.NEVER;}
});
export const panelAction=z.discriminatedUnion('tag',[
  z.object({tag:z.literal('Pair'),baseUrl:loopbackOrigin,credential:z.string().trim().min(1).max(4096)}).strict(),
  z.object({tag:z.literal('Disconnect')}).strict(),
  z.object({tag:z.literal('OpenThread'),threadId:z.string().min(1).max(512)}).strict(),
  z.object({tag:z.literal('Quiet'),quiet:z.boolean()}).strict(),
]);
// Explicit view prevents future core fields or credentials from leaking through IPC.
export type BoardView={demo:boolean;connection:string;server:string|null;reason:string|null;warning:string|null;sequence:number;presence:string;quiet:boolean;threads:{id:string;project:string;title:string;provider:string;mode:string;phase:string;error:string|null;summary:string|null;pending:{id:string;kind:string;blocking:boolean;text:string|null;reason:string|null;focused:boolean}|null}[];limits:State['limits']};
export interface AgentHost {view():Promise<BoardView>;act(action:unknown):Promise<void>;onView(listener:(view:BoardView)=>void):()=>void}
