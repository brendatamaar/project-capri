import {installFun} from './fun';
import {installAntics} from './antics/antics';
// New companion-only wiring; the upstream app/brain/chat/setup entry is never imported.
// @ts-expect-error Retained character implementation stays JavaScript.
import { Capri } from '../js/capri.js';
// @ts-expect-error Retained effect implementation stays JavaScript.
import { FxLayer } from '../js/fx.js';
// @ts-expect-error Retained synthesized sounds stay JavaScript.
import { Voice } from '../js/voice.js';
// @ts-expect-error Retained motion preference helper stays JavaScript.
import { reducedMotion } from '../js/util.js';
import { loadArtImages } from '../js/art.js';
import { installFace } from './face';
import type { ArtDescriptor } from '../../shared/art';
import type { OverlayHost, OverlayEvent } from '../../shared/overlay';
import type { Settings } from '../../core/companion';
import { installMotion } from './motion/driver';
import { stepFollow,neighbor,stepReaction,type FollowState,type ReactionState } from '../../core/desktop';

declare global { interface Window { companion: OverlayHost; __companionTest?: Record<string, unknown> } }
async function boot() {
  const host = window.companion;
  const response = await fetch('art://pack/manifest.json');
  if (!response.ok) throw new Error('Art pack unavailable');
  const pack: ArtDescriptor = await response.json();
  const art = await loadArtImages(pack, url => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image); image.onerror = reject; image.src = url;
  }));
  const root = document.querySelector<HTMLElement>('#capri')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#sprite')!;
  const fx = new FxLayer(document.querySelector('#fx'), { cutins: art.cutins, intro: art.intro });
  fx.resize(innerWidth, innerHeight);
  const voice = new Voice();
  const capri = new Capri({ root, canvas, image: art.image, views: art.views, poses: art.poses, fx, voice });
  const motion = installMotion(capri, pack);
  const face = installFace(capri, pack, art.expressions, { reduced: () => reducedMotion.matches, quiet: () => preferences.quiet || preferences.paused });
  const fun=installFun(capri,canvas,root,v=>host.fun(v),()=>reducedMotion.matches);
  let needsYou=false;
  const antics=installAntics(capri,fx,voice,{reduced:()=>reducedMotion.matches,blocked:()=>needsYou||preferences.quiet||preferences.paused,props:art.props});
  // Disruptive features remain opt-in through validated preferences.
  capri.possessWindows = false; capri.wander = true; capri.nextGaze = Infinity; capri.uplinkDue = false;
  const compact = document.querySelector<HTMLCanvasElement>('#compact')!;
  compact.width = 84; compact.height = 112;
  const context = compact.getContext('2d')!;
  context.strokeStyle = '#daa84b'; context.lineWidth = 3;
  context.strokeRect(2, 2, 80, 108); context.drawImage(art.image, 10, 5, 64, 102);
  const showCompact = () => { compact.hidden = fullscreen; };
  const hideCompact = () => { compact.hidden = true; };
  capri.chipAt = () => ({ x: 31, y: innerHeight-38 });
  capri.onStow = showCompact; capri.onUnstow = hideCompact;
  capri.onDoze = (phase: string) => phase === 'start' ? showCompact() : hideCompact();
  capri.onMenu = () => host.menu();
  capri.onClick = () => {host.fun({tag:'Click'}); capri.wake(); if(!antics.poke())capri.perform('look'); };
  let fullscreen = false;
  let musicPlaying=false;
  let preferences=await host.settings();
  let screens=await host.screens();
  let desktop=await host.desktop();
  let followState:FollowState={tag:'Here'};
  let reactionState:ReactionState={tag:'Watching',previous:null,nextAt:0};
  let desiredStowed = false;
  let syncing = false;
  // Serialize compact-form animations and reconcile changes arriving during an animation.
  const syncStowed = async () => {
    if (syncing) return;
    syncing = true;
    try { while (Boolean(capri.stowed) !== desiredStowed) { if (desiredStowed) await capri.stow(); else await capri.unstow(); } }
    finally { syncing = false; if (fullscreen) compact.hidden = true; }
  };
  const applySettings = (settings: Settings) => {
    preferences=settings;fun.settings(settings);antics.enable(settings.antics);antics.music(settings.dance&&musicPlaying);
    voice.configure({ muted: settings.quiet, volume: 0.5 });
    motion.setQuiet(settings.quiet);
    reducedMotion.setting = settings.motion;
    capri.setScale(settings.scale);
    capri.frameSetting = settings.fps;
    capri.behaviors={drag:settings.drag,peek:settings.peek,pet:settings.pet,zap:settings.zap,satellite:settings.satellite};
    capri.possessWindows=settings.possess;capri.restOn=settings.rest;
    capri.nextGaze=settings.satellite?(Number.isFinite(capri.nextGaze)?capri.nextGaze:performance.now()+90000):Infinity;
    capri.suspended=settings.paused||fullscreen;
    capri.setHidden(capri.suspended||capri.stowed||capri.dormant);
    desiredStowed = settings.stowed;
    void syncStowed();
  };
  const applyHidden = (hidden: boolean) => {
    fullscreen = hidden; capri.suspended=hidden||preferences.paused;capri.setHidden(capri.suspended || capri.stowed || capri.dormant);
    if(hidden){motion.pause();antics.stop();}
    document.querySelector<HTMLElement>('#agent-caption')!.hidden=hidden||preferences.paused||!document.querySelector<HTMLElement>('#agent-caption')!.textContent;
    if (hidden) { compact.hidden = true; fx.clear(); document.querySelector<HTMLElement>('#fx')!.hidden = true; }
    else { document.querySelector<HTMLElement>('#fx')!.hidden = false; compact.hidden = !(capri.stowed || capri.dormant); }
  };
  const moveTo=async(id:number)=>{screens=await host.moveScreen(id);fx.clear();fx.resize(innerWidth,innerHeight);capri.setView(innerWidth,innerHeight,innerHeight-screens.floorGap);return screens;};
  const beyond=(side:number,y:number)=>neighbor(screens.list,screens.current,side,screens.origin.y+y);
  const goToScreen=async(id:number)=>{if(id!==screens.current)await capri.jumpScreen(async()=>{await moveTo(id);return host.cursor();});};
  capri.canCross=(side:number,y:number)=>Boolean(beyond(side,y));
  capri.onCross=async(side:number,at:{y:number})=>{const there=beyond(side,at.y);if(!there)return null;const globalY=screens.origin.y+at.y;await moveTo(there.id);return {y:globalY-screens.origin.y};};
  capri.onScreenOf=(cursor:{display:number})=>goToScreen(cursor.display);
  const showcase=async()=>{
    if(capri.busy||capri.stowed||capri.dormant)return;
    await capri.teleport(capri.spot('stage'));await capri.perform('hop');await capri.perform('curious');
    if(preferences.peek){await capri.peek('right');await capri.unpeek();}
    await capri.goHome();
  };
  let guideRevision=0,guideActive=false;
  let pendingGuide:{runId:number;x:number;y:number;label:string;until:number}|null=null;
  const stopGuide=()=>{guideRevision++;pendingGuide=null;if(guideActive){guideActive=false;capri.stopPointing();}};
  let pendingAgent:{kind:'Done'|'Failed'|'NeedsYou'|'Working';until:number}|null=null;
  let agentPresence='Idle',agentActive=false,pendingPresence=false;
  let agentMode:string|null=null;
  let agentCard:{x:number;y:number;w:number;h:number}|undefined;
  const agentCaption=document.querySelector<HTMLElement>('#agent-caption')!;
  const processAgentReaction=()=>{
    if(capri.hidden||capri.stowed||preferences.paused||fullscreen){stopGuide();return;}
    if(capri.busy||capri.act||capri.dragging)return;
    if(agentPresence==='NeedsYou'){stopGuide();}
    else if(pendingGuide){
      const guide=pendingGuide;pendingGuide=null;
      if(performance.now()<=guide.until){const revision=++guideRevision;guideActive=true;
        if(reducedMotion.matches)void capri.perform('look');
        else void capri.pointAt({x:guide.x*innerWidth,y:guide.y*innerHeight,w:1,h:1},{label:guide.label,isCurrent:()=>guideRevision===revision});
      }
    }
    if(pendingPresence){
      pendingPresence=false;
      if(agentActive){const next=['Working','Thinking','NeedsYou'].includes(agentPresence)?'work':agentPresence==='Asleep'?'sleep':'idle';
        // Preserve a user-chosen sleep mode while agents are merely working.
        if(capri.mode!=='sleep'||agentMode==='sleep'||agentPresence==='Asleep'){if(capri.mode!==next)capri.setMode(next);agentMode=next;}
      }else if(agentMode){if(capri.mode===agentMode)capri.setMode('idle');agentMode=null;}
    }
    if(!pendingAgent||performance.now()>pendingAgent.until){pendingAgent=null;return;}
    const kind=pendingAgent.kind;pendingAgent=null;
    const reduced=reducedMotion.matches;
    if(kind==='NeedsYou'&&!reduced&&agentCard)void capri.pointAt(agentCard,{label:'Respond in T3Code'});
    else if(kind==='NeedsYou'&&!reduced&&capri.mouse)void capri.teleport({x:Math.max(80,Math.min(innerWidth-80,capri.mouse.x+100)),y:Math.max(160,Math.min(innerHeight-50,capri.mouse.y))}).then(()=>capri.perform('look'));
    else void capri.perform(reduced?'look':kind==='Done'?'victory':kind==='Failed'?'flinch':kind==='NeedsYou'?'look':'curious');
  };
  const agentTimer=setInterval(()=>{processAgentReaction();fun.pulse();antics.pulse();},500);
  window.addEventListener('beforeunload',()=>clearInterval(agentTimer));
  const receive = (event: OverlayEvent) => {
    switch (event.tag) {
      case 'fun':fun.frame(event);return;
      case 'musicPlaying':musicPlaying=event.playing;fun.playing(event.playing);antics.music(preferences.dance&&event.playing);return;
      case 'audioLevel':capri.audioLevel=fullscreen||preferences.paused?0:event.level;return;
      case 'assistantPoint':stopGuide();pendingGuide={...event,until:performance.now()+5000};return;
      case 'assistantStop':stopGuide();return;
      case 'settings': applySettings(event.settings); return;
      case 'hidden': applyHidden(event.hidden); return;
      case 'agent':
        if(agentPresence!==event.presence||agentActive!==event.active)pendingPresence=true;agentPresence=event.presence;agentActive=event.active;needsYou=event.presence==='NeedsYou';if(needsYou)antics.stop();if(event.presence==='NeedsYou')fun.frame({tag:'fun',eligible:false,chaosUntil:0,caption:''});
        agentCard=event.card;if(event.presence!=='NeedsYou'){if(pendingAgent?.kind==='NeedsYou')pendingAgent=null;if(capri.pointing&&!guideActive&&!capri.busy&&!capri.act)capri.stopPointing();}
        agentCaption.textContent=event.presence==='Thinking'?`${event.caption} · Thinking (15s+)`:event.caption;agentCaption.hidden=!event.caption||fullscreen||preferences.paused;return;
      case 'agentReaction':pendingAgent={kind:event.kind,until:performance.now()+5000};return;
      case 'desktop': desktop=event.desktop;capri.setWindows(event.desktop); return;
      case 'resize': fx.resize(event.width, event.height); capri.setView(event.width, event.height,event.height-event.floorGap);void host.screens().then(value=>{screens=value;}); return;
      case 'screen': void goToScreen(event.id);return;
      case 'machine': {
        const result=stepReaction(reactionState,{tag:'Observed',now:performance.now(),machine:{cpu:event.cpu,battery:event.battery,online:navigator.onLine,devices:desktop.deviceRevision??desktop.removableDevices??0,game:desktop.game??false},enabled:preferences.pcReactions,quiet:preferences.quiet,eligible:agentPresence!=='NeedsYou'&&!capri.busy&&!capri.act&&!capri.hidden&&!capri.stowed&&!preferences.paused});
        reactionState=result.state;for(const command of result.commands)capri.perform(command.action);return;
      }
      case 'action':
        switch(event.action) {
          case 'teleport':void capri.teleport(capri.spot('random'));return;
          case 'sleep':capri.setMode('sleep');return;
          case 'wake':capri.wake();return;
          case 'peek':void capri.peek();return;
          case 'lie':void(async()=>{if(capri.stance!=='sit')await capri.sitOn({win:capri.ledge(),dx:capri.view.w*0.6});await capri.lieDown();})();return;
          case 'zap':if(capri.mouse)capri.zap(capri.mouse.x,capri.mouse.y);return;
          case 'satellite':capri.gaze({big:false});return;
          case 'showcase':void showcase();return;
          case 'sit-icon':{const win=desktop.wins.find(win=>win.kind==='icon'&&capri.canSit(win)&&!capri.covered(win,win.x+win.w/2));if(win)void capri.sitOn({win,dx:win.w/2});return;}
        }
        const exhaustive:never=event.action;return exhaustive;
    }
    const exhaustive:never=event;return exhaustive;
  };
  host.onEvent(receive);
  applySettings(await host.settings());
  desktop=await host.desktop();capri.setWindows(desktop);
  host.sounds().then(list => { if (list.length) void voice.loadCustom(list); });
  capri.setView(innerWidth, innerHeight,innerHeight-screens.floorGap);
  let interactive = false;
  const onCompact = (x: number, y: number) => !compact.hidden && x >= 10 && x <= 52 && y >= innerHeight-66 && y <= innerHeight-10;
  const hit = (x: number, y: number) => !fullscreen&&!preferences.paused && (capri.dragging || capri.hit(x,y) || onCompact(x,y));
  const refresh = (x: number, y: number) => {
    const value = Boolean(hit(x,y)); if (interactive === value) return;
    interactive = value; host.interactive(value);
  };
  window.addEventListener('mousemove', event => refresh(event.clientX,event.clientY));
  window.addEventListener('mouseleave', () => { if (!capri.dragging) { interactive = false; host.interactive(false); } });
  window.addEventListener('click', event => {
    if (onCompact(event.clientX,event.clientY)) { if (capri.dormant) capri.wake(); else void host.update({ stowed: false }); }
  });
  window.addEventListener('contextmenu', event => { event.preventDefault(); if (onCompact(event.clientX,event.clientY)) host.menu(); });
  const pointer = setInterval(() => { if(fullscreen||preferences.paused)return;void host.cursor().then(point => {fun.cursor(point);refresh(point.x,point.y);}); }, 300);
  const follow=setInterval(()=>{if(!preferences.follow||preferences.paused)return;void host.cursor().then(cursor=>{
    const result=stepFollow(followState,{tag:'Pointer',current:screens.current,display:cursor.display,enabled:preferences.follow&&!preferences.paused,eligible:!capri.busy&&!capri.act&&!capri.dragging&&!capri.hidden&&!capri.stowed&&capri.mode!=='sleep'});
    followState=result.state;for(const command of result.commands)void goToScreen(command.display);
  });},2000);
  window.addEventListener('beforeunload', () => {clearInterval(pointer);clearInterval(follow);});
  const smoke = new URLSearchParams(location.search).has('smoke');
  if (smoke) {
    capri.wander = false; capri.nextTwitch = Infinity;
    capri.drawFrame();
    window.__companionTest = { capri, hit, host, receive, processAgentReaction, fun, antics };
  } else if (!desiredStowed&&!preferences.paused) void capri.intro(capri.spot('post'), { label: 'hi', caption: pack.name });
  document.body.dataset.ready = 'true';
}
boot().catch(error => { console.error('Companion startup failed', error instanceof Error ? error.message : 'Unknown error'); document.body.dataset.ready = 'failed'; });
