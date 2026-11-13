// Pure adaptation of TheAgencyMGE's MIT clip sampling algorithm.
import type { Clip } from '../../renderer/overlay/motion/clips';
import type { Params } from '../../renderer/overlay/motion/params';
// Fields only a live face can show; a clip using nothing else is invisible without a faceAnchor.
const FACE_FIELDS = new Set(['gazeX', 'gazeY', 'blinkL', 'blinkR', 'eyeWide', 'squint', 'mouthOpen', 'mouthSmile', 'manyEyes', 'sleep', 'happyEyes', 'blankEyes']);
export function isFaceOnlyClip(clip: Clip): boolean {
  const fields = clip.keys.flatMap(key => Object.keys(key.pose));
  return fields.length > 0 && fields.every(field => FACE_FIELDS.has(field));
}
/** Clips she may start on her own: idle-tagged, and visible on the current pack. */
export function autonomousClips(clips: readonly Clip[], hasFace: boolean): Clip[] {
  return clips.filter(clip => clip.tags.includes('idle') && (hasFace || !isFaceOnlyClip(clip)));
}
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
    // Float's neutral is 0.4, not zero. Scale deviation, not the resting value.
    const neutral=name==='float'?0.4:0;
    const av=a.pose[name]??neutral,bv=b.pose[name]??neutral;
    result[name]=neutral+((av-neutral)+(bv-av)*s)*amplitude;
  }
  return result;
}
