import type { Params } from '../../renderer/overlay/motion/params';
export type SpritePose = { head: number; mane: number; hair: number; armL: number; armR: number; elbowL: number; elbowR: number; waist: number; hipX: number; crouch: number; bob: number; tilt: number; kickL: number; kickR: number; glitch: number };
export const ZERO_POSE: SpritePose={head:0,mane:0,hair:0,armL:0,armR:0,elbowL:0,elbowR:0,waist:0,hipX:0,crouch:0,bob:0,tilt:0,kickL:0,kickR:0,glitch:0};
const bound=(value:number,min:number,max:number)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)) || 0:0;
export function mapPose(p: Partial<Params>): SpritePose {
  return {
    // gaze has no face on packs without a faceAnchor, so it also turns the head a little that way
    head:bound((p.headRoll??0)+(p.headYaw??0)*0.18+(p.headPitch??0)*0.25+(p.gazeX??0)*0.08,-0.5,0.5), mane:bound((p.hairWind??0)*0.25,-0.3,0.3),
    hair:bound((p.hairStream??0)*8,-12,12),
    // a full raise must clear horizontal (-0.85 rest) and reach overhead, matching the exposure sheets
    armL:bound((p.armLRaise??0)*2.3+(p.armSpread??0)*0.85,-1.5,2.5),
    armR:bound((p.armRRaise??0)*2.3+(p.armSpread??0)*0.85+(p.armRWave??0)*0.22,-1.5,2.5),
    // a raised arm softens at the elbow, and the wave swings the forearm rather than the whole arm
    elbowL:bound((p.armLRaise??0)*0.7,-1,2.2),
    elbowR:bound((p.armRRaise??0)*0.7+(p.armRWave??0)*0.75,-1,2.2),
    bob:bound((p.bodyY??0)-(p.float===undefined?0:(p.float-0.4)*6)-(p.breathe??0)*1.5,-12,12),
    tilt:bound(((p.bodyRot??0)+(p.lean??0)*0.5)*180/Math.PI,-12,12),
    waist:bound((p.lean??0)*0.5+(p.bodyRot??0)*0.5,-0.4,0.4),hipX:bound((p.hip??0)*7,-12,12),crouch:bound(p.hipDrop??0,-6,20),
    kickL:bound((p.thighL??0)*Math.PI/180,-0.5,0.5), kickR:bound((p.thighR??0)*Math.PI/180,-0.5,0.5),
    glitch:bound(p.glitch??0,0,0.25),
  };
}
