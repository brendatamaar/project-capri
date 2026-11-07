import {visual} from '../../core/fun/visual';import type {Settings} from '../../core/companion';import type {FunEvent} from '../../shared/fun';
export function installFun(capri:any,canvas:HTMLCanvasElement,root:HTMLElement,send:(v:unknown)=>void,reduced:()=>boolean){
 let settings:Settings,frame:FunEvent={tag:'fun',eligible:false,chaosUntil:0,caption:''},playing=false,cursor={x:0,y:0,inside:false},last=0;
 const caption=document.createElement('div');caption.id='fun-caption';caption.hidden=true;document.body.append(caption);
 const clones=Array.from({length:2},()=>{const c=document.createElement('canvas');c.className='fun-clone';c.hidden=true;document.body.append(c);return c;});
 const eligible=()=>Boolean(frame.eligible&&!capri.hidden&&!capri.stowed&&!capri.dormant&&!capri.busy&&!capri.act&&!capri.dragging&&!capri.pointing&&!capri.suspended&&capri.mode!=='sleep'&&['stand','sit'].includes(capri.stance));
 const sample=()=>visual({eligible:eligible()&&Boolean(settings)&&!settings.quiet,reduced:reduced(),settings,now:Date.now(),chaosUntil:frame.chaosUntil,playing});
 const clear=()=>{caption.hidden=true;clones.forEach(c=>{c.hidden=true;const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height);});};
 const pose=capri.onPose;capri.onPose=(p:any,now:number)=>{pose?.(p,now);if(!settings)return;const v=sample(),dt=Math.max(0,Math.min(0.05,(now-last)/1000));last=now;
  if(v.ride||v.dance)capri.motionActive=true;
  if(v.ride&&cursor.inside){if(capri.stance==='sit')capri.setStance('stand');const factor=1-Math.exp(-12*dt);capri.pos.x+=(Math.max(70,Math.min(innerWidth-70,cursor.x+75))-capri.pos.x)*factor;capri.pos.y+=(Math.max(240*capri.scale,Math.min(innerHeight-20,cursor.y+60))-capri.pos.y)*factor;}
  if(v.dance){p.head+=Math.sin(now/240)*4;p.armL+=Math.sin(now/240)*8;p.armR-=Math.sin(now/240)*8;capri.bob+=Math.sin(now/120)*2;}
  if(v.chaos){p.head+=Math.sin(now/90)*3;p.mane+=Math.sin(now/110)*0.1;}
 };
 const move=capri.onMove;capri.onMove=(head:unknown)=>{move?.(head);if(!settings)return;const v=sample();caption.textContent=frame.caption;caption.hidden=!eligible()||settings.quiet||!frame.caption;
  const rect=root.getBoundingClientRect();clones.forEach((c,index)=>{c.hidden=index>=v.clones;if(c.hidden)return;if(c.width!==canvas.width)c.width=canvas.width;if(c.height!==canvas.height)c.height=canvas.height;c.getContext('2d')?.drawImage(canvas,0,0);const offset=(index?1:-1)*(v.chaos?100:65);c.style.width=rect.width+'px';c.style.height=rect.height+'px';c.style.left=Math.max(0,Math.min(innerWidth-rect.width,rect.left+offset))+'px';c.style.top=Math.max(0,Math.min(innerHeight-rect.height,rect.top+(v.chaos?Math.sin(Date.now()/200+index)*12:8)))+'px';});
 };
 const visibility=capri.onVisibility;capri.onVisibility=(hidden:boolean)=>{visibility?.(hidden);if(hidden)clear();};
 const pet=capri.onPet;capri.onPet=(phase:string)=>{pet?.(phase);if(phase==='start')send({tag:'Pet'});};
 return {inspect:()=>sample(),settings(value:Settings){settings=value;capri.wander=value.wander&&!value.cursorRide&&frame.eligible;clear();},frame(value:FunEvent){frame=value;capri.wander=Boolean(settings?.wander&&!settings.cursorRide&&frame.eligible);if(!value.eligible)clear();},playing(value:boolean){playing=value;},cursor(value:typeof cursor){cursor=value;},pulse(){const ready=!capri.hidden&&!capri.stowed&&!capri.dormant&&!capri.busy&&!capri.act&&!capri.dragging&&!capri.pointing&&!capri.suspended&&capri.mode!=='sleep';send({tag:'Pulse',eligible:ready,reduced:reduced()});if(!ready)clear();},clear};
}
