export type Settings = Readonly<{ scale: number; quiet: boolean; stowed: boolean; motion: 'auto' | 'full' | 'reduced'; fps: 30 | 60;
  paused:boolean;wander:boolean;drag:boolean;peek:boolean;pet:boolean;zap:boolean;satellite:boolean;pcReactions:boolean;possess:boolean;follow:boolean;rest:'corner'|'taskbar'|'floor';displayId:number|null;artPack:'auto'|'installed'|'development'|'placeholder';startWithWindows:boolean }>;
export const DEFAULT_SETTINGS:Settings={scale:0.6,quiet:false,stowed:false,motion:'auto',fps:60,paused:false,wander:true,drag:true,peek:true,pet:true,zap:false,satellite:false,pcReactions:false,possess:false,follow:true,rest:'corner',displayId:null,artPack:'auto',startWithWindows:false};
export type State = { readonly tag: 'Active'; readonly settings: Settings; readonly fullscreen: boolean } | { readonly tag: 'Stopped' };
export type Action = 'teleport' | 'sleep' | 'wake' | 'peek' | 'lie' | 'zap' | 'satellite' | 'showcase' | 'sit-icon';
export type Input =
  | { readonly tag: 'SettingsChanged'; readonly patch: Partial<Settings> }
  | { readonly tag: 'FullscreenChanged'; readonly fullscreen: boolean }
  | { readonly tag: 'ActionChosen'; readonly action: Action }
  | { readonly tag: 'Stop' };
export type Command =
  | { readonly tag: 'PersistSettings'; readonly settings: Settings }
  | { readonly tag: 'RenderSettings'; readonly settings: Settings }
  | { readonly tag: 'SetHidden'; readonly hidden: boolean }
  | { readonly tag: 'CharacterAction'; readonly action: Action };
export const initialCompanion = (settings: Settings): State => ({ tag: 'Active', settings, fullscreen: false });
export function step(state: State, input: Input): { state: State; commands: Command[] } {
  if (state.tag === 'Stopped') return { state, commands: [] };
  switch (input.tag) {
    case 'Stop': return { state: { tag: 'Stopped' }, commands: [] };
    case 'SettingsChanged': {
      const settings = { ...state.settings, ...input.patch };
      const commands:Command[]=[{ tag: 'PersistSettings', settings }, { tag: 'RenderSettings', settings }];
      if(settings.paused!==state.settings.paused)commands.push({tag:'SetHidden',hidden:state.fullscreen||settings.paused});
      return { state: { ...state, settings }, commands };
    }
    case 'FullscreenChanged':
      if (input.fullscreen === state.fullscreen) return { state, commands: [] };
      return { state: { ...state, fullscreen: input.fullscreen }, commands: [{ tag: 'SetHidden', hidden: input.fullscreen||state.settings.paused }] };
    case 'ActionChosen':
      return { state, commands: state.fullscreen||state.settings.paused||(input.action==='zap'&&!state.settings.zap)||(input.action==='satellite'&&!state.settings.satellite)||(input.action==='peek'&&!state.settings.peek) ? [] : [{ tag: 'CharacterAction', action: input.action }] };
  }
  const exhaustive: never = input; return exhaustive;
}
export function run(initial: State, inputs: readonly Input[]) {
  return inputs.reduce<{ state: State; commands: Command[] }>((acc, input) => {
    const next = step(acc.state, input); return { state: next.state, commands: [...acc.commands, ...next.commands] };
  }, { state: initial, commands: [] });
}
