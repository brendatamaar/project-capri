import type { SpritePose } from './pose-map';
export const clipWeight=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
export function mixPose(base: SpritePose, clip: SpritePose, weight: number, signature: boolean): SpritePose {
  if(signature) return base;
  const w=clipWeight(weight);
  return Object.fromEntries(Object.keys(base).map(key=>[key,base[key as keyof SpritePose]+clip[key as keyof SpritePose]*w])) as SpritePose;
}
