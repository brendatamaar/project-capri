import type { Params } from '../../renderer/overlay/motion/params';
export type SpritePose = { head: number; mane: number; hair: number; armL: number; armR: number; bob: number; tilt: number; kickL: number; kickR: number; glitch: number };
export const ZERO_POSE: SpritePose={head:0,mane:0,hair:0,armL:0,armR:0,bob:0,tilt:0,kickL:0,kickR:0,glitch:0};
const bound=(value:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)) || 0:0;
export function mapPose(p: Partial<Params>): SpritePose {
  return {
    head:bound(p.headRoll??0,-0.5,0.5), mane:bound((p.hairWind??0)*0.25,-0.3,0.3),
    hair:bound((p.hairStream??0)*8,-12,12),
    armL:bound(-(p.armLRaise??0)*1.2-(p.armSpread??0)*0.6,-1.5,1.5),
    armR:bound(-(p.armRRaise??0)*1.2-(p.armSpread??0)*0.6,-1.5,1.5),
    bob:bound((p.bodyY??0)-(p.float===undefined?0:(p.float-0.4)*6),-12,12),
    tilt:bound(((p.bodyRot??0)+(p.lean??0))*180/Math.PI,-12,12),
    kickL:bound((p.thighL??0)*Math.PI/180,-0.5,0.5), kickR:bound((p.thighR??0)*Math.PI/180,-0.5,0.5),
    glitch:bound(p.glitch??0,0,0.25),
  };
}
