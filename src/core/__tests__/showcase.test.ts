import { expect, it } from 'vitest';
import fc from 'fast-check';
import { CATALOG, initialTour, playable, stepTour, type TourState } from '../showcase';
import { ANTICS } from '../fun/antics';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { ACTS } from '../../renderer/js/acting.js';

it('catalog ids are unique and every act and clip really exists', () => {
  expect(new Set(CATALOG.map(entry => entry.id)).size).toBe(CATALOG.length);
  for (const entry of CATALOG.filter(entry => entry.kind === 'act')) expect(ACTS[entry.id], entry.id).toBeDefined();
});

it('the catalog shows every antic', () => {
  for (const item of ANTICS) expect(CATALOG.some(entry => entry.id === item.name), item.name).toBe(true);
});

const ids = fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 12 });

it('a tour plays every id once, in order, then finishes', () => {
  fc.assert(fc.property(ids, list => {
    let result = stepTour(initialTour, { tag: 'Start', ids: list });
    const played: string[] = [];
    for (;;) {
      const play = result.commands.find(command => command.tag === 'Play');
      if (!play || play.tag !== 'Play') break;
      played.push(play.id);
      result = stepTour(result.state, { tag: 'Done', runId: play.runId });
    }
    expect(played).toEqual(list);
    expect(result.state.tag).toBe('Idle');
    expect(result.commands).toEqual([{ tag: 'Finished' }]);
  }));
});

it('a stale Done never advances the tour, and runs never reuse an id', () => {
  fc.assert(fc.property(ids, list => {
    const started = stepTour(initialTour, { tag: 'Start', ids: [...list, 'last'] });
    const state = started.state as Extract<TourState, { tag: 'Playing' }>;
    expect(stepTour(state, { tag: 'Done', runId: state.runId - 1 }).state).toBe(state);
    expect(stepTour(state, { tag: 'Done', runId: state.runId + 1 }).state).toBe(state);
    const stopped = stepTour(state, { tag: 'Stop' }).state;
    expect(stopped.tag).toBe('Idle');
    expect(stepTour(stopped, { tag: 'Done', runId: state.runId }).commands).toEqual([]);
    const again = stepTour(stopped, { tag: 'Start', ids: ['x'] }).state as Extract<TourState, { tag: 'Playing' }>;
    expect(again.runId).toBeGreaterThan(state.runId);
  }));
});

it('starting empty or stopping when idle does nothing', () => {
  expect(stepTour(initialTour, { tag: 'Start', ids: [] }).state).toBe(initialTour);
  expect(stepTour(initialTour, { tag: 'Stop' }).commands).toEqual([]);
  expect(CATALOG.filter(entry => !playable(entry)).every(entry => entry.kind === 'info')).toBe(true);
});
