// Her face on the body sprite: which expression shows right now. Pure. Time and random units
// arrive through inputs; the renderer only looks up the cell this module names.
//
// A pack supplies one small picture per expression (manifest `expressions`), drawn over the
// faceAnchor rectangle. Anything the pack lacks falls back along FALLBACK toward `neutral`.

export const EXPRESSIONS = ['neutral', 'blink', 'joy', 'laugh', 'smug', 'wink', 'wide', 'many', 'sleepy', 'pout', 'lookLeft', 'lookRight', 'talk'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

const FALLBACK: Readonly<Record<Expression, Expression>> = {
  neutral: 'neutral', blink: 'neutral', joy: 'neutral', laugh: 'joy', smug: 'neutral', wink: 'blink', wide: 'neutral',
  many: 'wide', sleepy: 'blink', pout: 'smug', lookLeft: 'neutral', lookRight: 'neutral', talk: 'neutral',
};

/** The expression to draw when the pack only has `available`: the nearest one it does have. */
export function resolveExpression(wanted: Expression, available: ReadonlySet<string>): Expression {
  let name = wanted;
  for (let i = 0; i < EXPRESSIONS.length && !available.has(name); i++) name = FALLBACK[name];
  return available.has(name) ? name : 'neutral';
}

// What her face does during an exposure sheet or a stance cycle (acting.js names).
export const ACT_FACE: Readonly<Record<string, Expression>> = {
  // delighted
  victory: 'laugh', bounce: 'laugh', jazz: 'laugh', crashout: 'laugh', cartwheel: 'laugh', backflip: 'laugh', balloon: 'laugh',
  wave: 'joy', petted: 'joy', sway: 'joy', shimmy: 'joy', hop: 'joy', bow: 'joy', legswing: 'joy', boombox: 'joy', airguitar: 'joy',
  headbang: 'joy', snack: 'joy', selfie: 'joy', spin: 'joy', moonwalk: 'joy', sitLean: 'joy',
  // up to something
  zap: 'smug', point: 'smug', pointing: 'smug', unpoint: 'smug', shrug: 'smug', shades: 'smug', salute: 'smug', think: 'smug',
  peek: 'smug', peekHalf: 'smug', peekBust: 'smug', cannon: 'smug', squeaker: 'smug', turn: 'smug', touchdown: 'smug', standHip: 'smug',
  coffee: 'wink', robot: 'wink',
  // caught off guard
  curious: 'wide', startle: 'wide', grabbed: 'wide', held: 'wide', fall: 'wide', flinch: 'wide', scout: 'wide', sneeze: 'wide',
  hiccup: 'wide', tumble: 'wide', leap: 'wide', crouch: 'wide', wake: 'wide', gaze: 'wide', uplink: 'wide', dive: 'wide', land: 'wide', overheat: 'wide',
  // all her eyes
  alarm: 'many', split: 'many', glitchstorm: 'many', boo: 'many', glare: 'many',
  // not amused, or out of it
  huff: 'pout', facepalm: 'pout', tantrum: 'pout', wobble: 'pout', shake: 'pout',
  sleep: 'sleepy', drained: 'sleepy', yawn: 'sleepy', ko: 'sleepy', lounge: 'sleepy', fold: 'sleepy', stretch: 'sleepy',
  talk: 'talk',
};

// Expressions whose eyes are already shut or busy: a blink on top would only flicker.
const NO_BLINK: ReadonlySet<Expression> = new Set(['blink', 'joy', 'laugh', 'wink', 'sleepy', 'many']);
// The little looks she gives by herself when nothing is going on, most mischievous first.
export const MOODS: readonly Expression[] = ['smug', 'wink', 'joy', 'smug', 'lookLeft', 'lookRight', 'pout', 'wide'];

export const BLINK_MS = 110;
const DOUBLE_GAP_MS = 150;
const BLINK_EVERY: readonly [number, number] = [2200, 6500];
const MOOD_EVERY: readonly [number, number] = [9000, 26_000];
const MOOD_HOLD: readonly [number, number] = [900, 1900];
const WINK_MS = 380;
const DOUBLE_BLINK = 0.15;
export const FLASH_LIMIT_MS = 600;

const unit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0.5);
const within = (range: readonly [number, number], value: number) => range[0] + (range[1] - range[0]) * unit(value);
const time = (value: number) => (Number.isFinite(value) ? value : 0);

type Timers = { readonly nextBlinkAt: number; readonly nextMoodAt: number };
export type FaceState =
  // second: the blink that is due is the second of a double, so it is not doubled again
  | ({ readonly tag: 'Open'; readonly second: boolean } & Timers)
  | ({ readonly tag: 'Blinking'; readonly until: number; readonly again: boolean } & Timers)
  | ({ readonly tag: 'Mood'; readonly mood: Expression; readonly until: number } & Timers)
  | ({ readonly tag: 'Flash'; readonly mood: Expression; readonly until: number } & Timers);
export type FaceInput =
  // `blink`, `mood` and `choice` are random units. `playful` is false whenever she is busy, asleep or asked to be quiet.
  | { readonly tag: 'Tick'; readonly now: number; readonly blink: number; readonly mood: number; readonly choice: number; readonly playful: boolean }
  // Something jolts her (a glitch twitch): one expression for a few drawings, whatever else was showing.
  | { readonly tag: 'Flash'; readonly now: number; readonly mood: Expression; readonly ms: number };
export type FaceStep = { readonly state: FaceState; readonly commands: readonly never[] };

