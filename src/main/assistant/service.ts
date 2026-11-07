import {randomUUID} from 'node:crypto';
import {initial,type State,type Input,type Action} from '../../core/assistant/model';import {step} from '../../core/assistant/step';
import type {AssistantContext} from './context';import {offline} from './offline';import {ProviderFailure,streamProvider} from './provider';
import type {ProviderSettings,providerStore} from './config';import {defaultProvider,assistantAction} from '../../shared/assistant';
export function assistantService(deps:{store:ReturnType<typeof providerStore>;context:()=>Promise<AssistantContext>;execute:(action:Action,runId:number,signal:AbortSignal)=>Promise<string>;policy:(action:Action)=>string|null;render:()=>void;save:(id:string,user:string,assistant:string)=>void;audit:(id:string,approve:boolean)=>void;cancelPoint:()=>void;provider?:typeof streamProvider}){
 let state=initial(),settings:ProviderSettings={config:defaultProvider,key:''},warning='',counter=0,epoch=0,stopped=false;
 const session=randomUUID(),timers=new Map<string,ReturnType<typeof setTimeout>>();let controller:AbortController|null=null;
 function abort(){controller?.abort();controller=null;for(const timer of timers.values())clearTimeout(timer);timers.clear();}
 function dispatch(input:Input){
  if(stopped)return;if(input.tag==='Stop'||input.tag==='Clear'||(input.tag==='Ui'&&(!input.visible||input.blocked)))deps.cancelPoint();const result=step(state,input);state=result.state;deps.render();
  for(const command of result.commands){
   switch(command.tag){
    case 'Abort':abort();break;
    case 'Schedule':{clearTimeout(timers.get(command.key));const timer=setTimeout(()=>{timers.delete(command.key);dispatch(command.input);},command.delay);timers.set(command.key,timer);break;}
    case 'Generate':{
     const active=new AbortController();controller=active;let proposal:Action|null=null;
     void deps.context().then(context=>{
      active.signal.throwIfAborted();
      return (deps.provider??streamProvider)(settings.config,settings.key,context,command.messages,event=>{
       if(active.signal.aborted)return;
       if(event.tag==='Text')dispatch({tag:'Chunk',runId:command.runId,attempt:command.attempt,text:event.text});
       else proposal=assistantAction.parse(event.action);
      },active.signal);
     }).then(()=>{
      if(active.signal.aborted)return;
      if(proposal){const blocked=deps.policy(proposal);if(blocked){warning='Proposal blocked: '+blocked;proposal=null;}}
      dispatch({tag:'Completed',runId:command.runId,attempt:command.attempt,action:proposal});
     }).catch(error=>{if(!active.signal.aborted)dispatch({tag:'Failed',runId:command.runId,attempt:command.attempt,transient:error instanceof ProviderFailure&&error.transient});});break;
    }
    case 'Execute':{
     if(state.phase!=='Executing')break;
     const active=new AbortController();controller=active;
     void deps.execute(command.action,command.runId,active.signal).then(text=>{if(!active.signal.aborted)dispatch({tag:'ActionFinished',runId:command.runId,text});}).catch(error=>{if(!active.signal.aborted)dispatch({tag:'ActionFinished',runId:command.runId,text:command.action.tag==='StartThread'||command.action.tag==='SteerThread'?'T3 outcome may be unknown. Open T3Code before trying again. No retry was sent.':'Action failed or its outcome is unknown. Inspect the result before trying again. Nothing was retried.'});});break;
    }
    case 'SaveExchange':try{deps.save(`${session}:${command.runId}`,command.user,command.assistant);}catch{warning='Transcript could not be saved.';}break;
    case 'AuditDecision':try{deps.audit(`${session}:${command.runId}`,command.approve);}catch{warning='Action decision audit could not be saved.';if(command.approve)dispatch({tag:'ActionFinished',runId:command.runId,text:'Action blocked because the decision audit could not be saved.'});}break;
    default:{const exhaustive:never=command;return exhaustive;}
   }
  }
  deps.render();
 }
 return {
  state:():State=>state,settings:()=>settings,warning:()=>warning,setWarning:(message:string)=>{warning=message;deps.render();},dispatch,
  async start(){settings=await deps.store.load();deps.render();},
  submit(text:string){if(!state.visible||state.blocked||state.phase!=='Idle')return;warning='';const runId=++counter;
   if(settings.config.kind==='offline'||text.trim().startsWith('/')){const parsed=offline(text);const blocked=parsed.action?deps.policy(parsed.action):null;dispatch({tag:'Offline',runId,text,action:blocked?null:parsed.action,reply:blocked?'Action blocked: '+blocked:parsed.reply});}
   else dispatch({tag:'Submit',runId,text});
  },
  async configure(value:ProviderSettings){const current=++epoch;dispatch({tag:'Stop'});settings=value;deps.render();try{const saved=await deps.store.save(value);if(stopped||current!==epoch)return;warning=saved?'':'Encryption unavailable: provider settings/key are memory-only until exit.';}catch{if(stopped||current!==epoch)return;warning='Provider settings are active in memory, but could not be saved. Older saved settings may remain on disk.';}deps.render();},
  async forget(){const current=++epoch;dispatch({tag:'Stop'});settings={config:defaultProvider,key:''};deps.render();try{await deps.store.clear();if(stopped||current!==epoch)return;warning='';}catch{if(stopped||current!==epoch)return;warning='Provider disabled in memory, but its saved file could not be deleted. Remove it before restarting.';}deps.render();},
  stop(){stopped=true;++epoch;abort();deps.cancelPoint();settings={config:defaultProvider,key:''};},
 };
}
