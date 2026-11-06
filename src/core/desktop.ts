export type FollowState = {readonly tag:'Here'} | {readonly tag:'Elsewhere';readonly display:number;readonly count:number};
export type FollowInput = {readonly tag:'Pointer';readonly current:number;readonly display:number;readonly enabled:boolean;readonly eligible:boolean};
export type FollowCommand = {readonly tag:'FollowDisplay';readonly display:number};
export function stepFollow(state:FollowState,input:FollowInput):{state:FollowState;commands:FollowCommand[]} {
  if(!input.enabled||!input.eligible||input.current===input.display)return {state:{tag:'Here'},commands:[]};
  const count=state.tag==='Elsewhere'&&state.display===input.display?state.count+1:1;
  return count>=2?{state:{tag:'Here'},commands:[{tag:'FollowDisplay',display:input.display}]}:{state:{tag:'Elsewhere',display:input.display,count},commands:[]};
}
export interface DisplayRect {readonly id:number;readonly x:number;readonly y:number;readonly w:number;readonly h:number}
export function neighbor(displays:readonly DisplayRect[],current:number,side:number,y:number):DisplayRect|undefined {
  const here=displays.find(display=>display.id===current);if(!here)return;
  return displays.find(display=>display.id!==current&&y>=display.y&&y<display.y+display.h&&(side>0?Math.abs(display.x-here.x-here.w)<=2:Math.abs(display.x+display.w-here.x)<=2));
}
export interface Machine {readonly cpu:number;readonly battery:boolean;readonly online:boolean;readonly devices:number;readonly game:boolean}
export type ReactionState = {readonly tag:'Watching';readonly previous:Machine|null;readonly nextAt:number};
export type ReactionInput = {readonly tag:'Observed';readonly now:number;readonly machine:Machine;readonly enabled:boolean;readonly quiet:boolean;readonly eligible:boolean};
export type ReactionCommand = {readonly tag:'React';readonly action:'overheat'|'curious'|'flinch'};
export function stepReaction(state:ReactionState,input:ReactionInput):{state:ReactionState;commands:ReactionCommand[]} {
  const prior=state.previous, next={...state,previous:input.machine};
  if(!prior||!input.enabled||input.quiet||!input.eligible||input.now<state.nextAt)return {state:next,commands:[]};
  const changed=prior.battery!==input.machine.battery||prior.online!==input.machine.online||prior.devices!==input.machine.devices||prior.game!==input.machine.game;
  const hot=input.machine.cpu>=85&&prior.cpu<85;
  if(!changed&&!hot)return {state:next,commands:[]};
  return {state:{...next,nextAt:input.now+60000},commands:[{tag:'React',action:hot?'overheat':input.machine.online?'curious':'flinch'}]};
}
