import { expect, test } from 'vitest';
import fc from 'fast-check';
import { initialCompanion, step, run, DEFAULT_SETTINGS } from '../companion';
import type { Input, Settings } from '../companion';
const settings: Settings = DEFAULT_SETTINGS;
test('fullscreen changes visibility without changing saved preferences', () => {
  const result = step(initialCompanion(settings), { tag: 'FullscreenChanged', fullscreen: true });
  expect(result.state).toEqual({ tag: 'Active', settings, fullscreen: true });
  expect(result.commands).toEqual([{ tag: 'SetHidden', hidden: true }]);
});
test('only user changes persist; desktop updates never persist', () => {
  fc.assert(fc.property(fc.boolean(), fullscreen => {
    expect(step(initialCompanion(settings), { tag: 'FullscreenChanged', fullscreen }).commands.some(command => command.tag === 'PersistSettings')).toBe(false);
  }));
});
test('quiet and size changes preserve unrelated settings', () => {
  fc.assert(fc.property(fc.boolean(), fc.double({ min: 0.3, max: 1.2, noNaN: true }), (quiet, scale) => {
    const result = run(initialCompanion(settings), [{ tag: 'SettingsChanged', patch: { quiet } }, { tag: 'SettingsChanged', patch: { scale } }]);
    expect(result.state).toEqual({ tag: 'Active', settings: { ...settings, quiet, scale }, fullscreen: false });
  }));
});
test('stopped state ignores subsequent inputs', () => {
  const inputs: Input[] = [{ tag: 'Stop' }, { tag: 'ActionChosen', action: 'teleport' }, { tag: 'SettingsChanged', patch: { quiet: true } }];
  expect(run(initialCompanion(settings), inputs).commands).toEqual([]);
});
test('paused state stays hidden when fullscreen ends and suppresses actions',()=>{
  const state={tag:'Active' as const,settings:{...settings,paused:true},fullscreen:true};
  const result=step(state,{tag:'FullscreenChanged',fullscreen:false});expect(result.commands).toEqual([{tag:'SetHidden',hidden:true}]);
  expect(step(result.state,{tag:'ActionChosen',action:'showcase'}).commands).toEqual([]);
});
