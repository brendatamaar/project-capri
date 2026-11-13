// Additive rig-space offsets. Time and envelope weights come from the renderer.
// Life while she just stands there, held on threes with her line boil: breathing, a slow weight
// shift, and her head leaning a little toward the pointer. look is -1..1 across her, weight 0..1.
export function sampleIdleLife(now: number, look: number, weight: number) {
  const t=Math.floor((Number.isFinite(now)?now:0)/(1000/8))*(1000/8);
  const on=Number.isFinite(weight)?Math.max(0,Math.min(1,weight)):0;
  const aim=Number.isFinite(look)?Math.max(-1,Math.min(1,look)):0;
  // Breathing in is quicker than breathing out, and the weight shift is two slow waves that never
  // line up the same way twice, so the loop underneath doesn't read as a metronome.
  const phase=t/1250, breath=Math.sin(phase+0.35*Math.sin(phase));
  const drift=Math.sin(t/2300)*0.7+Math.sin(t/5100+1.3)*0.3;
  return {
    head:(Math.sin(t/1700)*0.012+Math.sin(t/4300+2)*0.006+aim*0.05)*on||0,
    hair:Math.sin(t/900)*1.1*on||0,
    tilt:drift*0.8*on||0,
    bob:breath*0.9*on||0,
    waist:Math.sin(t/2300-0.6)*0.022*on||0,
    hipX:drift*1.6*on||0,
    sy:1+breath*0.004*on,
  };
}
export function samplePlayfulMotion(now: number, dance: number, chaos: number) {
  const t=Number.isFinite(now)?now:0;
  const weight=(v:number)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
  const d=weight(dance),c=weight(chaos),beat=t/240;
  const accent=Math.pow(Math.max(0,Math.sin(t/430)),6);
  const clean=(v:number)=>v||0;
  return {
    head:clean(d*Math.sin(beat-0.3)*0.10+c*Math.sin(t/110)*accent*0.16),
    armL:clean(d*(0.2+Math.sin(beat)*0.24)+c*accent*0.12),
    armR:clean(d*(0.2+Math.sin(beat+1.4)*0.24)-c*accent*0.10),
    waist:clean(d*Math.sin(beat+0.5)*0.1+c*Math.sin(t/140)*accent*0.14),
    hipX:clean(d*Math.sin(beat)*7+c*Math.sin(t/120)*accent*6),
    crouch:clean(d*(4+Math.sin(beat*2)*4)),
    elbowL:clean(d*(0.7+Math.sin(beat-0.5)*0.45)+c*accent*0.7),
    elbowR:clean(d*(0.7+Math.sin(beat+0.9)*0.45)-c*accent*0.5),
    mane:clean(d*Math.sin(beat-0.8)*0.035+c*accent*0.10),
    bob:clean(d*Math.sin(beat*2)*2+c*accent*-1.5),
    tilt:clean(d*Math.sin(beat)*2+c*Math.sin(t/180)*accent*2),
  };
}
