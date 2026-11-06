// Pure adaptation of TheAgencyMGE's MIT clip sampling algorithm.
import type { Clip } from '../../renderer/overlay/motion/clips';
import type { Params } from '../../renderer/overlay/motion/params';
export function sampleClip(clip: Clip, time: number, seed: number): Partial<Params> {
  if (time <= 0 || time >= clip.duration || !Number.isFinite(time)) return {};
  const u=time/clip.duration, keys=clip.keys;
  let index=0;
  while(index<keys.length-2 && keys[index+1].t<u) index++;
  const a=keys[index],b=keys[Math.min(index+1,keys.length-1)];
  const x=Math.max(0,Math.min(1,(u-a.t)/(b.t-a.t || 1)));
  const eased=clip.ease==='snap'?Math.min(1,x/0.15):x;
  const s=eased*eased*(3-2*eased);
  const amplitude=0.9+((seed>>>0)%1000)/5000;
  const result: Partial<Params>={};
  for(const name of new Set([...Object.keys(a.pose),...Object.keys(b.pose)]) as Set<keyof Params>) {
    const av=a.pose[name]??0,bv=b.pose[name]??0;
    result[name]=(av+(bv-av)*s)*amplitude;
  }
  return result;
}
