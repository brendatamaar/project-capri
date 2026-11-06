import type {Input, State, Command} from '../../core/agent/model';
export type Saved = {baseUrl:string; token:string};
export interface SecureStore {load():Promise<Saved|null>;save(value:Saved):Promise<boolean>;clear():Promise<void>}
export interface AuditLog {append(key:string,outcome:string):Promise<void>}
export interface Scheduler {schedule(key:string,delay:number,callback:()=>void):void;clear():void}
export interface PanelPort {render(state:State,warning:string|null):void}
export interface CharacterPort {reaction(command:Extract<Command,{tag:'Reaction'}>):void;presence(state:State):void}
export interface AgentRpc {
  check(baseUrl:string):Promise<boolean>;
  pair(baseUrl:string,credential:string):Promise<string>;
  connect(baseUrl:string,token:string,attempt:number,afterSequence:number,emit:(input:Input)=>void,signal:AbortSignal):Promise<void>;
  detail(threadId:string,requestId:string):Promise<unknown>;
  open(baseUrl:string,threadId:string):Promise<void>;
}