export const initialFace = (now: number): FaceState => ({ tag: 'Open', second: false, nextBlinkAt: time(now) + 1800, nextMoodAt: time(now) + 7000 });

const open = (state: FaceState, changes: Partial<Timers> & { second?: boolean } = {}): FaceState => ({ tag: 'Open', second: false, nextBlinkAt: state.nextBlinkAt, nextMoodAt: state.nextMoodAt, ...changes });

export function stepFace(state: FaceState, input: FaceInput): FaceStep {
  const next = (value: FaceState): FaceStep => ({ state: value, commands: [] });
  switch (input.tag) {
    case 'Flash': {
      const now = time(input.now), ms = Math.max(0, Math.min(FLASH_LIMIT_MS, time(input.ms)));
      return next({ tag: 'Flash', mood: input.mood, until: now + ms, nextBlinkAt: state.nextBlinkAt, nextMoodAt: state.nextMoodAt });
    }
    case 'Tick': {
      const now = time(input.now);
      switch (state.tag) {
        case 'Blinking':
          if (now < state.until) return next(state);
          // a double blink: open for a moment, then once more
          return next(open(state, { second: state.again, nextBlinkAt: state.again ? now + DOUBLE_GAP_MS : now + within(BLINK_EVERY, input.blink) }));
        case 'Mood':
        case 'Flash':
          return now < state.until ? next(state) : next(open(state, { nextBlinkAt: Math.max(state.nextBlinkAt, now + 400) }));
        case 'Open': {
          if (now >= state.nextBlinkAt) {
            const again = !state.second && unit(input.choice) < DOUBLE_BLINK;
            return next({ tag: 'Blinking', until: now + BLINK_MS, again, nextBlinkAt: state.nextBlinkAt, nextMoodAt: state.nextMoodAt });
          }
          if (input.playful && now >= state.nextMoodAt) {
            const mood = MOODS[Math.floor(unit(input.choice) * MOODS.length)];
            return next({ tag: 'Mood', mood, until: now + (mood === 'wink' ? WINK_MS : within(MOOD_HOLD, input.mood)), nextBlinkAt: state.nextBlinkAt, nextMoodAt: now + within(MOOD_EVERY, input.mood) });
          }
          // not in the mood: push the next one back, so a mood never fires the instant she is free again
          if (!input.playful && state.nextMoodAt < now + 3000) return next(open(state, { second: state.second, nextMoodAt: now + 3000 }));
          return next(state);
        }
      }
      const exhaustiveState: never = state; return exhaustiveState;
    }
  }
  const exhaustive: never = input; return exhaustive;
}

/** What the renderer knows about her this drawing. */
export interface FaceContext {
  /** The act on top, else the stance cycle underneath (acting.js names). */
  readonly act: string | null;
  readonly asleep: boolean;
  readonly alert: boolean;
  readonly petted: boolean;
  /** Where the pointer is from her face, in the sprite's own left/right: -1..1. */
  readonly look: number;
  /** Her mouth is open this drawing (speech level, alternated by the caller). */
  readonly mouthOpen: boolean;
  /** Sampled clip fields that only a face can show (Params names), when a clip is playing. */
  readonly clip: { readonly blinkL?: number; readonly blinkR?: number; readonly eyeWide?: number; readonly squint?: number; readonly mouthSmile?: number; readonly mouthOpen?: number; readonly manyEyes?: number; readonly sleep?: number; readonly gazeX?: number };
}

function fromClip(clip: FaceContext['clip']): Expression | null {
  const value = (field: number | undefined) => (Number.isFinite(field) ? (field as number) : 0);
  const left = value(clip.blinkL) > 0.5, right = value(clip.blinkR) > 0.5;
  if (value(clip.manyEyes) > 0.4) return 'many';
  if (left && right) return 'blink';
  if (left || right) return 'wink';
  if (value(clip.sleep) > 0.4) return 'sleepy';
  if (value(clip.eyeWide) > 0.5) return 'wide';
  if (value(clip.mouthOpen) > 0.5) return value(clip.mouthSmile) > 0.5 ? 'laugh' : 'talk';
  if (value(clip.mouthSmile) < -0.3) return 'pout';
  if (value(clip.mouthSmile) > 0.6 && value(clip.squint) > 0.35) return 'joy';
  if (value(clip.squint) > 0.4) return 'smug';
  if (value(clip.gazeX) > 0.5) return 'lookRight';
  if (value(clip.gazeX) < -0.5) return 'lookLeft';
  return null;
}

export const LOOK_THRESHOLD = 0.45;

/** The expression on her face for this drawing. */
export function faceFor(context: FaceContext, state: FaceState): Expression {
  if (state.tag === 'Flash') return state.mood;
  if (context.asleep) return 'sleepy';
  const blinking = state.tag === 'Blinking';
  const held = (context.act ? ACT_FACE[context.act] : undefined) ?? (context.petted ? 'joy' : undefined) ?? fromClip(context.clip) ?? (context.alert ? 'wide' : undefined);
  if (held) return blinking && !NO_BLINK.has(held) ? 'blink' : held;
  if (context.mouthOpen) return 'talk';
  if (blinking) return 'blink';
  if (state.tag === 'Mood') return state.mood;
  const look = Number.isFinite(context.look) ? context.look : 0;
  if (look > LOOK_THRESHOLD) return 'lookRight';
  if (look < -LOOK_THRESHOLD) return 'lookLeft';
  return 'neutral';
}
