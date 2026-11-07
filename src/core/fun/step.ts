export type Settings={bond:boolean;jealousy:boolean;checkins:boolean;cursorRide:boolean;miniPlayer:boolean;dance:boolean;clones:boolean;chaos:boolean};
export const defaults:Settings={bond:false,jealousy:false,checkins:false,cursorRide:false,miniPlayer:false,dance:false,clones:false,chaos:false};
// Thresholds adapted from the retained mochiiwuff Bond class; no penalties/persona prompts.
export const stage=(xp:number)=>[0,100,300,550,850].filter(threshold=>xp>=threshold).length-1;
export type State={tag:'Fun';settings:Settings;eligible:boolean;quiet:boolean;reduced:boolean;xp:number;day:string;earned:number;mood:'calm'|'happy'|'playful';runId:number|null;nextAt:number};
export type Input={tag:'Configure';settings:Settings}|{tag:'Ui';eligible:boolean;quiet:boolean;reduced:boolean}|{tag:'Click'|'Pet'|'Rival'|'Insult'|'Apology'|'Tick';now:number;day:string;runId:number}|{tag:'Expire';runId:number}|{tag:'Reset'};
export type Command={tag:'Persist';xp:number;day:string;earned:number}|{tag:'Caption';text:string}|{tag:'Chaos';runId:number}|{tag:'Schedule';runId:number;after:number}|{tag:'Clear'};
export const initial=():State=>({tag:'Fun',settings:{...defaults},eligible:false,quiet:false,reduced:false,xp:0,day:'',earned:0,mood:'calm',runId:null,nextAt:0});
export function step(state:State,input:Input):{state:State;commands:Command[]}{
 const none=()=>({state,commands:[] as Command[]});
 switch(input.tag){
  case 'Reset':return {state:{...initial(),settings:state.settings,eligible:state.eligible,quiet:state.quiet,reduced:state.reduced},commands:[{tag:'Persist',xp:0,day:'',earned:0},{tag:'Clear'}]};
  case 'Configure':return {state:{...state,settings:input.settings,mood:'calm',runId:null},commands:[{tag:'Clear'}]};
  case 'Ui':return {state:{...state,eligible:input.eligible,quiet:input.quiet,reduced:input.reduced,...(!input.eligible||input.quiet?{mood:'calm' as const,runId:null}:{})},commands:!input.eligible||input.quiet?[{tag:'Clear'}]:[]};
  case 'Expire':return input.runId===state.runId?{state:{...state,mood:'calm',runId:null},commands:[{tag:'Clear'}]}:none();
  case 'Click':case 'Pet':{
   if(!state.settings.bond||!state.eligible)return none();const earned=state.day===input.day?state.earned:0;const gain=Math.min(input.tag==='Pet'?2:1,30-earned,1000-state.xp);if(gain<=0)return none();
   const next={...state,day:input.day,earned:earned+gain,xp:state.xp+gain,mood:'happy' as const,runId:input.runId};return {state:next,commands:[{tag:'Clear'},{tag:'Persist',xp:next.xp,day:next.day,earned:next.earned},{tag:'Schedule',runId:input.runId,after:15000}]};
  }
  case 'Apology':return state.eligible?{state:{...state,mood:'calm',runId:null},commands:[{tag:'Clear'}]}:none();
  case 'Rival':case 'Insult':case 'Tick':{
   if(!state.eligible||state.quiet||input.now<state.nextAt)return none();
   const allowed=input.tag==='Rival'?state.settings.jealousy:input.tag==='Insult'?state.settings.chaos:state.settings.checkins;if(!allowed)return none();
   const commands:Command[]=[{tag:'Caption',text:input.tag==='Rival'?'More helpers? Nice. I will keep your spot warm.':input.tag==='Insult'?'A tiny bit of theatrical chaos. You can turn it off anytime.':'Want a break? I can stay quiet while you work.'},{tag:'Schedule',runId:input.runId,after:5000}];
   if(input.tag==='Insult'&&state.settings.chaos&&!state.reduced)commands.push({tag:'Chaos',runId:input.runId});
   return {state:{...state,mood:'playful',runId:input.runId,nextAt:input.now+20*60000},commands};
  }
  default:{const exhaustive:never=input;return exhaustive;}
 }
}
