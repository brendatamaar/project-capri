// What Capri can do, as data, and the pure sequencing of the guided tour in the showcase window.
export type EntryKind = 'act' | 'scene' | 'clip' | 'info';
export interface Entry { readonly id: string; readonly title: string; readonly group: string; readonly kind: EntryKind; readonly about: string }

const act = (id: string, title: string, group: string, about: string): Entry => ({ id, title, group, kind: 'act', about });
const scene = (id: string, title: string, group: string, about: string): Entry => ({ id, title, group, kind: 'scene', about });
const info = (id: string, title: string, group: string, about: string): Entry => ({ id, title, group, kind: 'info', about });

export const ANTIC_GROUPS = { dance: 'Dance', gag: 'Gags & props', wild: 'Chaos' } as const;

export const CATALOG: readonly Entry[] = [
  scene('intro', 'Materialize', 'Getting around', 'Glitches into existence at a spot.'),
  scene('teleport', 'Teleport', 'Getting around', 'Collapses to a line of light and reappears across the stage.'),
  scene('perch', 'Perch on a window', 'Getting around', 'Sits on a window edge with her legs kicking and rides along if it moves.'),
  scene('fall', 'Fall when a window closes', 'Getting around', 'The ledge disappears and she drops and lands.'),
  scene('lie', 'Lounge on a ledge', 'Getting around', 'Lies back on a window edge, then gets up again.'),
  scene('peek', 'Peek from the edge', 'Getting around', 'Slides in from the screen edge to look at you. Only her head shows.'),
  scene('peekhalf', 'Lean out from the edge', 'Getting around', 'Half of her stays behind the screen edge while she leans out, ducks back and waves.'),
  scene('peekbust', 'Pop up from below', 'Getting around', 'Rises over the floor line, head and shoulders only, then sinks to just her eyes.'),
  scene('idlecycles', 'Shift her weight', 'Getting around', 'Settles from her floating idle onto one hip, then into a loose rock from foot to foot.'),
  scene('throw', 'Get thrown', 'Getting around', 'Flies, tumbles, bounces and recovers. Drag and throw her yourself too.'),
  scene('stow', 'Stow and return', 'Getting around', 'Folds away into her compact form and comes back.'),
  scene('doze', 'Sleep and wake', 'Getting around', 'Nods off, shrinks down to dormant, and wakes up.'),
  scene('wander', 'Wander', 'Getting around', 'Picks somewhere to go by herself.'),

  act('curious', 'Curious', 'Expressions', 'Leans in to look.'), act('look', 'Look around', 'Expressions', 'Glances about.'),
  act('turn', 'Turn around', 'Expressions', 'Whips round to face the other way.'), act('stretch', 'Stretch', 'Expressions', 'A long stretch.'),
  act('glare', 'Glare', 'Expressions', 'Gives you a look.'), act('huff', 'Huff', 'Expressions', 'Sulks.'),
  act('petted', 'Enjoy a pat', 'Expressions', 'Melts into a head pat. Stroke her head to trigger it.'),
  act('alarm', 'Alarm', 'Expressions', 'Bristles at something.'), act('flinch', 'Flinch', 'Expressions', 'Recoils from a failure.'),
  act('shake', 'Shake it off', 'Expressions', 'Dusts herself down.'), act('overheat', 'Overheat', 'Expressions', 'Steams when the CPU runs hot.'),
  act('drained', 'Drained', 'Expressions', 'Sags when the battery gets low.'),

  act('wave', 'Wave', 'Expressions', 'Arm up, forearm waving.'), act('shrug', 'Shrug', 'Expressions', 'Forearms out, shoulders up.'),
  act('think', 'Think', 'Expressions', 'Hand at her chin, weight on one hip.'), act('sway', 'Sway', 'Expressions', 'Rocks to something only she hears.'),
  act('scout', 'Scout', 'Expressions', 'On her toes, a hand shading her eyes.'), act('bounce', 'Bounce', 'Expressions', 'Two small excited bounces.'),
  act('legswing', 'Swing her legs', 'Expressions', 'Both legs up together. Best seen while she is perched.'),

  act('hop', 'Hop', 'Moves', 'A quick hop.'), act('spin', 'Spin', 'Moves', 'A full spin with a smear.'),
  act('plop', 'Plop', 'Moves', 'Drops into place.'), act('crouch', 'Crouch', 'Moves', 'Crouches ready to spring.'),
  act('leap', 'Leap', 'Moves', 'Launches herself.'), act('touchdown', 'Touchdown', 'Moves', 'A superhero landing.'),
  act('split', 'Split', 'Moves', 'Her afterimages come apart.'), act('ko', 'Knockout', 'Moves', 'Thrown too hard: down for the count.'),
  scene('victory', 'Victory', 'Moves', 'Her big finish, played when an agent job completes.'),

  act('jazz', 'Jazz hands', ANTIC_GROUPS.dance, 'Arms up, fingers everywhere.'), act('shimmy', 'Shimmy', ANTIC_GROUPS.dance, 'Side to side.'),
  act('headbang', 'Headbang', ANTIC_GROUPS.dance, 'On ones. Hair and notes everywhere.'),
  act('airguitar', 'Air guitar', ANTIC_GROUPS.dance, 'Shreds with a prop guitar.'),
  act('moonwalk', 'Moonwalk', ANTIC_GROUPS.dance, 'Slides backward, then snaps home.'),
  act('boombox', 'Boombox', ANTIC_GROUPS.dance, 'Dances with a boombox on her shoulder.'),
  act('robot', 'The robot', ANTIC_GROUPS.dance, 'Rigid, stepped, glitchy.'),

  act('hiccup', 'Hiccups', ANTIC_GROUPS.gag, 'Three glitchy hiccups.'), act('yawn', 'Yawn', ANTIC_GROUPS.gag, 'A huge yawn.'),
  act('facepalm', 'Facepalm', ANTIC_GROUPS.gag, 'Sigh.'), act('salute', 'Salute', ANTIC_GROUPS.gag, 'Crisp.'),
  act('bow', 'Take a bow', ANTIC_GROUPS.gag, 'With hearts.'), act('snack', 'Popcorn break', ANTIC_GROUPS.gag, 'Watches you work.'),
  act('coffee', 'Coffee', ANTIC_GROUPS.gag, 'One sip and she is wired.'), act('selfie', 'Selfie', ANTIC_GROUPS.gag, 'Two flashes.'),
  act('shades', 'Shades', ANTIC_GROUPS.gag, 'Sunglasses drop from above.'), act('balloon', 'Balloon', ANTIC_GROUPS.gag, 'Floats up, pops, falls.'),

  act('cartwheel', 'Cartwheel', ANTIC_GROUPS.wild, 'Full rotation across the screen.'), act('backflip', 'Backflip', ANTIC_GROUPS.wild, 'Sticks the landing.'),
  act('sneeze', 'Sneeze', ANTIC_GROUPS.wild, 'Blows herself sideways in confetti.'), act('wobble', 'Dizzy', ANTIC_GROUPS.wild, 'Can barely stay up.'),
  act('tantrum', 'Tantrum', ANTIC_GROUPS.wild, 'Limbs everywhere. Poke her five times quickly.'),
  act('boo', 'BOO!', ANTIC_GROUPS.wild, 'Looms and shouts. Poke her eight times quickly.'),
  act('glitchstorm', 'Glitch storm', ANTIC_GROUPS.wild, 'Comes apart and reassembles.'),
  act('cannon', 'Confetti cannon', ANTIC_GROUPS.wild, 'Recoil included.'), act('squeaker', 'Rubber chicken', ANTIC_GROUPS.wild, 'Bonk.'),
  act('crashout', 'Crash out', ANTIC_GROUPS.wild, 'Pops a fake error card, flattens, then laughs.'),

  scene('zap', 'Zap the pointer', 'Effects', 'Bolts at your cursor. Visual only, and only if you enable it.'),
  scene('satellite', 'Satellite', 'Effects', 'Watches the satellite cross the sky.'),
  scene('uplink', 'Satellite uplink', 'Effects', 'The big sequence with stars and the red light.'),
  scene('possess', 'Window possession', 'Effects', 'Jacks into a window. Off by default on the desktop.'),
  scene('jealous', 'Jealous takeover', 'Effects', 'Glares at another helper on screen.'),
  scene('point', 'Point at something', 'Effects', 'Locks a reticle on a target. Used to show you what needs attention.'),
  scene('working', 'Agent working', 'Effects', 'Sheds data glyphs while an agent is busy.'),
  scene('clones', 'Clones', 'Effects', 'Two afterimage clones follow her (opt-in).'),
  scene('chaosmode', 'Chaos layer', 'Effects', 'Time-driven jitter over her idle (opt-in).'),
  scene('dance', 'Dance to music', 'Effects', 'Eases into a dance while media plays (opt-in).'),

  info('agents', 'Agent board', 'Beyond the stage', 'Tray > Agent board. Live T3Code thread status.'),
  info('approvals', 'Approval requests', 'Beyond the stage', 'She shows that a request is pending and points you to it. You answer in T3Code; she never approves anything.'),
  info('assistant', 'Assistant', 'Beyond the stage', 'Tray > Assistant. Chat with her through the provider you configure.'),
  info('actions', 'Assistant actions', 'Beyond the stage', 'File search and app actions she proposes. Nothing runs without your approval.'),
  info('voice', 'Voice and lip sync', 'Beyond the stage', 'Local speech in and out, with her mouth following the audio.'),
  info('screen', 'Screen preview', 'Beyond the stage', 'Shows you what would be sent before anything leaves your PC.'),
  info('input', 'Approved input jobs', 'Beyond the stage', 'Clicks and keys you approve first, with a stop control.'),
  info('bond', 'Bond and check-ins', 'Beyond the stage', 'Opt-in progress and occasional check-ins.'),
  info('music', 'Music mini player', 'Beyond the stage', 'Opt-in small player for current media.'),
  info('pc', 'React to your PC', 'Beyond the stage', 'Opt-in reactions to heat, battery, devices and games.'),
  info('screens', 'Multi-monitor', 'Beyond the stage', 'Crosses between displays or follows the pointer.'),
  info('art', 'Art packs', 'Beyond the stage', 'Swap her look with a local art pack. Custom sounds work too.'),
  info('access', 'Quiet, pause and reduced motion', 'Beyond the stage', 'Quiet, Pause all activity, and full reduced-motion support.'),
];

