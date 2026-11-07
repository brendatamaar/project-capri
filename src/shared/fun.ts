import {z} from 'zod';import type {State as FunState,Settings as FunSettings} from '../core/fun/step';
export const jobStep=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Move'),x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1)}).strict(),
 z.object({tag:z.literal('Click'),x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1)}).strict(),
 z.object({tag:z.literal('Key'),key:z.enum(['Left','Right','Up','Down','Tab','Escape','Home','End'])}).strict(),
]);
export type JobStep=z.infer<typeof jobStep>;
export const jobTarget=z.object({pid:z.number().int().positive(),stamp:z.string().regex(/^\d{1,30}$/),hwnd:z.string().regex(/^\d{1,30}$/),name:z.enum(['notepad','calculator','calculatorapp']),x:z.number().int(),y:z.number().int(),w:z.number().int().positive(),h:z.number().int().positive()}).strict();
export type JobTarget=z.infer<typeof jobTarget>;
export const funSettings=z.object({bond:z.boolean(),jealousy:z.boolean(),checkins:z.boolean(),cursorRide:z.boolean(),miniPlayer:z.boolean(),dance:z.boolean(),clones:z.boolean(),chaos:z.boolean()}).strict();
export const funUi=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Configure'),settings:funSettings}).strict(),
 z.object({tag:z.literal('ResetBond')}).strict(),z.object({tag:z.literal('StopFun')}).strict(),
 z.object({tag:z.literal('Signal'),kind:z.enum(['Rival','Insult','Apology'])}).strict(),
 z.object({tag:z.literal('Music'),operation:z.enum(['playPause','next','previous'])}).strict(),
]);
export type FunView={settings:FunSettings;xp:number;stage:number;mood:FunState['mood'];warning:string;jobStopReady:boolean;targets:{id:string;name:string;pid:number}[];music:{title:string;artist:string;playing:boolean}|null};
export type FunEvent={tag:'fun';eligible:boolean;chaosUntil:number;caption:string};
export const overlayFun=z.discriminatedUnion('tag',[
 z.object({tag:z.literal('Pulse'),eligible:z.boolean(),reduced:z.boolean()}).strict(),
 z.object({tag:z.enum(['Click','Pet'])}).strict(),
]);

export interface FunHost{view():Promise<FunView>;act(value:unknown):Promise<void>;onView(fn:(view:FunView)=>void):()=>void}
