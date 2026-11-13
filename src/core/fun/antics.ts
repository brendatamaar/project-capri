// The antics director: when she goes off on her own, what she does, and how she takes being poked.
// Every value that varies (time, run ids, random choices) arrives through inputs.
export interface Antic { readonly name: string; readonly dance: boolean }

const antic = (name: string, kind: 'gentle' | 'dance' | 'wild'): Antic => ({ name, dance: kind === 'dance' });
export const ANTICS: readonly Antic[] = [
  antic('jazz', 'dance'), antic('shimmy', 'dance'), antic('headbang', 'dance'), antic('airguitar', 'dance'),
  antic('moonwalk', 'dance'), antic('boombox', 'dance'), antic('robot', 'dance'),
  antic('hiccup', 'gentle'), antic('yawn', 'gentle'), antic('facepalm', 'gentle'), antic('salute', 'gentle'),
  antic('bow', 'gentle'), antic('snack', 'gentle'), antic('coffee', 'gentle'), antic('selfie', 'gentle'),
  antic('shades', 'gentle'), antic('balloon', 'gentle'),
  antic('cartwheel', 'wild'), antic('backflip', 'wild'), antic('sneeze', 'wild'), antic('wobble', 'wild'),
  antic('tantrum', 'wild'), antic('boo', 'wild'), antic('glitchstorm', 'wild'), antic('cannon', 'wild'),
  antic('squeaker', 'wild'), antic('crashout', 'wild'),
];

// Poke her this many times without a long pause and she reacts with this. The last one resets the count.
export const POKE_COMBOS: readonly (readonly [number, string])[] = [[3, 'huff'], [5, 'tantrum'], [8, 'boo']];
export const POKE_WINDOW_MS = 1400;
// These leave the spot she stands on, so they are skipped while she is seated.
export const MOVING_ANTICS: ReadonlySet<string> = new Set(['moonwalk', 'cartwheel', 'backflip', 'balloon', 'crashout', 'glitchstorm']);
export const RECENT = 6;
const WATCHDOG_MS = 20_000;
const FIRST_DELAY_MS = 30_000;
const BURST_GAP_MS = 500;
const DELAY_RANGE: readonly [number, number] = [20_000, 70_000];
// How often a pick starts a burst of follow-ups, and how many follow.
const BURST_CHANCE = 0.2;
const BURST_LENGTH = 2;

type Memory = { readonly recent: readonly string[]; readonly pokes: number; readonly lastPokeAt: number; readonly burst: number };
export type AnticState =
  | ({ readonly tag: 'Resting'; readonly nextAt: number } & Memory)
  | ({ readonly tag: 'Performing'; readonly name: string; readonly runId: number; readonly deadline: number } & Memory);
export type AnticInput =
  | { readonly tag: 'Pulse'; readonly now: number; readonly runId: number; readonly choice: number; readonly delay: number; readonly eligible: boolean; readonly enabled: boolean; readonly music: boolean; readonly seated?: boolean }
  | { readonly tag: 'Poke'; readonly now: number; readonly runId: number; readonly eligible: boolean }
  | { readonly tag: 'Finished'; readonly runId: number; readonly now: number; readonly delay: number; readonly enabled: boolean }
  | { readonly tag: 'Stop'; readonly now: number };
export type AnticCommand = { readonly tag: 'Perform'; readonly name: string; readonly runId: number };
export type AnticStep = { readonly state: AnticState; readonly commands: readonly AnticCommand[] };

export const initialAntics = (now: number): AnticState => ({ tag: 'Resting', nextAt: now + FIRST_DELAY_MS, recent: [], pokes: 0, lastPokeAt: -Infinity, burst: 0 });

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0;
const memory = (state: AnticState): Memory => ({ recent: state.recent, pokes: state.pokes, lastPokeAt: state.lastPokeAt, burst: state.burst });
const wait = (delay: number) => DELAY_RANGE[0] + (DELAY_RANGE[1] - DELAY_RANGE[0]) * unit(delay);

export function candidates(music: boolean, recent: readonly string[], seated = false): readonly Antic[] {
  const allowed = ANTICS.filter(item => !(seated && MOVING_ANTICS.has(item.name)));
  const pool = music ? allowed.filter(item => item.dance) : allowed;
  const fresh = pool.filter(item => !recent.includes(item.name));
  return fresh.length ? fresh : pool;
}

export function stepAntics(state: AnticState, input: AnticInput): AnticStep {
  const unchanged: AnticStep = { state, commands: [] };
  switch (input.tag) {
    case 'Stop':
      return state.tag === 'Resting' ? { state: { ...state, burst: 0 }, commands: [] } : { state: { tag: 'Resting', ...memory(state), burst: 0, nextAt: input.now + FIRST_DELAY_MS }, commands: [] };
    case 'Finished': {
      if (state.tag !== 'Performing' || state.runId !== input.runId) return unchanged;
      const bursting = state.burst > 0 && input.enabled;
      return { state: { tag: 'Resting', ...memory(state), burst: bursting ? state.burst - 1 : 0, nextAt: input.now + (bursting ? BURST_GAP_MS : wait(input.delay)) }, commands: [] };
    }
    case 'Poke': {
      const pokes = input.now - state.lastPokeAt <= POKE_WINDOW_MS ? state.pokes + 1 : 1;
      const counted = { ...state, pokes, lastPokeAt: input.now };
      const combo = POKE_COMBOS.find(([count]) => count === pokes)?.[1];
      const last = POKE_COMBOS[POKE_COMBOS.length - 1][0];
      const reset = pokes >= last ? { ...counted, pokes: 0 } : counted;
      if (!combo || !input.eligible || state.tag === 'Performing') return { state: reset, commands: [] };
      return { state: { tag: 'Performing', ...memory(reset), name: combo, runId: input.runId, deadline: input.now + WATCHDOG_MS }, commands: [{ tag: 'Perform', name: combo, runId: input.runId }] };
    }
    case 'Pulse': {
      if (state.tag === 'Performing') return input.now >= state.deadline ? { state: { tag: 'Resting', ...memory(state), burst: 0, nextAt: input.now + wait(input.delay) }, commands: [] } : unchanged;
      if (!input.eligible || !input.enabled || input.now < state.nextAt) return unchanged;
      const pool = candidates(input.music, state.recent, input.seated);
      if (!pool.length) return unchanged;
      const item = pool[Math.floor(unit(input.choice) * pool.length)];
      const burst = state.burst > 0 ? state.burst : unit(input.delay) < BURST_CHANCE ? BURST_LENGTH : 0;
      return {
        state: { tag: 'Performing', ...memory(state), burst, recent: [...state.recent, item.name].slice(-RECENT), name: item.name, runId: input.runId, deadline: input.now + WATCHDOG_MS },
        commands: [{ tag: 'Perform', name: item.name, runId: input.runId }],
      };
    }
  }
  const exhaustive: never = input; return exhaustive;
}