export const playable = (entry: Entry) => entry.kind !== 'info';

export type TourState =
  | { readonly tag: 'Idle'; readonly lastRun: number }
  | { readonly tag: 'Playing'; readonly ids: readonly string[]; readonly index: number; readonly runId: number };
export type TourInput =
  | { readonly tag: 'Start'; readonly ids: readonly string[] }
  | { readonly tag: 'Done'; readonly runId: number }
  | { readonly tag: 'Stop' };
export type TourCommand =
  | { readonly tag: 'Play'; readonly id: string; readonly runId: number }
  | { readonly tag: 'Finished' };

export const initialTour: TourState = { tag: 'Idle', lastRun: 0 };

export function stepTour(state: TourState, input: TourInput): { readonly state: TourState; readonly commands: readonly TourCommand[] } {
  const none = { state, commands: [] };
  const lastRun = state.tag === 'Idle' ? state.lastRun : state.runId;
  switch (input.tag) {
    case 'Start': {
      if (!input.ids.length) return none;
      const runId = lastRun + 1;
      return { state: { tag: 'Playing', ids: input.ids, index: 0, runId }, commands: [{ tag: 'Play', id: input.ids[0], runId }] };
    }
    case 'Stop':
      return state.tag === 'Idle' ? none : { state: { tag: 'Idle', lastRun }, commands: [{ tag: 'Finished' }] };
    case 'Done': {
      if (state.tag !== 'Playing' || state.runId !== input.runId) return none;
      const index = state.index + 1, runId = state.runId + 1;
      if (index >= state.ids.length) return { state: { tag: 'Idle', lastRun: runId }, commands: [{ tag: 'Finished' }] };
      return { state: { ...state, index, runId }, commands: [{ tag: 'Play', id: state.ids[index], runId }] };
    }
  }
  const exhaustive: never = input; return exhaustive;
}
