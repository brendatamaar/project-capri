import {visual} from '../../core/fun/visual';import type {Settings} from '../../core/companion';import type {FunEvent} from '../../shared/fun';
import {samplePlayfulMotion} from '../../core/motion/playful';
export function installFun(capri:any,canvas:HTMLCanvasElement,root:HTMLElement,send:(v:unknown)=>void,reduced:()=>boolean){
 let settings:Settings,frame:FunEvent={tag:'fun',eligible:false,chaosUntil:0,caption:''},playing=false,shown='',cursor={x:0,y:0,inside:false},last=0,danceWeight=0,chaosWeight=0;
 const caption=document.createElement('div');caption.id='fun-caption';caption.hidden=true;document.body.append(caption);
 const clones=Array.from({length:2},()=>{const c=document.createElement('canvas');c.className='fun-clone';c.hidden=true;document.body.append(c);return c;});
 const eligible=()=>Boolean(frame.eligible&&!capri.hidden&&!capri.stowed&&!capri.dormant&&!capri.busy&&!capri.act&&!capri.dragging&&!capri.pointing&&!capri.suspended&&capri.mode!=='sleep'&&['stand','sit'].includes(capri.stance));
 const sample=()=>visual({eligible:eligible()&&Boolean(settings)&&!settings.quiet,reduced:reduced(),settings,now:Date.now(),chaosUntil:frame.chaosUntil,playing});
 const clear=()=>{caption.hidden=true;clones.forEach(c=>{c.hidden=true;const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height);});};
 const pose=capri.onPose;capri.onPose=(p:any,now:number)=>{pose?.(p,now);if(!settings)return;const v=sample(),dt=Math.max(0,Math.min(0.05,(now-last)/1000));last=now;
  const allowed=eligible()&&!settings.quiet&&!reduced();
  const ease=1-Math.exp(-10*dt);
  danceWeight=allowed?danceWeight+((v.dance?1:0)-danceWeight)*ease:0;
  chaosWeight=allowed?chaosWeight+((v.chaos?1:0)-chaosWeight)*ease:0;
  if(danceWeight<0.001&&!v.dance)danceWeight=0;
  if(chaosWeight<0.001&&!v.chaos)chaosWeight=0;
  if(v.ride||danceWeight||chaosWeight)capri.motionActive=true;
  if(v.ride&&cursor.inside){if(capri.stance==='sit')capri.setStance('stand');const factor=1-Math.exp(-12*dt);capri.pos.x+=(Math.max(70,Math.min(innerWidth-70,cursor.x+75))-capri.pos.x)*factor;capri.pos.y+=(Math.max(240*capri.scale,Math.min(innerHeight-20,cursor.y+60))-capri.pos.y)*factor;}
  const playful=samplePlayfulMotion(now,danceWeight,chaosWeight);
  p.head+=playful.head;p.armL+=playful.armL;p.armR+=playful.armR;p.elbowL+=playful.elbowL;p.elbowR+=playful.elbowR;p.waist+=playful.waist;p.hipX+=playful.hipX;p.crouch+=playful.crouch;p.mane+=playful.mane;
  capri.bob+=playful.bob;capri.tilt+=playful.tilt;
 };
 const move=capri.onMove;capri.onMove=(head:unknown)=>{move?.(head);if(!settings)return;const v=sample();if(frame.caption!==shown)caption.textContent=shown=frame.caption;const hideCaption=!eligible()||settings.quiet||!frame.caption;if(hideCaption!==caption.hidden)caption.hidden=hideCaption;
  // Avoid getBoundingClientRect here: it forced layout on every frame while clones were out.
  const placed=capri.placedAt??{left:0,top:0},width=canvas.clientWidth,height=canvas.clientHeight;clones.forEach((c,index)=>{c.hidden=index>=v.clones;if(c.hidden)return;if(c.width!==canvas.width)c.width=canvas.width;if(c.height!==canvas.height)c.height=canvas.height;if(capri.drewSprite){const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height);ctx?.drawImage(canvas,0,0);}const offset=(index?1:-1)*(v.chaos?100:65);c.style.width=width+'px';c.style.height=height+'px';c.style.left=Math.max(0,Math.min(innerWidth-width,placed.left+offset))+'px';c.style.top=Math.max(0,Math.min(innerHeight-height,placed.top+(v.chaos?Math.sin(Date.now()/200+index)*12:8)))+'px';});
 };
 const visibility=capri.onVisibility;capri.onVisibility=(hidden:boolean)=>{visibility?.(hidden);if(hidden)clear();};
 const pet=capri.onPet;capri.onPet=(phase:string)=>{pet?.(phase);if(phase==='start')send({tag:'Pet'});};
 return {inspect:()=>sample(),settings(value:Settings){settings=value;capri.wander=value.wander&&!value.cursorRide&&frame.eligible;clear();},frame(value:FunEvent){frame=value;capri.wander=Boolean(settings?.wander&&!settings.cursorRide&&frame.eligible);if(!value.eligible)clear();},playing(value:boolean){playing=value;},cursor(value:typeof cursor){cursor=value;},pulse(){const ready=!capri.hidden&&!capri.stowed&&!capri.dormant&&!capri.busy&&!capri.act&&!capri.dragging&&!capri.pointing&&!capri.suspended&&capri.mode!=='sleep';send({tag:'Pulse',eligible:ready,reduced:reduced()});if(!ready)clear();},clear};
}
