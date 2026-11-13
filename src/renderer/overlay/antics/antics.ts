// Shell for the antics director: runs its commands, and draws what the sheets cue.
import { initialAntics, stepAntics, type AnticCommand, type AnticInput, type AnticState } from '../../../core/fun/antics';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS } from '../../js/acting.js';
import { sampleIdleLife } from '../../../core/motion/playful';
import { buildAtlas, burstLabel, CELL_SIZE, errorCard, type Atlas, type PackProps } from './props';

const CONFETTI = ['#ff2152', '#36ff7a', '#7b3dff', '#3d6bff', '#fff4f6', '#daa84b'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
type Options = { reduced: () => boolean; blocked?: () => boolean; props?: PackProps };

export function installAntics(capri: any, fx: any, voice: any, options: Options) {
  let atlas: Atlas | undefined;
  const sheet = () => atlas ??= buildAtlas(document, options.props);
  let state: AnticState = initialAntics(performance.now());
  let enabled = true, music = false, runId = 0;
  const stamp = (x: number, y: number, name: string, size: number, rot = 0, alpha = 1, flip = 1, ctx: CanvasRenderingContext2D = fx.ctx) => {
    const { canvas, index } = sheet();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1); ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, index[name] * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE, -size / 2, -size / 2, size, size);
    ctx.restore();
  };

  const eligible = () => Boolean(!capri.hidden && !capri.stowed && !capri.dormant && !capri.busy && !capri.act && !capri.dragging && !capri.pointing && !capri.suspended
    && capri.mode === 'idle' && ['stand', 'sit'].includes(capri.stance) && !options.reduced() && !options.blocked?.());

  const dispatch = (input: AnticInput) => {
    const result = stepAntics(state, input);
    state = result.state;
    for (const command of result.commands) run(command);
    return result.commands.length > 0;
  };
  const run = (command: AnticCommand) => {
    const dir = ACTS[command.name].directional ? capri.towardCenter() || 1 : 0;
    void Promise.resolve(capri.perform(command.name, dir)).finally(() => dispatch({ tag: 'Finished', runId: command.runId, now: performance.now(), delay: Math.random(), enabled }));
  };

  const hand = () => capri.limb(capri.armToward(capri.act?.player.dir || 1)).hand as { x: number; y: number };
  const mouth = () => { const h = capri.head(); return { x: h.x + 44 * capri.scale * capri.facing, y: h.y + 16 * capri.scale }; };

  function particles(count: number, spawn: () => { x: number; y: number; vx: number; vy: number; name?: string; size: number; color?: string; spin: number }, gravity: number, life: number) {
    const list = Array.from({ length: count }, () => ({ ...spawn(), rot: rnd(0, 6) }));
    fx.add({ type: 'paint', life, paint(ctx: CanvasRenderingContext2D, t: number, dt: number) {
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      for (const p of list) {
        p.vy += gravity * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        if (p.name) stamp(p.x, p.y, p.name, p.size, p.rot, alpha);
        else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color!; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.5 + Math.abs(Math.sin(p.rot * 3))));
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    } });
  }

  const puff = (kind: string) => {
    const h = capri.head(), s = capri.scale, feet = { x: capri.pos.x + capri.shift, y: capri.pos.y }, at = () => ({ x: h.x + rnd(-60, 60) * s, y: h.y - rnd(20, 90) * s });
    switch (kind) {
      case 'confetti': particles(34, () => { const m = mouth(), a = rnd(-Math.PI, 0); return { x: m.x, y: m.y, vx: Math.cos(a) * rnd(80, 520), vy: Math.sin(a) * rnd(160, 620), size: rnd(7, 13), color: CONFETTI[Math.floor(rnd(0, CONFETTI.length))], spin: rnd(-9, 9) }; }, 900, 1500); return;
      case 'note': particles(1, () => { const p = at(); return { ...p, vx: rnd(-34, 34), vy: rnd(-120, -70), name: 'note', size: rnd(26, 38) * Math.max(0.7, s), spin: rnd(-1, 1) }; }, -10, 1000); return;
      case 'heart': particles(5, () => { const p = at(); return { ...p, vx: rnd(-70, 70), vy: rnd(-170, -70), name: 'heart', size: rnd(20, 34), spin: rnd(-1, 1) }; }, -20, 1300); return;
      case 'star': particles(5, () => { const p = at(), a = rnd(0, 6.3); return { ...p, vx: Math.cos(a) * rnd(60, 220), vy: Math.sin(a) * rnd(60, 220), name: 'star', size: rnd(16, 30), spin: rnd(-5, 5) }; }, 120, 800); return;
      case 'smoke': particles(5, () => ({ x: feet.x + rnd(-44, 44) * s, y: feet.y - rnd(0, 10), vx: rnd(-60, 60), vy: rnd(-40, -8), name: 'puff', size: rnd(32, 56), spin: rnd(-1, 1) }), -6, 620); return;
      case 'spark': fx.burst(h.x + rnd(-50, 50) * s, h.y - rnd(0, 70) * s, { count: 3, power: 0.4, spread: 40 }); return;
      case 'flash': { const p = hand(); fx.add({ type: 'paint', life: 130, paint(ctx: CanvasRenderingContext2D, t: number) {
        ctx.save(); ctx.globalAlpha = 1 - t; ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.arc(p.x, p.y, 22 + 70 * t, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } }); return; }
    }
  };

  const pop = (word: string) => {
    const label = burstLabel(word), start = capri.head(), toward = capri.towardCenter() || 1;
    const x = Math.max(label.w / 2 + 6, Math.min(innerWidth - label.w / 2 - 6, start.x + toward * (70 + 90 * capri.scale)));
    const y = Math.max(label.h / 2 + 6, start.y - 90 * capri.scale);
    fx.add({ type: 'paint', life: 950, paint(ctx: CanvasRenderingContext2D, t: number) {
      const k = t < 0.1 ? 1.5 - t * 5 : 1, a = t < 0.8 ? 1 : 1 - Math.floor((t - 0.8) / 0.05) / 4;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.05);
      ctx.drawImage(label.canvas, -label.w / 2, -label.h / 2, label.w, label.h); ctx.restore();
    } });
  };

  const holdProp = (name: string) => {
    const owner = capri.act?.player;
    const held = (paint: (ctx: CanvasRenderingContext2D, t: number, now: number, age: number) => void, life = 9000) => {
      const item = fx.add({ type: 'paint', life, paint(ctx: CanvasRenderingContext2D, t: number, _dt: number, now: number) {
        if (capri.act?.player !== owner) { item.life = 0; return; }
        paint(ctx, t, now, now - item.born);
      } });
    };
    const size = 82 * Math.max(0.65, capri.scale * 1.4), art = sheet().packed.has(name);
    // Pack art shares her mane's colours, so it is held larger and clear of the mane. These two face
    // the other way in the generated art than in the code-drawn set.
    const flip = art && (name === 'guitar' || name === 'chicken') ? capri.facing : -capri.facing, grow = art ? 1.25 : 1;
    if (name === 'shades') { const fall = 520; held((_ctx, _t, _now, age) => { const h = capri.head(), k = Math.min(1, age / fall); stamp(h.x + 20 * capri.scale * capri.facing, h.y - 20 * capri.scale - (1 - k * k) * 260, 'shades', 96 * capri.scale * (art ? 1.3 : 1), 0, 1, flip); }); return; }
    if (name === 'error') { const card = errorCard(); held((ctx, _t, _now, age) => { const toward = capri.towardCenter() || 1, k = Math.min(1, age / 120); ctx.save(); ctx.globalAlpha = k; ctx.drawImage(card.canvas, capri.pos.x + toward * 90 - card.w / 2, Math.max(4, capri.head().y - 320 * capri.scale), card.w, card.h); ctx.restore(); }); return; }
    // The pack balloon's cell runs down to the end of its string, so it hangs from that point.
    if (name === 'balloon') { const across = art ? 168 : 110, rise = art ? 84 : 74; held(() => { const p = hand(); stamp(p.x, p.y - rise, 'balloon', across); }); return; }
    if (name === 'guitar') { held(() => { const p = capri.screenPoint(118, 230); stamp(p.x, p.y, 'guitar', size * 1.6 * grow, -0.15, 1, flip); }); return; }
    held(() => { const p = hand(), out = art ? size * 0.55 * (capri.act?.player.dir || 1) : 0; stamp(p.x + out, p.y - size * 0.1, name, (name === 'chicken' ? size * 1.35 : size) * grow, name === 'chicken' ? capri.p.armR * 0.5 : 0, 1, flip); });
  };

  capri.onAnticCue = (cue: string) => {
    for (const part of cue.split('|')) {
      const dot = part.indexOf('.'), kind = dot < 0 ? part : part.slice(0, dot), value = dot < 0 ? '' : part.slice(dot + 1);
      if (kind === 'sfx') { voice.play(value); continue; }
      if (options.reduced()) continue;
      if (kind === 'glitch') capri.twitch();
      else if (kind === 'fx') puff(value);
      else if (kind === 'pop') pop(value);
      else if (kind === 'prop') holdProp(value);
    }
  };

  const before = capri.onPose;
  capri.onPose = (p: any, now: number) => {
    before?.(p, now);
    if (capri.act || capri.busy || capri.dragging || capri.mode === 'sleep' || capri.stance !== 'stand' || options.reduced()) return;
    const m = capri.mouse, reach = m ? Math.max(0, 1 - Math.abs(m.x - capri.pos.x) / 600) : 0;
    const life = sampleIdleLife(now, m ? (m.x - capri.pos.x) / 400 * reach * capri.facing : 0, 1);
    p.head += life.head; p.hair += life.hair; p.waist += life.waist; p.hipX += life.hipX; capri.tilt += life.tilt; capri.bob += life.bob; capri.sy *= life.sy;
  };

  return {
    enable: (value: boolean) => { enabled = value; },
    music: (value: boolean) => { music = value; },
    eligible,
    /** True when a poke became a combo reaction, so the caller should not also react. */
    poke: () => dispatch({ tag: 'Poke', now: performance.now(), runId: ++runId, eligible: eligible() && enabled }),
    pulse: () => { dispatch({ tag: 'Pulse', now: performance.now(), runId: ++runId, choice: Math.random(), delay: Math.random(), eligible: eligible(), enabled, music, seated: capri.stance === 'sit' }); },
    stop: () => { dispatch({ tag: 'Stop', now: performance.now() }); },
  };
}
