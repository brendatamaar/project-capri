import type { SpritePose } from './pose-map';
export const clipWeight=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
/** How much of a clip shows `elapsed` seconds in: eased in and out over `fade` seconds, so it never starts or stops at full speed. */
export function clipEnvelope(elapsed:number,duration:number,fade=0.2):number {
  const span=Number.isFinite(fade)&&fade>0?fade:0.2;
  const x=clipWeight(Math.min(elapsed/span,(duration-elapsed)/span));
  return x*x*(3-2*x);
}
export function mixPose(base: SpritePose, clip: SpritePose, weight: number, signature: boolean): SpritePose {
  if(signature) return base;
  const w=clipWeight(weight);
  return Object.fromEntries(Object.keys(base).map(key=>[key,base[key as keyof SpritePose]+clip[key as keyof SpritePose]*w])) as SpritePose;
}
