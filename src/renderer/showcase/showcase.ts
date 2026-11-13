// The showcase: the real character, renderer and effects on a pretend desktop, with every
// capability on a list. It needs no preload: nothing here reaches the system or the agents.
// @ts-expect-error Retained character implementation stays JavaScript.
import { Capri } from '../js/capri.js';
// @ts-expect-error Retained effect implementation stays JavaScript.
import { FxLayer } from '../js/fx.js';
// @ts-expect-error Retained synthesized sounds stay JavaScript.
import { Voice } from '../js/voice.js';
// @ts-expect-error Retained motion preference helper stays JavaScript.
import { reducedMotion } from '../js/util.js';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS } from '../js/acting.js';
import { loadArtImages } from '../js/art.js';
import type { ArtDescriptor } from '../../shared/art';
import { DEFAULT_SETTINGS, type Settings } from '../../core/companion';
import { CATALOG, initialTour, playable, stepTour, type Entry, type TourCommand, type TourInput, type TourState } from '../../core/showcase';
import { installMotion } from '../overlay/motion/driver';
import { installFace } from '../overlay/face';
import { installFun } from '../overlay/fun';
import { installAntics } from '../overlay/antics/antics';
import { CLIPS } from '../overlay/motion/clips';

const DOCK = 392, FLOOR_GAP = 52, STEP_TIMEOUT = 45_000;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function boot() {
  const response = await fetch('art://pack/manifest.json');
  if (!response.ok) throw new Error('Art pack unavailable');
  const pack: ArtDescriptor = await response.json();
  const art = await loadArtImages(pack, url => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.onload = () => resolve(image); image.onerror = reject; image.src = url;
  }));

  const root = $<HTMLElement>('#capri'), canvas = $<HTMLCanvasElement>('#sprite');
  const fx = new FxLayer($('#fx'), { cutins: art.cutins, intro: art.intro });
  const voice = new Voice();
  voice.configure({ muted: true, volume: 0.5 });
  const capri = new Capri({ root, canvas, image: art.image, views: art.views, poses: art.poses, fx, voice });
  const motion = installMotion(capri, pack);
  installFace(capri, pack, art.expressions, { reduced: () => reducedMotion.matches, quiet: () => false });
  const antics = installAntics(capri, fx, voice, { reduced: () => reducedMotion.matches, blocked: () => tour.tag === 'Playing' || playing, props: art.props });
  const settings: Settings = { ...DEFAULT_SETTINGS, wander: false, dance: true, clones: false, chaos: true };
  const fun = installFun(capri, canvas, root, () => {}, () => reducedMotion.matches);
  fun.settings(settings);

  capri.setScale(0.62);
  capri.wander = false; capri.nextGaze = Infinity; capri.uplinkDue = false; capri.possessWindows = true; capri.restOn = 'corner';
  capri.behaviors = { drag: true, peek: true, pet: true, zap: true, satellite: true };
  capri.chipAt = () => ({ x: 31, y: innerHeight - 38 });

  const stageW = () => Math.max(420, innerWidth - DOCK);
  const home = () => ({ x: stageW() * 0.62, y: innerHeight - FLOOR_GAP });
  const fake = $<HTMLElement>('#window');
  const rect = () => ({ id: 1, x: 70, y: Math.max(150, innerHeight * 0.34), w: Math.min(430, stageW() * 0.5), h: Math.min(310, innerHeight * 0.42), max: false, kind: 'window' as const });
  let windowOpen = true;
  const layout = () => {
    const win = rect();
    fx.resize(innerWidth, innerHeight);
    capri.setView(stageW(), innerHeight, innerHeight - FLOOR_GAP);
    Object.assign(fake.style, { left: `${win.x}px`, top: `${win.y}px`, width: `${win.w}px`, height: `${win.h}px` });
    fake.hidden = !windowOpen;
    capri.setWindows({ fg: windowOpen ? 1 : 0, fullscreen: false, wins: windowOpen ? [win] : [] });
  };
  addEventListener('resize', layout);
  layout();
  capri.pos = home();
  capri.place();
  capri.onClick = () => { capri.wake(); if (!antics.poke()) void capri.perform('look'); };
  capri.onMenu = () => {};

  const free = () => !capri.busy && !capri.act && !capri.dragging && !['fall', 'fly', 'down', 'held'].includes(capri.stance);
  const whenFree = async (limit = 15_000) => {
    const end = performance.now() + limit;
    while (!free() && performance.now() < end) await sleep(40);
  };
  const reset = async () => {
    if (capri.pointing) capri.stopPointing();
    capri.endAct(false);
    if (capri.stowed) await capri.unstow();
    if (capri.dormant) await capri.rouse();
    await whenFree(6000);
    capri.setMode('idle');
    if (!windowOpen) { windowOpen = true; layout(); }
    if (capri.lounge) await capri.getUp();
    await whenFree(3000);
    const spot = home();
    if (capri.stance !== 'stand' || Math.hypot(capri.pos.x - spot.x, capri.pos.y - spot.y) > 40) await capri.teleport(spot, { stance: 'stand', face: 1 });
    await whenFree(4000);
  };
  const seat = () => ({ win: rect(), dx: rect().w * 0.55 });
  const funScene = async (over: Partial<Settings>, caption: string, ms: number, music = false) => {
    fun.settings({ ...settings, ...over });
    fun.frame({ tag: 'fun', eligible: true, chaosUntil: Date.now() + ms, caption });
    fun.playing(music);
    await sleep(ms);
    fun.frame({ tag: 'fun', eligible: false, chaosUntil: 0, caption: '' });
    fun.playing(false);
    fun.settings(settings);
  };

  const SCENES: Record<string, () => Promise<unknown>> = {
    intro: async () => { await capri.materialize(home()); },
    teleport: async () => { await capri.teleport({ x: stageW() * 0.3, y: innerHeight - FLOOR_GAP }); await sleep(900); await capri.teleport(home()); },
    perch: async () => { await capri.sitOn(seat()); await sleep(2800); },
    fall: async () => { await capri.sitOn(seat()); await sleep(900); windowOpen = false; layout(); await sleep(400); await whenFree(); await sleep(600); },
    lie: async () => { if (!capri.loungeArt) { await capri.sitOn(seat()); await capri.lieDown(); await sleep(5600); await capri.getUp(); return; } for (const pose of ['loungeCoiled', 'loungeSprawl']) { await capri.loungeOn(seat(), pose); await sleep(3000); } },
    peek: async () => { await capri.peek('right'); await sleep(1600); await capri.unpeek(); },
    peekhalf: async () => { await capri.peek('lean-left'); await sleep(5200); await capri.unpeek(); },
    peekbust: async () => { await capri.peek('bottom'); await sleep(5600); await capri.unpeek(); },
    idlecycles: async () => {
      for (const name of ['standHip', 'standLoose', 'stand']) { capri.cycle.stand = name; capri.base = capri.restBase(); await sleep(2600); }
    },
    throw: async () => { capri.throwHer(-1900, -1500); await sleep(300); await whenFree(9000); },
    stow: async () => { await capri.stow(); await sleep(1300); await capri.unstow(); },
    doze: async () => { capri.setMode('sleep'); await sleep(1800); await capri.doze(); await sleep(1500); await capri.rouse(); },
    wander: async () => { capri.wanderStep(); await sleep(400); await whenFree(); await sleep(500); },
    victory: async () => { await capri.perform('victory', capri.towardCenter() || 1); },
    zap: async () => { capri.zap(stageW() * 0.22, innerHeight * 0.3); await sleep(1600); },
    satellite: async () => { capri.gaze({ big: false }); await sleep(600); await whenFree(14_000); },
    uplink: async () => { capri.gaze({ big: true }); await sleep(600); await whenFree(22_000); },
    possess: async () => { await capri.sitOn(seat()); await capri.possess({ say: 'mine now' }); },
    jealous: async () => { await capri.jealous(rect(), { say: 'who is THAT' }); await sleep(900); },
    point: async () => { await capri.pointAt({ x: rect().x + 40, y: rect().y + 60, w: 200, h: 60 }, { label: 'Needs you' }); await sleep(2200); },
    working: async () => { capri.setMode('work'); await sleep(3200); capri.setMode('idle'); },
    clones: () => funScene({ clones: true }, 'Clones: visual only', 3800),
    chaosmode: () => funScene({ chaos: true }, 'Chaos layer', 3800),
    dance: () => funScene({ dance: true }, 'Dancing to the music', 3800, true),
  };

  const clips: Entry[] = CLIPS.filter(item => item.source === 'interpretation').map(item => ({ id: `clip:${item.name}`, title: item.name.replace(/_/g, ' '), group: 'Idle motion', kind: 'clip', about: 'A blended gesture she mixes into her idle.' }));
  const entries = [...CATALOG, ...clips];
  const missing = CATALOG.filter(entry => entry.kind === 'scene' && !SCENES[entry.id]);
  if (missing.length) throw new Error(`Showcase scenes missing: ${missing.map(entry => entry.id).join()}`);

  const perform = async (entry: Entry) => {
    switch (entry.kind) {
      case 'act': {
        const finished = capri.perform(entry.id, ACTS[entry.id].directional ? capri.towardCenter() || 1 : 0);
        // Stance cycles such as leap and ko loop until something ends them.
        if (ACTS[entry.id].loop) { await sleep(1800); capri.endAct(false); }
        await finished;
        return;
      }
      case 'scene': await SCENES[entry.id](); return;
      case 'clip': {
        const name = entry.id.slice(5), clip = CLIPS.find(item => item.name === name)!;
        motion.playClip(name);
        await sleep(clip.duration * 1000 + 300);
        return;
      }
      case 'info': return;
    }
    const exhaustive: never = entry.kind; return exhaustive;
  };

  let playing = false, tour: TourState = initialTour;
  const now = $<HTMLElement>('#now-title'), detail = $<HTMLElement>('#now-about'), progress = $<HTMLElement>('#progress');
  const rows = new Map<string, HTMLElement>();
  const highlight = (entry: Entry | undefined) => {
    for (const row of rows.values()) row.removeAttribute('data-active');
    if (entry) { const row = rows.get(entry.id); row?.setAttribute('data-active', 'true'); row?.scrollIntoView({ block: 'nearest' }); }
  };
  const show = async (entry: Entry) => {
    playing = true; highlight(entry);
    now.textContent = entry.title; detail.textContent = entry.about;
    let failed = false;
    try {
      await reset();
      await Promise.race([perform(entry), sleep(STEP_TIMEOUT)]);
      await whenFree(3000);
    } catch (error) { failed = true; console.error(`Showcase step failed: ${entry.id}`, error instanceof Error ? error.message : 'Unknown error'); }
    playing = false;
    return !failed;
  };

  const dispatch = (input: TourInput) => {
    const result = stepTour(tour, input);
    tour = result.state;
    result.commands.forEach(interpret);
    refresh();
  };
  const interpret = (command: TourCommand) => {
    switch (command.tag) {
      case 'Play': {
        const entry = entries.find(item => item.id === command.id);
        if (entry) void show(entry).then(() => dispatch({ tag: 'Done', runId: command.runId }));
        else dispatch({ tag: 'Done', runId: command.runId });
        return;
      }
      case 'Finished': now.textContent = 'That is everything.'; detail.textContent = 'Pick anything from the list, or poke her.'; highlight(undefined); return;
    }
    const exhaustive: never = command; return exhaustive;
  };
  const refresh = () => {
    const active = tour.tag === 'Playing';
    $<HTMLButtonElement>('#tour').textContent = active ? 'Stop the tour' : 'Play everything';
    progress.textContent = tour.tag === 'Playing' ? `${tour.index + 1} / ${tour.ids.length}` : `${entries.filter(playable).length} things to see`;
  };

  const list = $<HTMLElement>('#list');
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  for (const [group, items] of groups) {
    const section = document.createElement('section'), heading = document.createElement('h2');
    heading.textContent = group; section.append(heading);
    for (const entry of items) {
      const row = document.createElement(playable(entry) ? 'button' : 'div');
      row.className = 'row'; row.dataset.search = `${entry.title} ${entry.about} ${group}`.toLowerCase();
      const name = document.createElement('strong'), about = document.createElement('span');
      name.textContent = entry.title; about.textContent = entry.about; row.append(name, about);
      if (playable(entry)) row.addEventListener('click', () => { if (tour.tag === 'Playing') dispatch({ tag: 'Stop' }); void show(entry); });
      rows.set(entry.id, row); section.append(row);
    }
    list.append(section);
  }

  $<HTMLButtonElement>('#tour').addEventListener('click', () => dispatch(tour.tag === 'Playing' ? { tag: 'Stop' } : { tag: 'Start', ids: entries.filter(playable).map(entry => entry.id) }));
  $<HTMLInputElement>('#filter').addEventListener('input', event => {
    const needle = (event.target as HTMLInputElement).value.trim().toLowerCase();
    for (const row of rows.values()) row.hidden = Boolean(needle) && !row.dataset.search!.includes(needle);
    for (const section of list.querySelectorAll('section')) (section as HTMLElement).hidden = ![...section.querySelectorAll<HTMLElement>('.row')].some(row => !row.hidden);
  });
  $<HTMLInputElement>('#sound').addEventListener('change', event => voice.configure({ muted: !(event.target as HTMLInputElement).checked, volume: 0.5 }));
  $<HTMLInputElement>('#reduced').addEventListener('change', event => { reducedMotion.setting = (event.target as HTMLInputElement).checked ? 'reduced' : 'auto'; });
  $<HTMLInputElement>('#antics').addEventListener('change', event => antics.enable((event.target as HTMLInputElement).checked));

  setInterval(() => antics.pulse(), 500);
  let lastFrames = 0, lastDraws = 0;
  const stats = $<HTMLElement>('#stats');
  setInterval(() => {
    const { frames, draws } = capri.sprite.stats;
    stats.textContent = `${frames - lastFrames} frames/s · ${draws - lastDraws} GPU draws/s`;
    lastFrames = frames; lastDraws = draws;
  }, 1000);
  refresh();

  if (new URLSearchParams(location.search).has('smoke')) {
    capri.nextTwitch = Infinity;
    Object.assign(window, { __showcase: { entries, show, capri, antics, ids: entries.filter(playable).map(entry => entry.id), reset } });
  } else void capri.materialize(home());
  document.body.dataset.ready = 'true';
}
boot().catch(error => { console.error('Showcase startup failed', error instanceof Error ? error.message : 'Unknown error'); document.body.dataset.ready = 'failed'; });
