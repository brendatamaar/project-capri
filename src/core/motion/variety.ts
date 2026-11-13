// What she does next, chosen so she doesn't repeat herself. Pure: every random value arrives as a
// unit in [0, 1) from the caller.

const unit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0);

/** One of `pool`, skipping whatever is in `recent` while anything else is left. */
export function pickFresh<T extends string>(pool: readonly T[], recent: readonly string[], choice: number): T | undefined {
  if (!pool.length) return undefined;
  const fresh = pool.filter((name) => !recent.includes(name));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(unit(choice) * from.length)];
}

/** `recent` with `name` added, keeping the last `keep`. */
export function remember(recent: readonly string[], name: string, keep: number): readonly string[] {
  const size = Number.isFinite(keep) ? Math.max(0, Math.floor(keep)) : 0;
  return size ? [...recent, name].slice(-size) : [];
}

// Looping stance cycles in acting.js. The first of each is the default.
export const STAND_CYCLES = ['stand', 'standHip', 'standLoose'] as const;
export const SIT_CYCLES = ['sit', 'sitLean'] as const;
export type StandCycle = (typeof STAND_CYCLES)[number];
export type SitCycle = (typeof SIT_CYCLES)[number];

/** The stance cycle to settle into next: never the one she is already in, when there is another. */
export function nextCycle<T extends string>(pool: readonly T[], current: T, choice: number): T {
  return pickFresh(pool, [current], choice) ?? current;
}

const HOLD_MS: readonly [number, number] = [12_000, 38_000];
/** How long she keeps a stance cycle before shifting to another. */
export function cycleHold(delay: number): number {
  return HOLD_MS[0] + (HOLD_MS[1] - HOLD_MS[0]) * unit(delay);
}

// One-shot acts she throws in when nothing is going on, by stance.
export const FLOURISHES = {
  stand: ['look', 'curious', 'wave', 'shrug', 'think', 'sway', 'scout', 'bounce', 'spin', 'hop', 'split'],
  sit: ['look', 'stretch', 'legswing', 'wave', 'shrug', 'think', 'split'],
} as const;
export const FLOURISH_MEMORY = 4;
