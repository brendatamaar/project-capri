import type {Settings} from './step';
export function visual(input:{eligible:boolean;reduced:boolean;settings:Settings;now:number;chaosUntil:number;playing:boolean}){
 const active=input.eligible&&!input.reduced;
 return {ride:active&&input.settings.cursorRide,dance:active&&input.settings.dance&&input.playing,clones:active&&input.settings.clones?2:0,chaos:active&&input.settings.chaos&&input.now<input.chaosUntil};
}
