// Shell for her face on the body sprite: builds the expression atlas from the pack, feeds the pure
// face state (core/motion/expression.ts) with time and random units, and tells the sprite which
// cell to draw. Every decision about what her face does lives in the core.
import { EXPRESSIONS, faceFor, initialFace, resolveExpression, stepFace, type Expression, type FaceInput, type FaceState } from '../../core/motion/expression';
import type { ArtDescriptor } from '../../shared/art';

// Atlas texels per sprite pixel: enough for her largest size on a dense display.
const DETAIL = 4;
const TALK_MS = 110;
const MANY_FLASH_MS = 170;
type Options = { reduced: () => boolean; quiet: () => boolean };

export function installFace(capri: any, pack: ArtDescriptor, images: Partial<Record<Expression, HTMLImageElement>>, options: Options) {
  const anchor = pack.faceAnchor;
  const names = EXPRESSIONS.filter(name => images[name]);
  if (!anchor || !images.neutral) return { active: false, flash: (_mood: Expression, _ms: number) => {} };

  const cellW = Math.round(anchor.width * DETAIL), cellH = Math.round(anchor.height * DETAIL);
  const atlas = document.createElement('canvas');
  atlas.width = cellW * names.length; atlas.height = cellH;
  const context = atlas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  names.forEach((name, index) => context.drawImage(images[name]!, index * cellW, 0, cellW, cellH));
  capri.sprite.setFace({ atlas, count: names.length, rect: { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height } });
  const available = new Set<string>(names);
  const cellOf = (name: Expression) => names.indexOf(resolveExpression(name, available));

  let state: FaceState = initialFace(performance.now());
  const dispatch = (input: FaceInput) => { state = stepFace(state, input).state; };
  const playful = () => Boolean(!capri.act && !capri.busy && !capri.dragging && !capri.pointing && capri.mode === 'idle' && ['stand', 'sit', 'peek'].includes(capri.stance) && !options.quiet());

  // A glitch twitch shows every eye she has for a couple of drawings, half the time.
  const twitch = capri.twitch.bind(capri);
  capri.twitch = () => {
    twitch();
    if (!options.reduced() && Math.random() < 0.5) dispatch({ tag: 'Flash', now: performance.now(), mood: 'many', ms: MANY_FLASH_MS });
  };

  const before = capri.onPose;
  capri.onPose = (p: any, now: number) => {
    before?.(p, now);
    // Reduced motion: no blinks or looks of her own, only the face that goes with what she is doing.
    if (options.reduced()) state = initialFace(now);
    else dispatch({ tag: 'Tick', now, blink: Math.random(), mood: Math.random(), choice: Math.random(), playful: playful() });
    const head = capri.head(), mouse = capri.mouse;
    const near = mouse && Math.hypot(mouse.x - head.x, mouse.y - head.y) < 700;
    p.face = cellOf(faceFor({
      act: capri.act?.player.name ?? capri.base?.name ?? null,
      asleep: capri.mode === 'sleep',
      alert: capri.mode === 'alert',
      petted: Boolean(capri.pet),
      look: near ? ((mouse.x - head.x) / 260) * capri.facing : 0,
      mouthOpen: capri.audioLevel > 0.02 && Math.floor(now / TALK_MS) % 2 === 0,
      clip: capri.facePose ?? {},
    }, state));
  };
  capri.kickLoop?.();
  return { active: true, flash: (mood: Expression, ms: number) => dispatch({ tag: 'Flash', now: performance.now(), mood, ms }) };
}
