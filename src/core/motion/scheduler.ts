export interface Candidate { readonly name: string; readonly duration: number; readonly subtle: boolean }
type Active = { readonly name: string; readonly runId: number; readonly startedAt: number; readonly endsAt: number; readonly recent: readonly string[] };
export type MotionState = { readonly tag: 'Waiting'; readonly nextAt: number; readonly recent: readonly string[] }
  | ({ readonly tag: 'Playing' } & Active) | ({ readonly tag: 'Fading'; readonly until: number } & Active);
export type MotionInput = { readonly tag: 'Pulse'; readonly now: number; readonly runId: number; readonly choice: number; readonly eligible: boolean; readonly quiet: boolean; readonly candidates: readonly Candidate[] }
  | { readonly tag: 'Stop'; readonly now: number }
  | { readonly tag: 'Ended'; readonly runId: number; readonly now: number };
export type MotionCommand = { readonly tag: 'ScheduleEnd'; readonly runId: number; readonly afterMs: number };
export function stepMotion(state: MotionState,input: MotionInput): {state:MotionState;commands:MotionCommand[]} {
  const unchanged={state,commands:[]};
  switch(input.tag) {
    case 'Stop':
      return state.tag!=='Playing'?unchanged:{state:{...state,tag:'Fading',until:input.now+120},commands:[{tag:'ScheduleEnd',runId:state.runId,afterMs:120}]};
    case 'Ended':
      return state.tag==='Waiting'||state.runId!==input.runId?unchanged:{state:{tag:'Waiting',recent:state.recent,nextAt:input.now+5000},commands:[]};
    case 'Pulse': {
      if(state.tag!=='Waiting') {
        if(input.now>=state.endsAt || (state.tag==='Fading'&&input.now>=state.until)) return {state:{tag:'Waiting',recent:state.recent,nextAt:input.now+5000},commands:[]};
        if(!input.eligible || (input.quiet&&!input.candidates.find(c=>c.name===state.name)?.subtle)) return stepMotion(state,{tag:'Stop',now:input.now});
        return unchanged;
      }
      if(!input.eligible || input.now<state.nextAt) return unchanged;
      const eligible=input.candidates.filter(c=>(!input.quiet||c.subtle)&&!state.recent.includes(c.name));
      const candidates=eligible.length?eligible:input.candidates.filter(c=>!input.quiet||c.subtle);
      if(!candidates.length) return unchanged;
      const clip=candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(0.999,input.choice))*candidates.length))];
      return {state:{tag:'Playing',name:clip.name,runId:input.runId,startedAt:input.now,endsAt:input.now+clip.duration*1000,recent:[...state.recent,clip.name].slice(-3)},commands:[]};
    }
  }
  const exhaustive:never=input;return exhaustive;
}
