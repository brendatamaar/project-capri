import { CLIPS } from './clips';
import { sampleClip } from '../../../core/motion/clip';
import { mapPose, ZERO_POSE } from '../../../core/motion/pose-map';
import { mixPose } from '../../../core/motion/mixer';
import { stepMotion, type MotionState, type MotionInput } from '../../../core/motion/scheduler';
import type { ArtDescriptor } from '../../../shared/art';
import type { Params } from './params';
// Narrow adapter over retained JS; all scheduler and pose decisions live in the pure core.
export function installMotion(capri: any, pack: ArtDescriptor) {
  let state: MotionState={tag:'Waiting',nextAt:performance.now()+5000,recent:[]};
  let runId=0, quiet=false, waiting: (()=>void)[]=[];
  const candidates=CLIPS.filter(clip=>clip.source==='interpretation').map(clip=>({name:clip.name,duration:clip.duration,subtle:clip.tags.includes('subtle')}));
  const dispatch=(input: MotionInput)=>{
    const result=stepMotion(state,input);state=result.state;
    if(state.tag==='Waiting') { capri.motionActive=false;const done=waiting;waiting=[];done.forEach(resolve=>resolve()); }
    for(const command of result.commands) setTimeout(()=>dispatch({tag:'Ended',runId:command.runId,now:performance.now()}),command.afterMs);
  };
  capri.beforeAct=()=>{
    if(state.tag==='Waiting') { capri.motionActive=false; return Promise.resolve(); }
    dispatch({tag:'Stop',now:performance.now()});
    return new Promise<void>(resolve=>waiting.push(resolve));
  };
  let face: HTMLCanvasElement | undefined;
  let facePose: Partial<Params> = {};
  if(pack.faceAnchor) {
    face=document.createElement('canvas');face.dataset.liveFace='true';face.style.cssText='position:fixed;left:0;top:0;pointer-events:none;transform-origin:center;';document.body.append(face);
  }
  capri.onVisibility=(hidden: boolean)=>{if(face)face.hidden=hidden;};
  const original=capri.onMove;
  capri.onMove=(head: unknown)=>{ original?.(head);if(face)drawFace(face,capri,pack.faceAnchor!,facePose); };
  capri.onPose=(p: any,now: number)=>{
    const signature=Boolean(capri.act||capri.busy||capri.dragging||!['stand','sit'].includes(capri.stance));
    dispatch({tag:'Pulse',now,runId:++runId,choice:Math.random(),eligible:!signature&&!capri.stowed&&!capri.dormant&&capri.mode!=='sleep',quiet,candidates});
    if(state.tag==='Waiting') { facePose={};return; }
    const name=state.name;
    const clip=CLIPS.find(clip=>clip.name===name);
    if(!clip)return;
    capri.motionActive=true;
    const elapsed=(now-state.startedAt)/1000;
    const envelope=Math.min(1,elapsed/0.2,(clip.duration-elapsed)/0.2)*(state.tag==='Fading'?Math.max(0,(state.until-now)/120):1);
    const sampled=sampleClip(clip,elapsed,state.runId);
    facePose=sampled;
    const mapped=mapPose(sampled);
    const mixed=mixPose({...ZERO_POSE,...p,bob:capri.bob,tilt:capri.tilt},mapped,envelope,signature);
    for(const key of ['head','mane','hair','armL','armR','kickL','kickR','glitch'])p[key]=mixed[key as keyof typeof mixed];
    capri.bob=mixed.bob;capri.tilt=mixed.tilt;
  };
  return { setQuiet(value: boolean) {quiet=value;}, pause() {dispatch({tag:'Stop',now:performance.now()});} };
}
function drawFace(canvas: HTMLCanvasElement,capri: any,anchor: NonNullable<ArtDescriptor['faceAnchor']>,params: Partial<Params>) {
  canvas.hidden=capri.hidden||capri.stowed||capri.dormant||capri.p.alpha<0.5||capri.busy;
  if(canvas.hidden)return;
  const scale=capri.scale, dpr=devicePixelRatio||1;
  const width=anchor.width*scale,height=anchor.height*scale;
  canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
  const cx=anchor.x+anchor.width/2,cy=anchor.y+anchor.height/2;
  const angle=capri.p.head,dx=cx-118,dy=cy-152;
  const center=capri.screenPoint(118+dx*Math.cos(angle)-dy*Math.sin(angle),152+dx*Math.sin(angle)+dy*Math.cos(angle));
  canvas.style.transform=`translate(${center.x-width/2}px,${center.y-height/2}px) rotate(${capri.turn+angle*180/Math.PI*capri.facing}deg) scaleX(${capri.facing})`;
  const ctx=canvas.getContext('2d')!;ctx.scale(dpr,dpr);
  ctx.fillStyle=anchor.background;ctx.fillRect(0,0,width,height);
  const blink=(performance.now()%4200)<150;
  const gazeX=Math.max(-1,Math.min(1,params.gazeX??((capri.mouse?.x??center.x)-center.x)/300));
  const gazeY=Math.max(-1,Math.min(1,params.gazeY??((capri.mouse?.y??center.y)-center.y)/300));
  ctx.fillStyle='#a7e7d7';
  for(const [index,x] of [0.3,0.7].entries()) {
    const closed=blink||((index===0?params.blinkL:params.blinkR)??0)>0.5;
    const eyeHeight=closed?1:Math.max(2,height*(0.15+(params.eyeWide??0)*0.05-(params.squint??0)*0.09));
    ctx.beginPath();ctx.ellipse(width*x+gazeX*width*0.04,height*0.4+gazeY*height*0.04,width*0.07,eyeHeight,0,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle='#daa84b';ctx.lineWidth=Math.max(1,scale*2);ctx.beginPath();ctx.moveTo(width*0.35,height*0.72);
  if(capri.audioLevel>0.02){ctx.ellipse(width*0.5,height*0.73,width*0.12,height*(0.02+capri.audioLevel*0.12),0,0,Math.PI*2);ctx.fill();return;}
  ctx.quadraticCurveTo(width*0.5,height*(0.72+(params.mouthSmile??0.2)*0.15),width*0.65,height*0.72);ctx.stroke();
}
