import {initial,step,type Input} from '../../core/media/step';
import {defaults,mediaUi,type MediaView,type MediaEvent,type MediaConfig} from '../../shared/media';
import {speech,transcribe} from './provider';
export function mediaService(deps:{render:()=>void;event:(e:MediaEvent)=>void;capture:(display:string,signal:AbortSignal)=>Promise<string>;displays:()=>MediaView['displays'];analyze:(image:string,signal:AbortSignal)=>Promise<string>;text:()=>string;quiet:()=>boolean;level:(level:number)=>void;save:(c:MediaConfig,key:string)=>Promise<boolean>}){
 let state=initial(),config={...defaults},key='',counter=0,review='',image='',warning='',controller:AbortController|null=null,samples:number[]=[],wakeActive=false,analyzing=false;const timers=new Set<ReturnType<typeof setTimeout>>();
 function schedule(fn:()=>void,delay:number){const timer=setTimeout(()=>{timers.delete(timer);fn();},delay);timers.add(timer);return timer;}
 function clear(timer:ReturnType<typeof setTimeout>){clearTimeout(timer);timers.delete(timer);}
 function cancel(){for(const timer of timers)clearTimeout(timer);timers.clear();controller?.abort();controller=null;samples=[];wakeActive=false;deps.event({tag:'Cancel'});deps.level(0);}
 function dispatch(input:Input){const r=step(state,input);state=r.state;deps.render();for(const cmd of r.commands){
  if(cmd.tag==='Cancel'){cancel();continue;}
  const active=new AbortController();controller=active;const timeout=schedule(()=>{if(state.runId===cmd.runId){warning='Media operation timed out.';dispatch({tag:'Stop'});}else active.abort();},45000);
  const finish=()=>{clear(timeout);if(!active.signal.aborted){dispatch({tag:'Done',runId:cmd.runId});}};
  if(cmd.tag==='Record'){clear(timeout);schedule(()=>{if(state.phase==='Recording'&&state.runId===cmd.runId)dispatch({tag:'Stop'});},35000);deps.event({tag:'Record',runId:cmd.runId,wake:wakeActive});continue;}
  let task:Promise<void>;
  if(cmd.tag==='Transcribe'){const audio=samples;samples=[];task=transcribe(config,key,audio,active.signal).then(text=>{if(active.signal.aborted)return;if(wakeActive){const index=text.toLowerCase().indexOf(config.phrase.toLowerCase());if(index>=0)review=text.slice(index+config.phrase.length).trim();}else review=text;});}
  else if(cmd.tag==='Capture'&&analyzing){analyzing=false;task=deps.analyze(image,active.signal).then(text=>{if(!active.signal.aborted)review='Untrusted screen description: '+text;});}
  else if(cmd.tag==='Capture')task=deps.capture(config.display,active.signal).then(data=>{if(!active.signal.aborted){image=data;review='Screen captured locally. This image is untrusted content; it has not been sent to a model.';}});
  else task=speech(config,key,deps.text(),active.signal).then(audio=>{if(!active.signal.aborted&&!deps.quiet())deps.event({tag:'Play',runId:cmd.runId,audio:new Uint8Array(audio)});});
  void task.then(()=>{if(active.signal.aborted)return;if(cmd.tag==='Play'){clear(timeout);schedule(()=>{if(state.phase==='Speaking'&&state.runId===cmd.runId)dispatch({tag:'Stop'});},120000);return;}const again=cmd.tag==='Transcribe'&&wakeActive;finish();if(again&&state.eligible&&config.mode!=='typed')dispatch({tag:'Listen',runId:++counter});}).catch(()=>{if(state.runId===cmd.runId){warning='Media operation failed or timed out. Check service settings and permissions.';dispatch({tag:'Stop'});}}).finally(()=>clear(timeout));
 }}
 return {
  view:():MediaView=>({config,phase:state.phase,runId:state.runId,watching:state.watching,review,image,warning,displays:deps.displays()}),state:()=>state,
  ui(eligible:boolean){if(state.eligible!==eligible)dispatch({tag:'Ui',eligible});if(!eligible){image='';review='';}},
  tick(){dispatch({tag:'Tick',runId:++counter});},stop(){dispatch({tag:'Stop'});image='';review='';},
  async act(value:unknown){const parsed=mediaUi.safeParse(value);if(!parsed.success)throw Error('Invalid media action');const a=parsed.data;if(a.tag==='Stop'){dispatch(a);return;}if(!state.eligible)throw Error('Media unavailable');warning='';
   switch(a.tag){
    case 'Configure':dispatch({tag:'Stop'});config=a.config;key=a.key;try{if(!await deps.save(config,key))warning='Media settings and key are memory-only: encryption unavailable.';}catch{warning='Media settings active in memory; saving failed.';}break;
    case 'Level':if(state.phase==='Speaking'&&state.runId===a.runId)deps.level(a.level);break;
    case 'Listen':if(state.phase!=='Idle')return;if(config.mode==='typed')throw Error('Voice disabled');image='';wakeActive=config.wake;dispatch({tag:'Listen',runId:++counter});break;
    case 'Speak':if(config.mode==='typed'||deps.quiet()||!deps.text())throw Error('Speech disabled or no answer');dispatch({tag:'Speak',runId:++counter});break;
    case 'Analyze':{if(!image||state.phase!=='Idle')throw Error('Capture a screen first');analyzing=true;const runId=++counter;dispatch({tag:'Look',runId});break;}
    case 'Look':analyzing=false;image='';dispatch({tag:'Look',runId:++counter});break;
    case 'Watch':dispatch(a);if(a.enabled)dispatch({tag:'Tick',runId:++counter});break;
    case 'Audio':if(state.phase!=='Recording'||state.runId!==a.runId)return;samples=a.samples;dispatch({tag:'Recorded',runId:a.runId});break;
    case 'Ended':if(state.phase==='Speaking'&&state.runId===a.runId){deps.level(0);dispatch({tag:'Done',runId:a.runId});}break;
    default:{const exhaustive:never=a;return exhaustive;}
   }deps.render();
  },load(c:MediaConfig,k:string){config=c;key=k;},
 };
}
