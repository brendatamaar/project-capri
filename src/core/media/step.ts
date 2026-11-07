export type State={tag:'Media';eligible:boolean;phase:'Idle'|'Recording'|'Transcribing'|'Capturing'|'Speaking';runId:number|null;watching:boolean};
export type Input={tag:'Ui';eligible:boolean}|{tag:'Listen'|'Look'|'Speak'|'Tick';runId:number}|{tag:'Watch';enabled:boolean}|{tag:'Recorded'|'Done';runId:number}|{tag:'Stop'};
export type Command={tag:'Cancel'}|{tag:'Record'|'Transcribe'|'Capture'|'Play';runId:number};
export const initial=():State=>({tag:'Media',eligible:false,phase:'Idle',runId:null,watching:false});
export function step(state:State,input:Input):{state:State;commands:Command[]}{
 const unchanged={state,commands:[] as Command[]};
 switch(input.tag){
  case 'Stop':return {state:{...state,phase:'Idle',runId:null,watching:false},commands:[{tag:'Cancel'}]};
  case 'Ui':if(!input.eligible)return {state:{...state,eligible:false,phase:'Idle',runId:null,watching:false},commands:[{tag:'Cancel'}]};return {state:{...state,eligible:true},commands:[]};
  case 'Watch':if(!input.enabled)return {state:{...state,watching:false,phase:state.phase==='Capturing'?'Idle':state.phase,runId:state.phase==='Capturing'?null:state.runId},commands:state.phase==='Capturing'?[{tag:'Cancel'}]:[]};return state.eligible?{state:{...state,watching:input.enabled},commands:[]}:unchanged;
  case 'Recorded':return state.phase==='Recording'&&state.runId===input.runId?{state:{...state,phase:'Transcribing'},commands:[{tag:'Transcribe',runId:input.runId}]}:unchanged;
  case 'Done':return state.runId===input.runId?{state:{...state,phase:'Idle',runId:null},commands:[]}:unchanged;
  case 'Listen':case 'Look':case 'Speak':case 'Tick':{
   if(!state.eligible||state.phase!=='Idle'||(input.tag==='Tick'&&!state.watching))return unchanged;
   const phase=input.tag==='Listen'?'Recording':input.tag==='Speak'?'Speaking':'Capturing';const tag=input.tag==='Listen'?'Record':input.tag==='Speak'?'Play':'Capture';
   return {state:{...state,phase,runId:input.runId},commands:[{tag,runId:input.runId}]};
  }
  default:{const exhaustive:never=input;return exhaustive;}
 }
}
