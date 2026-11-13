// Pose-to-pose acting, timed the way cel animation is: an act is an exposure sheet,
// a list of drawings, each held for a number of frames. Nothing is tweened. A move is
// a couple of key drawings, an anticipation the other way, sometimes a smear frame, and holds.
//
// Pose fields (anything left out falls back to the stance underneath):
//   head    head tilt, radians, sprite space       mane   mane flare, + bristles, - settles
//   hair    mane sway, px                          tilt   whole-body lean, degrees, screen
//   bob     vertical offset, px, - is up           sx/sy  squash & stretch (sx < 0 mirrors her)
//   arms    both arms, radians, + raises them      armL / armR   one arm each
//   elbows  both forearms on the elbow, radians: + folds the same way the arm raises, - folds down
//           and in toward her body (elbowL / elbowR for one). A reaching arm is straight unless it
//           has its own elbow.
//   off     in directional acts: the arm that isn't reaching (elbowOff for its elbow)
//   reach   in directional acts: the arm on the side the act aims at (x the act's reach,
//           a number or a function for a moving target)
//   long    that same arm drawn longer than it is, 1 = as drawn (longL / longR for one arm)
//   smear   [x, y] trail of head multiples, px     echo   [x, y] green/red afterimages, px
//   kickL / kickR   lower legs swinging outward, radians (when sitting)
//   view    which way she faces: front, quarter, side or back (right sides mirror the left;
//           a pack without the view falls back toward front, so Pip turns with fewer cels)
//   bend    bent at the hips, radians: the legs swing toward the left of the cut-out (lying back)
//   shift   sideways slide on screen, px at full size (mirrored with the act's direction)
// An act with spins: true turns around her middle instead of her usual pivot at the feet.
//   waist   the upper body bends at the waist, radians    hipX   pelvis slide, sprite px
//   crouch  pelvis drop, sprite px (standing: both feet stay planted, the knees bend to allow it)
//   thighL / thighR   a whole leg swung at the hip, radians, + away from her body
//
// A key can carry a cue as third item: capri.js fires effects and sounds when it's reached.
// Directional acts are drawn leaning to screen-right; played with dir -1 they're mirrored.

export const SHEET_FPS = 12;

const rep = (n, keys) => Array.from({ length: n }, () => keys).flat();

export const NEUTRAL = {
  head: 0, mane: 0, hair: 0, tilt: 0, bob: 0, sx: 1, sy: 1, armL: -0.85, armR: -0.85, elbowL: -0.22, elbowR: -0.31, longL: 1, longR: 1,
  smear: [0, 0], echo: [0, 0], kickL: 0, kickR: 0, bend: 0, shift: 0,
  waist: 0, hipX: 0, crouch: 0, thighL: 0, thighR: 0,
};

export const ACTS = {
  // ---- stances (looping) ----

  // standing idle, feet planted: legs straight, weight drifting side to side. The knees
  // bend only for a soft dip as she breathes; a held crouch here reads as a squat.
  // The float is slow-in, slow-out: she hangs at the top and the bottom and passes quickly between.
  stand: {
    loop: true,
    keys: [
      [7, { bob: 0, hair: -2.5, arms: -0.81, elbowL: -0.2, elbowR: -0.3, hipX: 0, waist: 0.02, crouch: 0 }],
      [3, { bob: -1, hair: -1.5, arms: -0.83, elbowL: -0.21, elbowR: -0.3, hipX: 0.6, waist: 0.025, crouch: 0.4 }],
      [3, { bob: -3, hair: 1, arms: -0.87, elbowL: -0.24, elbowR: -0.33, hipX: 1, waist: 0.03, crouch: 0.6 }],
      [7, { bob: -4, hair: 2.5, arms: -0.90, elbowL: -0.27, elbowR: -0.36, hipX: 0.4, waist: 0.02, crouch: 0 }],
      [3, { bob: -3, hair: 1.5, arms: -0.88, elbowL: -0.25, elbowR: -0.34, hipX: -0.4, waist: 0.015, crouch: 0.3 }],
      [3, { bob: -1, hair: -1, arms: -0.84, elbowL: -0.22, elbowR: -0.31, hipX: -1, waist: 0.01, crouch: 0.4 }],
    ],
  },

  // The same idle with her weight on one leg: hip out, a hand resting on it, the other arm hanging,
  // her waist bent back the other way so her head stays over her feet. She shifts into and out of
  // this one by herself (core/motion/variety.ts); every cycle starts on a drawing with bob 0.
  standHip: {
    loop: true,
    keys: [
      [9, { bob: 0, hair: -2, head: 0.04, armL: -0.86, armR: -0.45, elbowL: -0.2, elbowR: -1.35, hipX: 5, waist: -0.05, crouch: 0.8 }],
      [4, { bob: -1, hair: -1, head: 0.045, armL: -0.87, armR: -0.45, elbowL: -0.22, elbowR: -1.37, hipX: 5.4, waist: -0.055, crouch: 1 }],
      [9, { bob: -3, hair: 2, head: 0.05, armL: -0.9, armR: -0.46, elbowL: -0.26, elbowR: -1.4, hipX: 5.8, waist: -0.06, crouch: 0.6 }],
      [4, { bob: -2, hair: 1, head: 0.045, armL: -0.88, armR: -0.45, elbowL: -0.23, elbowR: -1.37, hipX: 5.4, waist: -0.055, crouch: 1 }],
    ],
  },

  // ...and loose: rocking slowly from one foot to the other, her arms swinging a little against it
  standLoose: {
    loop: true,
    keys: [
      [8, { bob: 0, hair: -3, head: -0.05, armL: -0.93, armR: -0.76, elbowL: -0.16, elbowR: -0.42, hipX: -3.2, waist: 0.045, crouch: 1.2 }],
      [3, { bob: -1, hair: -1.5, head: -0.02, armL: -0.89, armR: -0.8, elbowL: -0.2, elbowR: -0.36, hipX: -1.4, waist: 0.03, crouch: 0.5 }],
      [3, { bob: -2, hair: 1.5, head: 0.02, armL: -0.82, armR: -0.87, elbowL: -0.3, elbowR: -0.24, hipX: 1.4, waist: 0.005, crouch: 0.5 }],
      [8, { bob: -2, hair: 3, head: 0.05, armL: -0.76, armR: -0.93, elbowL: -0.42, elbowR: -0.16, hipX: 3.2, waist: -0.01, crouch: 1.2 }],
      [3, { bob: -2, hair: 1.5, head: 0.02, armL: -0.8, armR: -0.89, elbowL: -0.36, elbowR: -0.2, hipX: 1.4, waist: 0.005, crouch: 0.5 }],
      [3, { bob: -1, hair: -1.5, head: -0.02, armL: -0.87, armR: -0.82, elbowL: -0.24, elbowR: -0.3, hipX: -1.4, waist: 0.03, crouch: 0.5 }],
    ],
  },

  // perched on a window, hands down on the ledge, her lower legs swinging like pendulums, one a half
  // beat behind the other (slow and eased in the middle drawings, not a scissor kick)
  sit: {
    loop: true,
    keys: [
      [3, { kickL: 0.22, kickR: -0.04, hair: -1.5, arms: -0.42, elbows: -0.5, waist: 0.05 }],
      [3, { kickL: 0.16, kickR: 0.02, hair: -1, arms: -0.42, elbows: -0.5, waist: 0.05 }],
      [3, { kickL: 0.06, kickR: 0.12, hair: 0, arms: -0.42, elbows: -0.5, waist: 0.06 }],
      [3, { kickL: -0.02, kickR: 0.2, hair: 1, arms: -0.42, elbows: -0.5, waist: 0.06 }],
      [3, { kickL: -0.04, kickR: 0.22, hair: 1.5, arms: -0.42, elbows: -0.5, waist: 0.05 }],
      [3, { kickL: 0.02, kickR: 0.16, hair: 1, arms: -0.42, elbows: -0.5, waist: 0.05 }],
      [3, { kickL: 0.12, kickR: 0.06, hair: 0, arms: -0.42, elbows: -0.5, waist: 0.06 }],
      [3, { kickL: 0.2, kickR: -0.02, hair: -1, arms: -0.42, elbows: -0.5, waist: 0.06 }],
      [3, { kickL: 0.1, kickR: 0.1, arms: -0.42, elbows: -0.5, waist: 0.07 }],
      [10, { kickL: 0.06, kickR: 0.06, head: 0.08, arms: -0.4, elbows: -0.45, waist: 0.09 }], // a pause, head cocked
      [3, { kickL: 0.1, kickR: 0.1, arms: -0.42, elbows: -0.5, waist: 0.07 }],
    ],
  },

  // perched and leaning back on her hands, looking up: slower legs, a long look at the sky
  sitLean: {
    loop: true,
    keys: [
      [6, { kickL: 0.18, kickR: 0.02, hair: -1, head: -0.06, arms: -0.6, elbows: -0.1, waist: -0.08 }],
      [6, { kickL: 0.1, kickR: 0.1, hair: 0, head: -0.08, arms: -0.6, elbows: -0.1, waist: -0.09 }],
      [6, { kickL: 0.02, kickR: 0.18, hair: 1, head: -0.06, arms: -0.6, elbows: -0.12, waist: -0.08 }],
      [6, { kickL: 0.1, kickR: 0.1, hair: 0, head: -0.04, arms: -0.6, elbows: -0.1, waist: -0.08 }],
      [14, { kickL: 0.08, kickR: 0.08, head: -0.12, mane: 0.04, arms: -0.58, elbows: -0.08, waist: -0.1 }],
    ],
  },

  // lying back on her ledge (capri.js turns her): the two reference poses, nothing else. Both
  // glitching red/green. Tucked: coiled with the mane flared huge, arms drawn to nothing,
  // one leg down along the ledge. Sprawl: stretched out with the lead leg long forward,
  // reaching arm out, body stretched flat along the ledge. Coiled is compact and squashed, sprawl elongated. Each pose breathes in place about two seconds, then a short glitch-echo drawing swaps her to the other one.
  lounge: {
    loop: true,
    keys: [
      [14, { bend: 0.85, head: -1.15, mane: 0.5, armL: -0.9, longL: 0.01, armR: -0.1, longR: 0.01, kickL: 0.9, kickR: 0.55, hair: -2, echo: [6, 0], sx: 1.1, sy: 0.88, tilt: -6 }],
      [10, { bend: 0.85, head: -1.08, mane: 0.46, armL: -0.9, longL: 0.01, armR: -0.1, longR: 0.01, kickL: 0.9, kickR: 0.55, hair: -2, echo: [6, 0], sx: 1.1, sy: 0.9, tilt: -6 }],
      [2, { bend: 0.45, head: -0.7, mane: 0.42, armL: -0.2, longL: 0.5, armR: -0.3, longR: 0.5, kickL: 0.5, kickR: 0.15, hair: 0, smear: [-8, 0], echo: [16, -3], sx: 0.99, sy: 1.03, tilt: 2 }],
      [14, { bend: 0.08, head: -0.25, mane: 0.25, armL: 0.9, longL: 1.2, armR: -0.5, longR: 0.6, kickL: 0.06, kickR: -0.18, hair: 3, echo: [10, -2], sx: 0.88, sy: 1.18, tilt: 10 }],
      [10, { bend: 0.08, head: -0.3, mane: 0.22, armL: 0.9, longL: 1.2, armR: -0.5, longR: 0.6, kickL: 0.06, kickR: -0.18, hair: 3, echo: [10, -2], sx: 0.88, sy: 1.2, tilt: 10 }],
      [2, { bend: 0.45, head: -0.7, mane: 0.42, armL: -0.2, longL: 0.5, armR: -0.3, longR: 0.5, kickL: 0.5, kickR: 0.15, hair: 0, smear: [8, 0], echo: [16, -3], sx: 0.99, sy: 1.03, tilt: 2 }],
    ],
  },

  // leaning in from the edge of the screen, toward the middle
  peek: {
    loop: true,
    directional: true,
    // only her head shows: her body is laid out past the edge and her head stays upright against it
    keys: [
      [16, { tilt: 54, head: -0.78, mane: 0.02, hair: -1.5, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [1, { tilt: 54, head: -0.72, smear: [-6, 0], shift: 6, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [14, { tilt: 55, head: -0.62, mane: 0.1, shift: 10, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [1, { tilt: 55, head: -0.72, mane: 0.06, shift: 8, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [12, { tilt: 54, head: -0.92, mane: 0.08, shift: 7, hair: 1.5, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [2, { tilt: 54, head: -0.82, shift: 0, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [8, { tilt: 53, head: -0.84, mane: -0.08, shift: -16, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [2, { tilt: 54, head: -0.78, shift: -4, arms: -0.85, longL: 0.01, longR: 0.01 }],
      [12, { tilt: 54, head: -0.7, mane: 0.04, shift: 5, arms: -0.85, longL: 0.01, longR: 0.01 }],
    ],
  },

  // Half of her behind the edge of the screen, upright (core/motion/peek.ts puts her middle on the
  // edge): she leans out from the waist with a hand on the edge, looks further in, ducks back
  // behind it, comes out again and gives a small wave.
  peekHalf: {
    loop: true,
    directional: true,
    keys: [
      [14, { tilt: 7, head: 0.2, waist: 0.1, mane: 0.04, hair: -1, reach: 0.25, elbow: 1.5, off: -0.9, elbowOff: -0.2 }],
      [1, { tilt: 8, head: 0.26, waist: 0.13, smear: [-6, 0], shift: 5, reach: 0.3, elbow: 1.4, off: -0.9, elbowOff: -0.2 }],
      [12, { tilt: 9, head: 0.3, waist: 0.15, mane: 0.1, shift: 9, reach: 0.32, elbow: 1.35, off: -0.92, elbowOff: -0.2 }],
      [2, { tilt: 7, head: 0.12, waist: 0.08, shift: 2, reach: 0.25, elbow: 1.5, off: -0.9, elbowOff: -0.2 }],
      [8, { tilt: 4, head: 0.05, waist: 0.03, mane: -0.06, shift: -14, reach: 0.1, elbow: 1.7, off: -0.88, elbowOff: -0.25 }],
      [2, { tilt: 6, head: 0.16, waist: 0.08, shift: -2, reach: 0.2, elbow: 1.5, off: -0.9, elbowOff: -0.2 }],
      [2, { tilt: 8, head: 0.24, waist: 0.12, mane: 0.08, shift: 6, reach: 1.3, elbow: 0.9, off: -0.9, elbowOff: -0.2 }],
      ...rep(2, [
        [2, { tilt: 8, head: 0.26, waist: 0.12, shift: 6, reach: 1.35, elbow: 0.2, off: -0.9, elbowOff: -0.2 }],
        [2, { tilt: 8, head: 0.22, waist: 0.12, shift: 6, reach: 1.3, elbow: 0.9, off: -0.9, elbowOff: -0.2 }],
      ]),
      [10, { tilt: 8, head: 0.22, waist: 0.11, shift: 5, hair: 1, reach: 0.25, elbow: 1.5, off: -0.9, elbowOff: -0.2 }],
    ],
  },

  // Up from behind the floor line, head and shoulders only (her feet are far below it): a look
  // each way, then she sinks until just her eyes and mane are over the edge, comes back up and waves.
  peekBust: {
    loop: true,
    directional: true,
    keys: [
      [12, { head: 0.08, mane: 0.04, hair: -1, arms: -0.85, elbows: -0.25 }],
      [1, { head: 0.14, smear: [-6, 0] }],
      [10, { head: 0.2, mane: 0.08, tilt: 1.2 }],
      [1, { head: 0.02, smear: [8, 0] }],
      [10, { head: -0.16, mane: 0.06, tilt: -1.2, hair: 1.5 }],
      [2, { head: -0.04, bob: 8 }],
      [10, { head: 0.04, bob: 34, mane: -0.06 }],
      [2, { head: 0.06, bob: 10, mane: 0.1 }],
      [3, { head: 0.1, bob: -4, mane: 0.12, reach: 1.25, elbow: 0.9 }],
      ...rep(2, [
        [2, { head: 0.12, bob: -3, reach: 1.3, elbow: 0.2 }],
        [2, { head: 0.1, bob: -3, reach: 1.25, elbow: 0.9 }],
      ]),
      [3, { head: 0.08, reach: 0.4, elbow: 1 }],
    ],
  },

  // asleep: arms hanging loose, head dropped; every so often it falls a bit further and she jolts awake
  sleep: {
    loop: true,
    keys: [
      [18, { head: 0.1, mane: -0.12, bob: 2, armL: -0.92, armR: -0.9, elbowL: -0.14, elbowR: -0.2, waist: 0.08 }],
      [1, { head: 0.16, mane: -0.13, bob: 4, armL: -0.95, armR: -0.93, elbowL: -0.12, elbowR: -0.18, waist: 0.128 }],
      [10, { head: 0.21, mane: -0.15, bob: 5, armL: -0.97, armR: -0.95, elbowL: -0.1, elbowR: -0.16, waist: 0.168 }],
      [1, { head: 0.06, mane: -0.08, bob: 0, smear: [0, 8], armL: -0.7, armR: -0.68, elbowL: -0.2, elbowR: -0.26, waist: 0.048 }], // jolt
      [4, { head: 0.08, mane: -0.1, bob: 1, armL: -0.86, armR: -0.84, elbowL: -0.16, elbowR: -0.22, waist: 0.064 }],
    ],
  },

  // waking from sleep: still slumped a beat, a jolt up, a slow blink of a look around, then settled
  wake: {
    priority: 2,
    keys: [
      [2, { head: 0.2, mane: -0.14, bob: 4, armL: -0.95, armR: -0.93, elbowL: -0.12, elbowR: -0.18, waist: 0.15 }],
      [1, { head: -0.06, mane: 0.32, bob: -2, smear: [0, 6], armL: -0.62, armR: -0.6, elbowL: -0.26, elbowR: -0.34, waist: -0.02, sy: 1.04, sx: 0.98 }],
      [3, { head: 0.1, mane: 0.12, armL: -0.74, armR: -0.72, elbowL: -0.3, elbowR: -0.36, waist: 0.04 }],
      [3, { head: -0.07, mane: 0.06, armL: -0.82, armR: -0.8, elbowL: -0.24, elbowR: -0.32, waist: 0.02 }],
      [1, {}],
    ],
  },

  // ---- one-shot acts ----

  // little nods while the words come out, two drawings on threes
  talk: { priority: 0, keys: rep(2, [[3, { head: 0.04, mane: 0.08 }], [3, { head: 0, mane: 0.03 }]]) },

  // the cocked head: anticipation the other way, a smear, then a long hold
  curious: {
    priority: 1,
    directional: true,
    keys: [
      [1, { head: -0.05, mane: 0.04 }],
      [1, { head: 0.12, mane: 0.15, tilt: 0.45, smear: [-12, 4], waist: 0.067, hipX: -0.5 }],
      [10, { head: 0.19, mane: 0.14, tilt: 0.9, waist: 0.084, hipX: -0.9 }],
      [6, { head: 0.16, mane: 0.1, tilt: 0.72, waist: 0.077, hipX: -0.7 }],
      [1, { head: 0.07, tilt: 0.27, waist: 0.01, hipX: -0.3 }],
    ],
  },

  // head snapping from one side to the other, held each time
  look: {
    priority: 1,
    keys: [
      [1, { head: 0.08, smear: [-8, 0], waist: 0.02 }],
      [8, { head: 0.16, waist: 0.04 }],
      [1, { head: 0 }],
      [1, { head: -0.08, smear: [8, 0], waist: -0.02 }],
      [8, { head: -0.16, waist: -0.04 }],
      [1, { head: -0.05, waist: -0.013 }],
      [3, { head: 0 }],
    ],
  },

  // The satellite, the quiet way: a glint, a beat, she notices and snaps to it, her specks
  // catch its light, she reaches for it (slow-in: the drawings bunch up as the hand gets there)
  // and holds. It twinkles back. Her hand drops with a sigh.
  gaze: {
    priority: 1,
    directional: true,
    keys: [
      [3, {}, 'glint'],
      [1, { head: -0.05, bob: 1 }],
      [1, { head: 0.14, mane: 0.12, smear: [-8, 6] }, 'notice'],
      [6, { head: 0.2, mane: 0.1, hair: 0, bob: 0 }],
      [6, { head: 0.23, mane: 0.14, hair: 0, bob: 0 }, 'starlight'],
      [3, { head: 0.23, mane: 0.15, hair: 0, bob: 0, reach: 0.25, long: 1.1, elbow: 0.9 }],
      [3, { head: 0.24, mane: 0.16, hair: 0, bob: 0, reach: 0.55, long: 1.2, elbow: 0.6, waist: -0.08, hipX: 2 }],
      [2, { head: 0.24, mane: 0.16, hair: 0, bob: -1, reach: 0.8, long: 1.3, elbow: 0.3, waist: -0.08, hipX: 2 }],
      [2, { head: 0.25, mane: 0.17, hair: 0, bob: -2, reach: 0.93, long: 1.35, elbow: 0.12, waist: -0.08, hipX: 2 }],
      [14, { head: 0.25, mane: 0.17, hair: 0, bob: -3, reach: 1, long: 1.38, waist: -0.08, hipX: 2 }],
      [1, { head: 0.27, mane: 0.22, hair: 0, bob: -4, reach: 1.02, long: 1.42, waist: -0.08, hipX: 2 }, 'glimmer'],
      [8, { head: 0.25, mane: 0.18, hair: 0, bob: -3, reach: 1, long: 1.38, waist: -0.08, hipX: 2 }],
      [2, { head: 0.14, mane: 0.1, bob: -2, reach: 0.45, long: 1.15, elbow: 0.55 }],
      [2, { head: 0.08, mane: 0.04, bob: -1, reach: 0.12, long: 1.03, elbow: 0.8 }],
      [8, { head: 0.06, mane: -0.04, reach: -0.06, elbow: -0.2 }], // a sigh
      [1, {}],
    ],
  },

  // The satellite, the whole way, after the season's ending: "could we make it up there?"
  // I.   Hush. The glint; her float stops dead and the white specks of her mane lift off,
  //      hanging over her like a sky of her own, linked up like a constellation.
  // II.  She snaps to it and reaches; her stars line up into a road from her fingers to it.
  // III. Anticipation: she sinks and coils, the mane bristles, sparks crawl out of her hand,
  //      cut-in on her eyes.
  // IV.  The red light goes up the road, she's lifted with it, it hits the satellite.
  // V.   It snaps and falls apart. Silence. Then the satellite twinkles back, twice.
  //      Her stars come home and her hand drops.
  uplink: {
    priority: 1,
    directional: true,
    keys: [
      [2, { hair: 0, bob: -2 }, 'glint'],
      [3, { hair: 0, bob: -2 }, 'stars'],
      [3, { hair: 0, bob: -2, mane: 0.05 }],
      [4, { hair: 0, bob: -2, mane: 0.1, head: 0.03 }],
      [1, { hair: 0, bob: -1, head: -0.06 }],
      [1, { hair: 0, bob: -2, head: 0.16, mane: 0.16, smear: [-8, 6] }, 'notice'],
      [5, { hair: 0, bob: -2, head: 0.22, mane: 0.14 }],
      [3, { hair: 0, bob: -2, head: 0.23, mane: 0.15, reach: 0.3, long: 1.15, elbow: 0.9 }],
      [3, { hair: 0, bob: -2, head: 0.24, mane: 0.16, reach: 0.6, long: 1.3, elbow: 0.55, waist: -0.1, hipX: 2 }, 'align'],
      [2, { hair: 0, bob: -3, head: 0.25, mane: 0.17, reach: 0.85, long: 1.42, elbow: 0.25, waist: -0.1, hipX: 2 }],
      [2, { hair: 0, bob: -4, head: 0.25, mane: 0.18, reach: 0.96, long: 1.5, elbow: 0.1, waist: -0.1, hipX: 2 }],
      [9, { hair: 0, bob: -5, head: 0.25, mane: 0.18, reach: 1, long: 1.52, waist: -0.1, hipX: 2 }],
      // the arm pulls back a little as she coils, then shoots out
      [1, { hair: 0, bob: 1, head: 0.24, mane: 0.26, reach: 0.98, long: 1.45, sy: 0.978, sx: 1.014, elbow: 0.3, crouch: 6.5, waist: -0.1, hipX: 2 }, 'charge'],
      [2, { hair: 0, bob: 3, head: 0.23, mane: 0.32, reach: 0.98, long: 1.42, sy: 0.969, sx: 1.018, elbow: 0.3, crouch: 9.1, waist: -0.1, hipX: 2 }],
      [2, { hair: 0, bob: 4, head: 0.23, mane: 0.38, reach: 0.99, long: 1.4, sy: 0.964, sx: 1.022, elbow: 0.35, crouch: 10.4, waist: -0.1, hipX: 2 }],
      [2, { hair: 0, bob: 5, head: 0.22, mane: 0.44, reach: 1, long: 1.4, sy: 0.96, sx: 1.027, echo: [2, 0], elbow: 0.38, crouch: 11.7, waist: -0.1, hipX: 2 }],
      [1, { hair: 0, bob: -10, head: 0.3, mane: 0.7, reach: 1.05, long: 1.78, sy: 1.14, sx: 0.9, echo: [10, -4], smear: [0, 14], waist: -0.1, hipX: 2 }, 'surge'],
      [1, { hair: 0, bob: -16, head: 0.31, mane: 0.86, reach: 1.06, long: 1.7, sy: 1.06, sx: 0.96, echo: [16, -6], waist: -0.1, hipX: 2 }],
      [2, { hair: 0, bob: -19, head: 0.3, mane: 0.8, reach: 1.06, long: 1.66, echo: [9, -3], waist: -0.1, hipX: 2 }],
      [2, { hair: 0, bob: -19, head: 0.28, mane: 0.74, reach: 1.06, long: 1.62, echo: [4, -1], waist: -0.1, hipX: 2 }],
      [5, { hair: 0, bob: -18, head: 0.28, mane: 0.62, reach: 1.05, long: 1.6, waist: -0.1, hipX: 2 }],
      [1, { hair: 0, bob: -15, head: 0.27, mane: 0.5, reach: 1.03, long: 1.55, smear: [0, -8], waist: -0.1, hipX: 2 }, 'break'],
      [7, { hair: 0, bob: -13, head: 0.26, mane: 0.36, reach: 1.02, long: 1.52, waist: -0.1, hipX: 2 }],
      [1, { hair: 0, bob: -13, head: 0.29, mane: 0.4, reach: 1.03, long: 1.54, waist: -0.1, hipX: 2 }, 'twinkle'],
      [4, { hair: 0, bob: -12, head: 0.28, mane: 0.32, reach: 1.02, long: 1.52, waist: -0.1, hipX: 2 }],
      [1, { hair: 0, bob: -12, head: 0.29, mane: 0.34, reach: 1.02, long: 1.53, waist: -0.1, hipX: 2 }, 'glimmer'],
      [7, { hair: 0, bob: -11, head: 0.27, mane: 0.28, reach: 1, long: 1.5, waist: -0.1, hipX: 2 }],
      [2, { bob: -7, head: 0.2, mane: 0.2, reach: 0.7, long: 1.3, elbow: 0.4, waist: -0.1, hipX: 2 }, 'home'],
      [2, { bob: -4, head: 0.14, mane: 0.12, reach: 0.4, long: 1.12, elbow: 0.65 }],
      [2, { bob: -1, head: 0.08, mane: 0.04, reach: 0.12, long: 1.03, elbow: 0.8 }],
      [10, { bob: 1, head: 0.06, mane: -0.06, reach: -0.06, elbow: -0.2 }], // a sigh
      [1, {}],
    ],
  },

  // Job done. Wind-up with the mane pulled in, a stretched smear frame, then the key pose:
  // arms flung up, mane exploding, held while the lines hit. She laughs, head shaking every
  // other drawing, then drops back down with a squash and a small overshoot. She only talks
  // (the "done" panel) once she's coming down, so nothing covers the key pose.
  victory: {
    priority: 4, // nothing cuts this one off
    fps: 24,
    directional: true,
    keys: [
      [3, { sy: 0.955, sx: 1.022, bob: 6, arms: -0.3, mane: -0.15, elbows: -0.9, crouch: 13 }],
      [3, { sy: 0.919, sx: 1.045, bob: 10, arms: -0.5, mane: -0.3, head: -0.04, elbows: -1.3, crouch: 23.4 }, 'gather'],
      [1, { sy: 1.24, sx: 0.85, bob: -16, arms: 0.55, mane: 0.45, smear: [0, 22], echo: [12, 0], elbows: 0.2 }, 'launch'],
      [2, { sy: 1.1, sx: 0.94, bob: -30, arms: 1.45, mane: 0.85, echo: [20, -4], elbows: 0.15, thighL: 0.18, thighR: 0.1, waist: -0.08 }, 'peak'],
      [10, { bob: -36, arms: 1.32, mane: 0.78, head: 0.05, elbows: 0.35, thighL: 0.18, thighR: 0.1, waist: -0.08 }],
      [2, { bob: -34, arms: 1.18, mane: 0.7, head: -0.08, elbows: 0.7, thighL: 0.18, thighR: 0.1, waist: -0.08 }, 'laugh'],
      [2, { bob: -38, arms: 1.36, mane: 0.8, head: 0.08, elbows: 0.45, thighL: 0.18, thighR: 0.1, waist: -0.08 }],
      ...rep(4, [[2, { bob: -34, arms: 1.18, mane: 0.7, head: -0.08, elbows: 0.7, thighL: 0.18, thighR: 0.1, waist: -0.08 }], [2, { bob: -38, arms: 1.36, mane: 0.8, head: 0.08, elbows: 0.45, thighL: 0.18, thighR: 0.1, waist: -0.08 }]]),
      [2, { bob: -24, arms: 0.7, mane: 0.45, sy: 1.04, elbows: 0.5 }, 'speak'],
      [2, { bob: -8, arms: 0.15, mane: 0.2, sy: 1.06, sx: 0.96, smear: [0, -12], elbows: 0.4 }],
      [2, { bob: 3, arms: -0.15, mane: -0.06, sy: 0.946, sx: 1.036, elbows: -0.4, crouch: 15.6 }],
      [3, { bob: 1, arms: 0.05, sy: 0.986, sx: 1.009, elbows: 0.2, crouch: 3.9 }],
      [2, { arms: 0, elbows: 0.1 }],
      [3, { arms: -0.55, elbows: -0.25, mane: 0.06 }],
      [1, {}],
    ],
  },

  // The menace: arm pulled in, then jabbed at your pointer with a jolt of red lightning,
  // held while she grins, and dropped.
  zap: {
    priority: 2,
    fps: 24,
    directional: true,
    keys: [
      [3, { reach: 0.2, long: 0.9, head: -0.06, mane: 0.1, bob: 1, elbow: 1.5, waist: -0.05 }],
      [1, { reach: 1, long: 1.6, head: 0.12, mane: 0.32, smear: [-10, 0], echo: [6, 0], waist: 0.07 }, 'zap'],
      [6, { reach: 1, long: 1.52, head: 0.14, mane: 0.26, waist: 0.07 }],
      [4, { reach: 0.96, long: 1.42, head: 0.18, mane: 0.2, waist: 0.07 }, 'grin'],
      [10, { reach: 0.9, long: 1.36, head: 0.2, mane: 0.16, waist: 0.07 }],
      [3, { reach: 0.5, long: 1.15, head: 0.14, mane: 0.08, elbow: 0.7, waist: -0.05 }],
      [3, { reach: 0.15, head: 0.06, elbow: 1, waist: -0.05 }],
      [1, {}],
    ],
  },

  // Showing you something, the way she'd do it in the show. Her head snaps to it, she coils
  // up leaning away with the arm cocked back behind her, then strikes: one stretched drawing
  // where her construct arm shoots out to more than twice its length, red lightning off the
  // fingertip and the reticle slamming onto it ('lock'). The arm recoils, overshoots, settles.
  point: {
    priority: 2,
    fps: 24,
    directional: true,
    keys: [
      [2, { head: 0.16, mane: 0.15, tilt: 0.45, smear: [-10, 2], waist: 0.017, hipX: -0.5 }, 'spot'],
      [3, { head: 0.2, mane: 0.12, tilt: 0.68, waist: 0.026, hipX: -0.7 }],
      [3, { reach: -0.45, long: 0.8, head: 0.12, tilt: -2.25, sy: 0.955, sx: 1.027, bob: 5, mane: -0.2, elbow: 1.7, waist: -0.085, hipX: 2.3, crouch: 13 }],
      [2, { reach: -0.55, long: 0.75, head: 0.1, tilt: -2.7, sy: 0.937, sx: 1.036, bob: 7, mane: -0.28, elbow: 2, waist: -0.102, hipX: 2.7, crouch: 18.2 }, 'coil'],
      [1, { reach: 0.9, long: 2.3, head: 0.24, tilt: 3.6, sx: 0.94, sy: 1.1, mane: 0.6, smear: [-18, 0], echo: [14, 0], waist: 0.136, hipX: -3.6 }, 'lock'],
      [1, { reach: 1.08, long: 2, head: 0.22, tilt: 3.15, mane: 0.55, echo: [8, 0], waist: 0.119, hipX: -3.1 }],
      [2, { reach: 1.02, long: 1.42, head: 0.19, tilt: 1.8, mane: 0.4, waist: 0.068, hipX: -1.8 }],
      [2, { reach: 0.98, long: 1.58, head: 0.18, tilt: 1.35, mane: 0.3, waist: 0.051, hipX: -1.4 }],
      [2, { reach: 1, long: 1.5, head: 0.17, tilt: 1.35, mane: 0.22, waist: 0.051, hipX: -1.4 }],
    ],
  },

  // ...and held while she explains, leaning in: a jab at it now and then (two taps, like on a
  // screen), and a glance back at you before her eyes go back to it. A stance: it lasts until
  // the guide moves on.
  pointing: {
    loop: true,
    directional: true,
    keys: [
      [12, { reach: 1, long: 1.5, head: 0.17, mane: 0.16, tilt: 1.35, waist: 0.051, hipX: -1.4 }],
      [1, { reach: 1.05, long: 1.8, head: 0.2, mane: 0.24, tilt: 1.8, waist: 0.068, hipX: -1.8 }, 'tap'],
      [2, { reach: 1, long: 1.52, head: 0.18, mane: 0.18, tilt: 1.35, waist: 0.051, hipX: -1.4 }],
      [1, { reach: 1.05, long: 1.8, head: 0.2, mane: 0.24, tilt: 1.8, waist: 0.068, hipX: -1.8 }, 'tap'],
      [10, { reach: 1, long: 1.5, head: 0.17, mane: 0.16, tilt: 1.35, bob: -2, waist: 0.051, hipX: -1.4 }],
      [1, { reach: 1, long: 1.5, head: 0.02, mane: 0.12, tilt: 0.9, smear: [10, 0], waist: 0.034, hipX: -0.9 }],
      [8, { reach: 1, long: 1.5, head: -0.1, mane: 0.1, tilt: 0.9, waist: 0.034, hipX: -0.9 }],
      [1, { reach: 1, long: 1.5, head: 0.12, mane: 0.16, tilt: 1.35, smear: [-10, 0], waist: 0.051, hipX: -1.4 }],
      [8, { reach: 1, long: 1.5, head: 0.17, mane: 0.16, tilt: 1.35, bob: -1, waist: 0.051, hipX: -1.4 }],
    ],
  },

  // Done showing: the line reels back into her finger and the arm is snapped back in.
  unpoint: {
    priority: 2,
    fps: 24,
    directional: true,
    keys: [
      [1, { reach: 0.6, long: 0.9, head: 0.08, tilt: -0.9, smear: [12, 0], mane: 0.1, elbow: 0.9, waist: -0.034, hipX: 0.9 }],
      [2, { reach: 0.1, long: 0.85, head: 0.04, tilt: -0.45, elbow: 1.2, waist: -0.017, hipX: 0.5 }],
      [2, { reach: -0.06, long: 1, tilt: 0, elbow: 0.3 }],
      [1, {}],
    ],
  },

  // Folding herself away into her biochip: a little cock of the head at you, then the mane
  // and the arms pulled in tight, crouching small.
  fold: {
    priority: 3,
    fps: 24,
    keys: [
      [4, { head: 0.12, mane: 0.12, waist: 0.22 }],
      [2, { head: 0.06, mane: -0.18, arms: -0.5, sy: 0.969, sx: 1.018, elbows: -1.2, crouch: 9.1, waist: 0.22 }],
      [3, { mane: -0.36, arms: -0.72, sy: 0.928, sx: 1.036, bob: 4, elbows: -1.8, crouch: 20.8, waist: 0.22 }],
    ],
  },

  // Before she dives into the window she sits on: head cocked at it, the legs swing up, she
  // coils with the mane pulled in and the arms tucked, then stretches down into it.
  dive: {
    priority: 3,
    keys: [
      [1, { head: -0.05 }],
      [5, { head: 0.18, mane: 0.1, kickL: 0.1, kickR: 0.1 }],
      [2, { head: 0.22, mane: -0.15, sy: 0.9, sx: 1.06, kickL: 0.34, kickR: 0.34, arms: -0.6, elbows: -1.2 }],
      [1, { head: 0.1, mane: -0.28, sy: 1.16, sx: 0.88, smear: [0, -14], arms: -0.7, elbows: -1.6 }],
    ],
  },

  // The other minds in her: her green and red copies pull away from her, hang there
  // flickering, and snap back in.
  split: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { echo: [3, 0], mane: 0.1 }],
      [2, { echo: [10, -2], mane: 0.18, head: 0.05 }],
      [2, { echo: [22, -4], mane: 0.22, head: -0.06 }, 'minds'],
      [6, { echo: [34, -5], mane: 0.24, head: 0.06, bob: -3 }],
      [2, { echo: [41, -6], mane: 0.26, head: -0.05, bob: -3 }],
      [6, { echo: [36, -5], mane: 0.24, head: 0.07, bob: -3 }],
      [1, { echo: [12, 0], sx: 1.036, sy: 0.973, bob: -1, crouch: 7.8 }, 'snap'],
      [1, { sx: 0.96, sy: 1.04, mane: 0.3 }],
      [3, { mane: 0.1 }],
      [1, {}],
    ],
  },

  // bristling, flickering, arms flared, leaning toward you; she stares with all her eyes
  alarm: {
    priority: 2,
    directional: true,
    keys: [
      [1, { mane: 0.34, head: 0.1, tilt: 1.35, arms: 0.36, elbows: 1, waist: 0.051, hipX: -3.4, crouch: 5 }, 'stare'],
      [1, { mane: 0.12, head: 0.1, tilt: 1.35, arms: 0.24, elbows: 0.8, waist: 0.051, hipX: 0.6, crouch: 5 }],
      ...rep(14, [[1, { mane: 0.34, head: 0.1, tilt: 1.35, arms: 0.36, elbows: 1, waist: 0.051, hipX: -3.4, crouch: 5 }], [1, { mane: 0.12, head: 0.1, tilt: 1.35, arms: 0.24, elbows: 0.8, waist: 0.051, hipX: 0.6, crouch: 5 }]]),
      [3, { arms: -0.6, elbows: -0.3, mane: 0.08 }],
      [1, {}],
    ],
  },

  // knocked back by a failure, arms snapped in
  flinch: {
    priority: 2,
    keys: [
      [2, { head: 0.22, tilt: 1.8, sx: 0.92, sy: 1.06, mane: -0.12, bob: 5, smear: [-10, 0], arms: -0.32, elbows: 2.2, waist: 0.068, hipX: -1.8 }],
      [5, { head: 0.18, tilt: 1.53, mane: -0.1, bob: 4, arms: -0.22, elbows: 1.9, waist: 0.058, hipX: -1.5 }],
      [1, { head: 0.09, tilt: 0.68, bob: 2, arms: -0.08, elbows: 0.8, waist: 0.026, hipX: -0.7 }],
    ],
  },

  // turnaround: she swings through her side views to a sliver and comes back mirrored
  turn: {
    priority: 3,
    fps: 24,
    flip: true,
    keys: [
      [1, { sx: 0.7, sy: 1.02, echo: [6, 0], view: 'quarter', arms: -0.1, elbows: -0.7 }],
      [1, { sx: 0.25, sy: 1.04, echo: [10, 0], mane: 0.2, view: 'side', arms: -0.2, elbows: -0.7 }],
      [1, { sx: -0.25, sy: 1.04, echo: [10, 0], mane: 0.2, view: 'side', arms: -0.2, elbows: -0.7 }],
      [1, { sx: -0.7, sy: 1.02, view: 'quarter', arms: -0.1, elbows: -0.7 }],
      [2, { sx: -1, view: 'front', arms: 0.04, elbows: -0.2 }],
    ],
  },

  // a full spin on ones: front, side, back, other side, front, arms thrown out
  spin: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.92, sx: 1.05, bob: 3, view: 'front', arms: -0.2, elbows: -0.8 }], // wind-up
      [1, { sx: 0.7, echo: [8, 0], mane: 0.25, view: 'quarter', arms: 0.15, elbows: 0.25 }],
      [1, { sx: 0.25, echo: [14, 0], mane: 0.35, bob: -4, view: 'side', arms: 0.28, elbows: 0.2 }],
      [1, { sx: -0.3, echo: [14, 0], mane: 0.35, bob: -6, view: 'side', arms: 0.3, elbows: 0.15 }],
      [1, { sx: -0.75, echo: [10, 0], mane: 0.3, bob: -6, view: 'back', arms: 0.3, elbows: 0.15 }],
      [1, { sx: -1, echo: [6, 0], bob: -6, view: 'back', arms: 0.28, elbows: 0.2 }],
      [1, { sx: -0.75, echo: [10, 0], mane: 0.3, bob: -5, view: 'back', arms: 0.3, elbows: 0.15 }],
      [1, { sx: -0.3, echo: [14, 0], mane: 0.35, bob: -4, view: 'side', arms: 0.3, elbows: 0.15 }],
      [1, { sx: 0.2, echo: [14, 0], mane: 0.35, bob: -2, view: 'side', arms: 0.25, elbows: 0.2 }],
      [1, { sx: 0.7, echo: [8, 0], mane: 0.25, view: 'quarter', arms: 0.15, elbows: 0.25 }],
      [2, { sx: 1.06, sy: 0.95, mane: 0.15, view: 'front', arms: -0.06, elbows: -0.3 }], // overshoot
      [1, { sx: 1, view: 'front' }],
    ],
  },

  // a hop in place: crouch, stretch, hang at the top with the arms up, squash on landing
  hop: {
    priority: 3,
    fps: 24,
    keys: [
      [3, { sy: 0.937, sx: 1.036, bob: 6, mane: -0.08, arms: -0.3, elbows: -0.6, crouch: 18.2 }],
      [1, { sy: 1.18, sx: 0.9, bob: -10, smear: [0, 16], arms: 0.4, elbows: 0.5 }],
      [2, { sy: 1.08, sx: 0.95, bob: -32, mane: 0.15, arms: 0.55, elbows: 0.7, thighL: 0.24, thighR: 0.24, kickL: -0.38, kickR: -0.38 }],
      [4, { bob: -42, mane: 0.3, arms: 0.6, elbows: 0.8, thighL: 0.24, thighR: 0.24, kickL: -0.38, kickR: -0.38 }],
      [2, { sy: 1.06, bob: -26, mane: 0.2, arms: 0.35, elbows: 0.5, thighL: 0.24, thighR: 0.24, kickL: -0.38, kickR: -0.38 }],
      [1, { sy: 1.12, sx: 0.92, bob: -8, smear: [0, -14], arms: 0.15, elbows: 0.3 }],
      [2, { sy: 0.919, sx: 1.054, bob: 5, mane: -0.1, arms: -0.28, elbows: -0.5, crouch: 23.4 }],
      [2, { sy: 0.973, sx: 1.018, bob: 2, arms: 0.06, elbows: 0.1, crouch: 7.8 }],
      [1, {}],
    ],
  },

  // landing after a fall: the impact pushes the arms down, they bounce back past rest
  land: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.874, sx: 1.099, bob: 6, mane: -0.22, arms: -0.4, elbows: -0.7, crouch: 36.4 }],
      [2, { sy: 0.946, sx: 1.036, bob: 3, mane: -0.1, arms: -0.15, elbows: -0.3, crouch: 15.6 }],
      [2, { sy: 1.05, sx: 0.97, mane: 0.1, arms: 0.1, elbows: 0.2 }],
      [1, {}],
    ],
  },

  // the ledge goes out from under her: a freeze, the arms up, the mane bristling, her legs still
  // dangling where they were, then the drop (capri.js fall)
  startle: {
    priority: 3,
    fps: 24,
    keys: [
      [1, { sy: 1.05, sx: 0.97, mane: 0.5, head: -0.06, smear: [0, -6], arms: 0.3, elbows: 0.3, kickL: 0.1, kickR: 0.1, waist: -0.06 }],
      [4, { sy: 1.03, sx: 0.98, mane: 0.6, head: -0.08, arms: 0.7, elbows: 0.5, kickL: 0.02, kickR: 0.02, waist: -0.06 }],
      [3, { sy: 1.02, mane: 0.55, head: -0.04, arms: 0.8, elbows: 0.6, kickL: 0.02, kickR: 0.02, waist: -0.04 }],
    ],
  },

  // plopping down on a window ledge
  plop: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.85, sx: 1.1, mane: -0.12, kickL: 0.3, kickR: 0.3, arms: -0.55, elbows: -0.7 }],
      [2, { sy: 1.05, sx: 0.97, kickL: 0.12, kickR: 0.12, arms: -0.38, elbows: -0.5 }],
      [1, {}],
    ],
  },

  // a stretch on the ledge: hunched first, then both arms flung up over her head and held there,
  // head back, the mane bristling, legs out; then they drop and she slumps with a sigh
  stretch: {
    priority: 1,
    keys: [
      [3, { arms: -0.55, head: 0.08, mane: -0.1, sy: 0.978, sx: 1.018, elbows: -0.8, crouch: 6.5, waist: 0.1 }],
      [1, { arms: 1.2, head: -0.04, mane: 0.18, sy: 1.06, sx: 0.96, smear: [0, -10], elbows: 1.2, waist: -0.14, thighL: 0.06, thighR: 0.06 }],
      [2, { arms: 1.8, head: -0.12, mane: 0.3, sy: 1.08, sx: 0.95, kickL: 0.22, kickR: 0.22, elbows: 0.9, waist: -0.14, thighL: 0.06, thighR: 0.06 }],
      [12, { arms: 1.92, head: -0.15, mane: 0.36, sy: 1.09, sx: 0.94, kickL: 0.26, kickR: 0.26, elbows: 0.55, waist: -0.14, thighL: 0.06, thighR: 0.06 }],
      [2, { arms: 1.86, head: -0.13, mane: 0.32, sy: 1.08, sx: 0.95, kickL: 0.2, kickR: 0.2, elbows: 0.7, waist: -0.14, thighL: 0.06, thighR: 0.06 }],
      [1, { arms: 0.7, mane: 0.1, smear: [0, 8], elbows: 0.9 }],
      [3, { arms: -0.5, head: 0.1, mane: -0.16, sy: 0.978, sx: 1.018, elbows: -0.7, crouch: 6.5, waist: 0.1 }],
      [4, { arms: -0.42, head: 0.05, mane: -0.08, elbows: -0.5, waist: 0.1 }],
      [3, { arms: -0.68, head: 0.02, mane: -0.04, elbows: -0.45, waist: 0.04 }],
      [1, {}],
    ],
  },

  // while falling: stretched, mane blown up, arms flung up and flailing in a slow rocking rhythm,
  // her knees bent and her legs trailing one after the other
  fall: {
    loop: true,
    fps: 24,
    keys: [
      [3, { sy: 1.12, sx: 0.92, mane: 0.36, head: 0.05, smear: [0, -16], armL: 0.85, armR: 0.6, elbowL: 0.5, elbowR: 0.25, thighL: 0.16, kickL: -0.28, thighR: -0.03, kickR: -0.08, waist: -0.06 }],
      [3, { sy: 1.11, sx: 0.925, mane: 0.31, head: 0, smear: [0, -14], armL: 0.7, armR: 0.72, elbowL: 0.4, elbowR: 0.4, thighL: 0.07, kickL: -0.18, thighR: 0.07, kickR: -0.18, waist: 0 }],
      [3, { sy: 1.1, sx: 0.93, mane: 0.26, head: -0.04, smear: [0, -12], armL: 0.6, armR: 0.85, elbowL: 0.25, elbowR: 0.5, thighL: -0.03, kickL: -0.08, thighR: 0.16, kickR: -0.28, waist: 0.06 }],
      [3, { sy: 1.11, sx: 0.925, mane: 0.31, head: 0, smear: [0, -14], armL: 0.7, armR: 0.72, elbowL: 0.4, elbowR: 0.4, thighL: 0.07, kickL: -0.18, thighR: 0.07, kickR: -0.18, waist: 0 }],
    ],
  },

  // ---- thrown around (capri.js throwHer) ----

  // picked up: a jolt, arms flung up, the mane bristling, stretched for one drawing
  grabbed: {
    priority: 3,
    fps: 24,
    keys: [
      [1, { sy: 1.1, sx: 0.92, mane: 0.55, armL: 0.95, armR: 0.85, head: -0.06, smear: [0, 10], elbowL: 0.9, elbowR: 0.7, waist: -0.08, thighL: 0.12, thighR: 0.08 }],
      [2, { sy: 1.04, sx: 0.97, mane: 0.42, armL: 0.8, armR: 0.72, head: 0.04, elbowL: 0.7, elbowR: 0.8, waist: -0.08, thighL: 0.12, thighR: 0.08 }],
      [2, { mane: 0.3, armL: 0.62, armR: 0.5, elbowL: 0.5, elbowR: 0.6, waist: -0.08, thighL: 0.12, thighR: 0.08 }],
    ],
  },

  // held up by the pointer: dangling from where you grabbed her (she swings around it, capri.js),
  // legs kicking one after the other, arms up and out
  held: {
    loop: true,
    keys: [
      [3, { armL: 0.62, armR: 0.36, mane: 0.22, head: 0.06, kickL: 0.24, kickR: -0.06, hair: -1.5, elbowL: 0.7, elbowR: 1, waist: 0.042, thighL: 0.1, thighR: 0.06 }],
      [3, { armL: 0.4, armR: 0.6, mane: 0.17, head: -0.04, kickL: -0.06, kickR: 0.26, hair: 1.5, elbowL: 1, elbowR: 0.7, waist: -0.028, thighL: 0.1, thighR: 0.06 }],
    ],
  },

  // flying through the air: limbs flailing on ones (her spin, trail and mane come from capri.js)
  tumble: {
    loop: true,
    fps: 24,
    keys: [
      [2, { armL: 1.1, armR: 0.32, mane: 0.5, head: 0.12, kickL: 0.32, kickR: -0.08, sx: 0.95, sy: 1.06, elbowL: 0.3, elbowR: 1.2, thighL: 0.36, thighR: -0.1, waist: 0.2 }],
      [2, { armL: 0.38, armR: 1.15, mane: 0.42, head: -0.1, kickL: -0.08, kickR: 0.34, sx: 0.96, sy: 1.05, elbowL: 1.2, elbowR: 0.3, thighL: -0.1, thighR: 0.36, waist: -0.2 }],
    ],
  },

  // before she jumps over to another screen: she sinks, leaning toward it, arms pulled back
  crouch: {
    priority: 3,
    fps: 24,
    directional: true,
    keys: [
      [2, { sy: 0.964, sx: 1.018, bob: 3, mane: -0.08, armL: -0.25, armR: -0.25, head: 0.08, tilt: 0.9, elbows: -0.9, waist: 0.034, hipX: -0.9, crouch: 10.4 }],
      [3, { sy: 0.919, sx: 1.045, bob: 7, mane: -0.24, armL: -0.5, armR: -0.5, head: 0.15, tilt: 1.8, elbows: -1.3, waist: 0.068, hipX: -1.8, crouch: 23.4 }],
      [3, { sy: 0.901, sx: 1.058, bob: 9, mane: -0.3, armL: -0.56, armR: -0.56, head: 0.18, tilt: 2.25, echo: [2, 0], elbows: -1.5, waist: 0.085, hipX: -2.3, crouch: 28.6 }],
    ],
  },

  // the jump itself: leading with her reaching arm, the other one back, legs tucked, mane streaming
  leap: {
    loop: true,
    fps: 24,
    directional: true,
    keys: [
      [3, { reach: 0.75, long: 1.25, mane: 0.42, head: 0.14, kickL: 0.36, kickR: 0.3, sy: 1.08, sx: 0.94, elbow: 0.25, elbows: -0.9, thighL: 0.3, thighR: -0.12, waist: 0.14 }],
      [3, { reach: 0.82, long: 1.3, mane: 0.5, head: 0.16, kickL: 0.3, kickR: 0.38, sy: 1.1, sx: 0.93, elbow: 0.15, elbows: -1, thighL: 0.3, thighR: -0.12, waist: 0.14 }],
    ],
  },

  // knocked down, lying on her side, drawn in profile (capri.js turns her): limp, the mane flat, a leg twitching
  ko: {
    loop: true,
    keys: [
      // arms limp near the rest pose (-0.85), not out to the side
      [10, { view: 'side', armL: -0.78, armR: -0.7, mane: -0.18, head: 0.16, kickL: 0.2, kickR: 0.05, elbowL: -0.1, elbowR: -0.4, waist: 0.1, thighL: 0.18, thighR: -0.1 }],
      [1, { view: 'side', armL: -0.74, armR: -0.66, mane: -0.14, head: 0.22, kickL: 0.3, kickR: 0.06, elbowL: -0.05, elbowR: -0.45, waist: 0.1, thighL: 0.18, thighR: -0.1 }],
      [7, { view: 'side', armL: -0.78, armR: -0.7, mane: -0.18, head: 0.14, kickL: 0.18, kickR: 0.04, elbowL: -0.1, elbowR: -0.4, waist: 0.1, thighL: 0.18, thighR: -0.1 }],
    ],
  },

  // back on her feet after a crash: her head shaken hard both ways, then the mane flares the dust off
  shake: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { head: 0.2, mane: 0.3, tilt: 0.9, smear: [-10, 0], waist: 0.134, hipX: -0.9 }],
      [2, { head: -0.2, mane: 0.34, tilt: -0.9, smear: [10, 0], waist: -0.134, hipX: 0.9 }],
      ...rep(2, [[2, { head: 0.16, mane: 0.3, tilt: 0.68, waist: 0.106, hipX: -0.7 }], [2, { head: -0.16, mane: 0.32, tilt: -0.68, waist: -0.106, hipX: 0.7 }]]),
      [1, { head: 0.04, mane: 0.6, sy: 1.05, sx: 0.97, waist: 0.02 }, 'dust'],
      [3, { head: 0, mane: 0.32 }],
      [4, { mane: 0.12 }],
      [1, {}],
    ],
  },

  // thrown, and down on her feet anyway: a deep crouch, a hand slammed down, a beat, then up
  touchdown: {
    priority: 3,
    fps: 24,
    keys: [
      [2, { sy: 0.829, sx: 1.135, bob: 8, mane: -0.32, armL: -0.95, armR: 0.28, head: 0.12, smear: [0, -12], elbowL: 0, elbowR: 0.9, crouch: 49.4, waist: 0.42, thighL: 0.2, thighR: 0.3 }],
      [4, { sy: 0.865, sx: 1.099, bob: 7, mane: -0.22, armL: -0.9, armR: 0.22, head: 0.14, elbowL: 0, elbowR: 0.9, crouch: 39, waist: 0.42, thighL: 0.2, thighR: 0.3 }],
      [6, { sy: 0.883, sx: 1.081, bob: 6, mane: -0.16, armL: -0.85, armR: 0.2, head: 0.1, elbowL: -0.1, elbowR: 0.9, crouch: 33.8, waist: 0.42, thighL: 0.2, thighR: 0.3 }],
      [1, { sy: 1.12, sx: 0.92, bob: -6, mane: 0.36, armL: 0.2, armR: 0.3, smear: [0, 14], elbowL: 0.5, elbowR: 0.6 }],
      [2, { sy: 1.03, sx: 0.98, bob: -2, mane: 0.26 }],
      [3, { mane: 0.12 }],
      [1, {}],
    ],
  },

  // ---- your PC (pc.js) ----

  // overheating with your processor: head thrown back, fanning herself with one hand, heat coming
  // off her ('steam'), then a slump
  overheat: {
    priority: 2,
    keys: [
      [2, { head: -0.08, mane: 0.3, armL: -0.3, armR: 1.25, tilt: -0.45, elbowL: -1.2, elbowR: 1.6, waist: -0.087, hipX: 5.5 }, 'steam'],
      [2, { head: -0.1, mane: 0.36, armL: -0.3, armR: 0.82, tilt: -0.68, elbowL: -1.2, elbowR: 2.2, waist: -0.096, hipX: 5.7 }],
      ...rep(4, [[2, { head: -0.08, mane: 0.32, armL: -0.3, armR: 1.25, tilt: -0.45, elbowL: -1.2, elbowR: 1.6, waist: -0.087, hipX: 5.5 }, 'steam'], [2, { head: -0.1, mane: 0.38, armL: -0.3, armR: 0.82, tilt: -0.68, elbowL: -1.2, elbowR: 2.2, waist: -0.096, hipX: 5.7 }]]),
      [8, { head: 0.08, mane: 0.06, armL: -0.42, armR: -0.4, bob: 3, elbows: -0.6, waist: 0.1 }],
      [1, {}],
    ],
  },

  // the battery running out: she sags, head down, arms hanging, mane flat
  drained: {
    priority: 2,
    keys: [
      [3, { head: 0.12, mane: -0.12, arms: -0.3, bob: 2, elbows: -0.4, waist: 0.144, crouch: 1.6 }],
      [14, { head: 0.24, mane: -0.26, arms: -0.55, bob: 6, sy: 0.982, sx: 1.009, elbows: -0.25, crouch: 10, waist: 0.288 }],
      [1, { head: 0.08, mane: -0.1, arms: -0.2, bob: 1, smear: [0, 8], elbows: -0.3, waist: 0.096, crouch: 0.8 }], // a start
      [10, { head: 0.2, mane: -0.22, arms: -0.5, bob: 5, elbows: -0.25, waist: 0.24, crouch: 4 }],
      [2, { head: 0.1, arms: -0.2, elbows: -0.3, waist: 0.12 }],
      [1, {}],
    ],
  },

  // ---- jealous (bond.js) ----

  // glaring at you over another AI: she snaps to it, leans in, mane bristling, holds it, and hisses
  glare: {
    priority: 2,
    directional: true,
    keys: [
      [1, { head: 0.1, mane: 0.32, tilt: 0.9, smear: [-8, 0], waist: 0.034, hipX: -0.9 }, 'notice'],
      [9, { head: 0.18, mane: 0.36, tilt: 1.35, armL: -0.22, armR: -0.22, elbows: -1.5, waist: 0.101, hipX: 3.6 }],
      [1, { head: 0.22, mane: 0.46, tilt: 1.62, armL: -0.3, armR: -0.3, echo: [4, 0], elbows: -1.7, waist: 0.111, hipX: 3.4 }, 'hiss'],
      [12, { head: 0.19, mane: 0.38, tilt: 1.35, armL: -0.25, armR: -0.25, elbows: -1.5, waist: 0.101, hipX: 3.6 }],
      [2, { head: 0.1, mane: 0.2, tilt: 0.45, waist: 0.017, hipX: -0.5 }],
      [1, {}],
    ],
  },

  // sulking: head turned away from you, mane down, arms in
  // Petted: she leans her head into your hand, a little squashed with it, her mane bristling and
  // settling on threes, held while the strokes go on
  petted: {
    priority: 1,
    directional: true,
    keys: [
      [2, { head: 0.1, mane: 0.12, tilt: 0.45, sy: 0.98, sx: 1.01, waist: 0.017, hipX: -0.5 }],
      [3, { head: 0.22, mane: 0.22, tilt: 1.13, sy: 0.982, sx: 1.014, bob: 2, waist: 0.043, hipX: -1.1, crouch: 5.2 }],
      [3, { head: 0.24, mane: 0.15, tilt: 1.35, sy: 0.982, sx: 1.014, bob: 3, waist: 0.051, hipX: -1.4, crouch: 5.2 }],
      [3, { head: 0.23, mane: 0.24, tilt: 1.17, sy: 0.984, sx: 1.011, bob: 2, waist: 0.044, hipX: -1.2, crouch: 4.6 }],
      [3, { head: 0.25, mane: 0.15, tilt: 1.35, sy: 0.982, sx: 1.014, bob: 3, waist: 0.051, hipX: -1.4, crouch: 5.2 }],
      [3, { head: 0.23, mane: 0.23, tilt: 1.17, sy: 0.984, sx: 1.011, bob: 2, waist: 0.044, hipX: -1.2, crouch: 4.6 }],
      [3, { head: 0.24, mane: 0.16, tilt: 1.35, sy: 0.982, sx: 1.014, bob: 3, waist: 0.051, hipX: -1.4, crouch: 5.2 }],
      [2, { head: 0.12, mane: 0.08, tilt: 0.54, waist: 0.02, hipX: -0.5 }],
      [1, {}],
    ],
  },

  huff: {
    priority: 2,
    directional: true,
    keys: [
      [1, { head: -0.06, mane: 0.1, smear: [8, 0] }],
      [3, { head: -0.16, mane: -0.08, tilt: -0.9, armL: -0.28, armR: -0.28, elbows: -2.2, waist: -0.124, hipX: -5.1 }],
      [16, { head: -0.18, mane: -0.14, tilt: -1.13, armL: -0.32, armR: -0.32, bob: 2, elbows: -2.3, waist: -0.133, hipX: -4.9 }],
      [2, { head: -0.1, mane: -0.06, tilt: -0.45, waist: -0.017, hipX: 0.5 }],
      [1, {}],
    ],
  },

  // ---- small things she does when nothing is going on (capri.js flourish) ----

  // a wave: the arm comes up bent, then the forearm does the waving while she leans into it
  wave: {
    priority: 1,
    directional: true,
    keys: [
      [2, { reach: 0.3, elbow: 1.2, head: 0.05, sy: 0.985, crouch: 3 }],
      [2, { reach: 1.5, elbow: 0.5, head: 0.1, tilt: 0.9, mane: 0.1, bob: -3, waist: 0.03, hipX: -1 }],
      ...rep(3, [
        [2, { reach: 1.55, elbow: 1, head: 0.12, tilt: 1.1, bob: -3, waist: 0.035, hipX: -1.2 }],
        [2, { reach: 1.45, elbow: 0.1, head: 0.08, tilt: 0.9, bob: -2, waist: 0.03, hipX: -1 }],
      ]),
      [3, { reach: 1.5, elbow: 0.6, head: 0.1, tilt: 0.9, bob: -2, waist: 0.03, hipX: -1 }],
      [2, { reach: 0.5, elbow: 0.9, head: 0.04 }],
      [2, { reach: -0.4, elbow: 0.2 }],
      [1, {}],
    ],
  },

  // a shrug: forearms turned out and up, shoulders lifted with her, head to one side, then dropped
  shrug: {
    priority: 1,
    keys: [
      [2, { arms: -0.7, elbows: 0.3, head: 0.03 }],
      [2, { arms: -0.5, elbows: 1.3, bob: -3, head: 0.14, mane: 0.06, sy: 1.015, waist: 0.02 }],
      [8, { arms: -0.45, elbows: 1.45, bob: -4, head: 0.16, mane: 0.04, sy: 1.02, waist: 0.02, hipX: 1.5 }],
      [2, { arms: -0.6, elbows: 0.8, bob: -1, head: 0.08 }],
      [3, { arms: -0.88, elbows: -0.3, bob: 1, sy: 0.99, crouch: 2 }],
      [1, {}],
    ],
  },

  // thinking: a hand at her chin, the other arm folded across her, weight on one hip; a glance
  // the other way, then a little lift when she's got it
  think: {
    priority: 1,
    directional: true,
    keys: [
      [3, { head: -0.04, reach: 0.1, elbow: 1.4 }],
      [3, { head: 0.1, reach: 0.08, elbow: 2.45, off: -0.5, elbowOff: -1.4, tilt: -0.6, waist: -0.03, hipX: 2.5 }],
      [14, { head: 0.14, reach: 0.08, elbow: 2.5, off: -0.5, elbowOff: -1.45, tilt: -0.9, waist: -0.04, hipX: 3, mane: -0.03 }],
      [1, { head: 0.02, reach: 0.08, elbow: 2.5, off: -0.5, elbowOff: -1.45, tilt: -0.9, waist: -0.04, hipX: 3, smear: [6, 0] }],
      [10, { head: -0.1, reach: 0.08, elbow: 2.5, off: -0.5, elbowOff: -1.45, tilt: -0.9, waist: -0.04, hipX: 3 }],
      [3, { head: 0.12, reach: 0.3, elbow: 1.9, mane: 0.1, bob: -2, sy: 1.015 }],
      [2, { head: 0.04, reach: -0.3, elbow: 0.4 }],
      [1, {}],
    ],
  },

  // swaying to something only she hears: hips one way, shoulders and head the other, arms loose
  sway: {
    priority: 1,
    keys: [
      ...rep(3, [
        [4, { hipX: -3.5, waist: 0.05, tilt: -0.9, head: -0.07, hair: -3, armL: -0.95, armR: -0.75, elbowL: -0.15, elbowR: -0.4, crouch: 1.5 }],
        [2, { hipX: 0, waist: 0, tilt: 0, head: 0, hair: 0, arms: -0.85, elbows: -0.25, bob: -2 }],
        [4, { hipX: 3.5, waist: -0.05, tilt: 0.9, head: 0.07, hair: 3, armL: -0.75, armR: -0.95, elbowL: -0.4, elbowR: -0.15, crouch: 1.5 }],
        [2, { hipX: 0, waist: 0, tilt: 0, head: 0, hair: 0, arms: -0.85, elbows: -0.25, bob: -2 }],
      ]),
      [1, {}],
    ],
  },

  // looking for something far off: up on her toes, a hand shading her eyes, one way then the other
  scout: {
    priority: 1,
    directional: true,
    keys: [
      [2, { sy: 0.98, sx: 1.01, crouch: 5, reach: 0.2, elbow: 1.4 }],
      [2, { sy: 1.03, sx: 0.985, bob: -8, reach: 0.6, elbow: 2.3, head: 0.12, tilt: 1.35, mane: 0.1, waist: 0.05, hipX: -1.4 }],
      [10, { sy: 1.03, sx: 0.985, bob: -9, reach: 0.62, elbow: 2.35, head: 0.16, tilt: 1.8, waist: 0.07, hipX: -1.8 }],
      [1, { sy: 1.03, sx: 0.985, bob: -9, reach: 0.62, elbow: 2.35, head: 0, smear: [10, 0] }],
      [8, { sy: 1.03, sx: 0.985, bob: -9, reach: 0.62, elbow: 2.35, head: -0.14, tilt: -1.35, waist: -0.05, hipX: 1.4 }],
      [3, { bob: -3, reach: 0.3, elbow: 1.2, head: -0.04 }],
      [2, { bob: 1, sy: 0.985, reach: -0.4, elbow: 0.2, crouch: 3 }],
      [1, {}],
    ],
  },

  // two small excited bounces, forearms tucked up, with a squash on each landing
  bounce: {
    priority: 1,
    keys: [
      ...rep(2, [
        [2, { sy: 0.96, sx: 1.03, bob: 3, arms: -0.6, elbows: -0.7, crouch: 9 }],
        [1, { sy: 1.08, sx: 0.95, bob: -8, arms: -0.2, elbows: 0.9, mane: 0.12 }],
        [2, { bob: -14, arms: -0.1, elbows: 1.2, mane: 0.2, thighL: 0.1, thighR: 0.1 }],
        [1, { sy: 1.04, bob: -5, arms: -0.3, elbows: 0.8 }],
      ]),
      [2, { sy: 0.95, sx: 1.035, bob: 3, arms: -0.7, elbows: -0.5, crouch: 10 }],
      [2, { sy: 1.01, arms: -0.8, elbows: -0.2, crouch: 2 }],
      [1, {}],
    ],
  },

  // on her ledge: both legs swung up together and let fall, twice, leaning back as they go up
  legswing: {
    priority: 1,
    keys: [
      [3, { kickL: -0.05, kickR: -0.05, arms: -0.5, elbows: -0.4, waist: 0.08 }],
      ...rep(2, [
        [2, { kickL: 0.3, kickR: 0.3, arms: -0.55, elbows: -0.2, waist: -0.06, head: -0.05, mane: 0.06 }],
        [3, { kickL: 0.42, kickR: 0.4, arms: -0.58, elbows: -0.15, waist: -0.1, head: -0.08, mane: 0.1 }],
        [2, { kickL: 0.2, kickR: 0.22, arms: -0.5, elbows: -0.3, waist: 0, head: 0 }],
        [3, { kickL: -0.06, kickR: -0.04, arms: -0.44, elbows: -0.5, waist: 0.08, head: 0.05 }],
      ]),
      [1, {}],
    ],
  },

  // ---- antics: original sheets for the chaos director (core/fun/antics.ts) ----
  // Cues: fx.<confetti|note|heart|star|spark|smoke|flash>, pop.<WORD>, prop.<name>, sfx.<sound>, glitch.
  // A key may carry several, joined with "|".

  jazz: {
    priority: 1,
    keys: [
      [3, { arms: -0.3, sy: 0.982, sx: 1.014, bob: 3, elbows: -0.7, crouch: 5.2 }],
      [2, { armL: 1.25, armR: 1.1, sy: 1.04, sx: 0.97, bob: -6, mane: 0.14, elbowL: 0.9, elbowR: 1.1 }, 'sfx.pop|fx.star'],
      ...rep(4, [
        [2, { armL: 1.35, armR: 1.0, tilt: -1.35, head: -0.1, hair: -3, shift: -4, elbowL: 0.6, elbowR: 1.3, waist: 0.013, hipX: -4.2 }],
        [2, { armL: 1.0, armR: 1.35, tilt: 1.35, head: 0.1, hair: 3, shift: 4, elbowL: 1.3, elbowR: 0.6, waist: -0.013, hipX: 4.2 }],
      ]),
      [3, { armL: 1.5, armR: 1.5, mane: 0.22, bob: -8, smear: [0, 6], elbows: 0.5 }, 'fx.star'],
      [8, { armL: 1.45, armR: 1.45, head: 0.05, mane: 0.16, bob: -6, elbows: 0.6 }],
      [2, { arms: -0.4, sy: 0.986, bob: 2, elbows: -0.6, crouch: 3.9 }],
      [1, {}],
    ],
  },

  shimmy: {
    priority: 1,
    keys: [
      ...rep(5, [
        [2, { shift: -10, tilt: -1.8, armL: -0.3, armR: -0.9, head: -0.06, kickL: 0.14, hair: -3, elbowL: 1.4, elbowR: -0.3, waist: 0.112, hipX: -7.2, crouch: 2 }],
        [2, { shift: 10, tilt: 1.8, armL: -0.9, armR: -0.3, head: 0.06, kickR: 0.14, hair: 3, elbowL: -0.3, elbowR: 1.4, waist: -0.112, hipX: 7.2, crouch: 2 }],
      ]),
      [3, { sy: 0.986, sx: 1.009, crouch: 3.9 }],
      [1, {}],
    ],
  },

  headbang: {
    priority: 1,
    fps: 24,
    keys: [
      [4, { head: -0.28, mane: 0.1, arms: -0.5, elbows: -1.2, waist: -0.154, crouch: 1, thighL: 0.1, thighR: 0.1 }, 'sfx.pop'],
      ...rep(7, [
        [3, { head: 0.34, mane: 0.28, bob: 5, sy: 0.982, hair: 6, smear: [0, 8], arms: -0.4, elbows: 1.9, crouch: 11.2, waist: 0.187, thighL: 0.1, thighR: 0.1 }, 'fx.note'],
        [2, { head: 0.3, mane: 0.18, bob: 4, arms: -0.4, elbows: 2, waist: 0.165, crouch: 6, thighL: 0.1, thighR: 0.1 }],
        [3, { head: -0.26, mane: -0.08, bob: -2, sy: 1.03, hair: -6, arms: -0.4, elbows: 2.5, waist: -0.143, crouch: 1, thighL: 0.1, thighR: 0.1 }],
        [2, { head: -0.22, mane: 0, arms: -0.4, elbows: 2.4, waist: -0.121, crouch: 1, thighL: 0.1, thighR: 0.1 }],
      ]),
      [6, { head: 0.12, mane: 0.2, arms: 1.2, bob: -6, elbows: 1, waist: 0.066, crouch: 1, thighL: 0.1, thighR: 0.1 }, 'pop.ROCK!'],
      [4, { head: 0 }],
      [1, {}],
    ],
  },

  airguitar: {
    priority: 1,
    keys: [
      [3, { armL: 0.4, armR: -0.2, tilt: -1.35, sy: 0.986, elbowL: 0.35, elbowR: -1.5, waist: -0.051, hipX: 1.4, crouch: 8.9, thighL: 0.14, thighR: 0.2 }, 'prop.guitar'],
      ...rep(5, [
        [2, { armL: 0.42, armR: -0.08, head: 0.14, hair: 2, bob: 1, elbowL: 0.35, elbowR: -1.3, crouch: 5, thighL: 0.14, thighR: 0.2, waist: 0.042 }, 'fx.note|sfx.twang'],
        [2, { armL: 0.42, armR: -0.48, head: 0.05, hair: -2, bob: -2, elbowL: 0.35, elbowR: -1.7, crouch: 5, thighL: 0.14, thighR: 0.2, waist: 0.015 }],
      ]),
      [3, { armL: 0.55, armR: 1.4, tilt: -3.6, head: -0.2, mane: 0.26, bob: -10, smear: [8, -4], elbowL: 0.3, elbowR: 0.35, waist: -0.356, hipX: 3.6, crouch: 5, thighL: 0.14, thighR: 0.2 }, 'fx.spark|sfx.twang'],
      [8, { armL: 0.5, armR: 1.5, tilt: -2.7, head: -0.22, mane: 0.2, bob: -9, elbowL: 0.3, elbowR: 0.4, waist: -0.322, hipX: 2.7, crouch: 5, thighL: 0.14, thighR: 0.2 }, 'pop.YEAH'],
      [3, { arms: -0.5, tilt: 0.45, elbows: -0.7, waist: 0.017, hipX: -0.5 }],
      [1, {}],
    ],
  },

  robot: {
    priority: 1,
    keys: [
      [4, { armL: 0, armR: -1.3, head: 0.2, elbowL: 1.57, elbowR: 0 }, 'sfx.tick'],
      [4, { armL: -1.3, armR: 0, head: -0.2, elbowL: 0, elbowR: 1.57 }, 'sfx.tick'],
      [4, { armL: 1.5, armR: 1.5, head: 0, elbows: -1.57 }, 'sfx.tick'],
      [4, { armL: 0, armR: 0, head: 0.2, sy: 0.969, elbows: 1.57, crouch: 9.1 }, 'sfx.tick'],
      [4, { armL: 0, armR: 0, head: -0.2, sy: 1.05, elbows: -1.57 }, 'sfx.tick'],
      [2, { armL: 0, armR: 1.5, tilt: 2.25, elbowL: 1.57, elbowR: 0, waist: 0.085, hipX: -2.3 }, 'glitch'],
      [2, { armL: 1.5, armR: 0, tilt: -2.25, elbowL: 0, elbowR: 1.57, waist: -0.085, hipX: 2.3 }, 'glitch'],
      [6, { arms: -0.85, head: 0, tilt: 0, elbows: -0.22 }, 'sfx.tick'],
      [1, {}],
    ],
  },

  moonwalk: {
    priority: 1,
    directional: true,
    keys: [
      [3, { tilt: -1.8, sy: 0.986, arms: -0.5, elbows: -1, waist: -0.068, hipX: 1.8, crouch: 3.9 }],
      [3, { shift: -14, kickL: 0.3, tilt: 1.35, armL: -0.3, armR: -1.1, elbowL: 1, elbowR: -0.2, waist: 0.051, hipX: -6.4, thighL: 0.25 }, 'sfx.squeak'],
      [3, { shift: -30, kickR: 0.3, tilt: 1.35, armL: -1.1, armR: -0.3, elbowL: -0.2, elbowR: 1, waist: 0.051, hipX: 3.6, thighR: 0.25 }],
      [3, { shift: -46, kickL: 0.3, tilt: 1.35, armL: -0.3, armR: -1.1, elbowL: 1, elbowR: -0.2, waist: 0.051, hipX: -6.4, thighL: 0.25 }, 'sfx.squeak'],
      [3, { shift: -62, kickR: 0.3, tilt: 1.35, armL: -1.1, armR: -0.3, elbowL: -0.2, elbowR: 1, waist: 0.051, hipX: 3.6, thighR: 0.25 }],
      [3, { shift: -78, kickL: 0.3, tilt: 1.35, armL: -0.3, armR: -1.1, elbowL: 1, elbowR: -0.2, waist: 0.051, hipX: -6.4, thighL: 0.25 }, 'sfx.squeak'],
      [6, { shift: -84, tilt: -3.15, armR: 1.35, armL: -1, head: -0.14, sy: 1.03, elbowL: -0.3, elbowR: 0.9, waist: -0.119, hipX: 3.1 }, 'fx.star'],
      [3, { shift: -40, tilt: 3.15, smear: [20, 0], waist: 0.119, hipX: -3.1 }],
      [2, { shift: -8, tilt: 0.9, waist: 0.034, hipX: -0.9 }],
      [1, {}],
    ],
  },

  cartwheel: {
    priority: 2,
    fps: 24,
    spins: true,
    directional: true,
    keys: [
      [4, { sy: 0.9, sx: 1.08, bob: 6, arms: 1.2, elbows: 0.4, crouch: 18 }, 'sfx.boing'],
      [2, { tilt: 45, shift: 14, bob: -14, arms: 1.45, smear: [12, 0], hair: 8, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [2, { tilt: 90, shift: 28, bob: -24, arms: 1.45, hair: 8, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [3, { tilt: 135, shift: 42, bob: -32, arms: 1.45, hair: 8, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [3, { tilt: 180, shift: 56, bob: -36, arms: 1.45, hair: 6, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [3, { tilt: 225, shift: 70, bob: -32, arms: 1.45, hair: 6, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [2, { tilt: 270, shift: 84, bob: -24, arms: 1.45, hair: 6, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [2, { tilt: 315, shift: 98, bob: -12, arms: 1.45, hair: 4, elbows: 0.05, thighL: 0.55, thighR: 0.55, kickL: 0.1, kickR: 0.1 }],
      [3, { tilt: 360, shift: 110, bob: 7, sy: 0.88, sx: 1.1, arms: 0.1, elbows: 0.5, crouch: 18 }, 'fx.smoke|sfx.pop'],
      [6, { tilt: 360, shift: 110, bob: -4, sy: 1.04, sx: 0.97, arms: 1.3, mane: 0.2, elbows: 0.7 }, 'fx.star'],
      [4, { tilt: 360, shift: 66 }],
      [3, { tilt: 360, shift: 20 }],
      [1, {}],
    ],
  },

  backflip: {
    priority: 2,
    fps: 24,
    spins: true,
    keys: [
      [5, { sy: 0.86, sx: 1.1, bob: 9, arms: -0.2, head: 0.14, elbows: -0.8, crouch: 20 }],
      [2, { sy: 1.14, sx: 0.92, bob: -28, arms: 1.45, smear: [0, 18], elbows: 0.2 }, 'sfx.boing'],
      [1, { tilt: -60, bob: -58, arms: 1.45, elbows: 0.2 }],
      [2, { tilt: -120, bob: -78, arms: 0.6, elbows: 1.6, thighL: 0.75, thighR: 0.75, kickL: -1.2, kickR: -1.2 }],
      [3, { tilt: -180, bob: -86, arms: 0.2, elbows: 2.2, thighL: 0.75, thighR: 0.75, kickL: -1.2, kickR: -1.2 }],
      [2, { tilt: -240, bob: -78, arms: 0.2, elbows: 2.2, thighL: 0.75, thighR: 0.75, kickL: -1.2, kickR: -1.2 }],
      [1, { tilt: -300, bob: -54, arms: 0.8, elbows: 1, thighL: 0.75, thighR: 0.75, kickL: -1.2, kickR: -1.2 }],
      [2, { tilt: -360, bob: -22, arms: 1.3, smear: [0, -12], elbows: 0.4 }],
      [3, { tilt: -360, bob: 8, sy: 0.84, sx: 1.12, arms: 0.4, elbows: 0.8, crouch: 20 }, 'fx.smoke|sfx.pop'],
      [8, { tilt: -360, bob: -3, sy: 1.04, arms: 1.45, mane: 0.22, elbows: 0.7 }, 'pop.TEN!|fx.star'],
      [4, { tilt: -360, arms: -0.4, elbows: -0.6 }],
      [1, {}],
    ],
  },

  sneeze: {
    priority: 2,
    keys: [
      [5, { head: -0.1, mane: 0.03, bob: -2, waist: -0.08 }],
      [5, { head: -0.2, mane: 0.08, bob: -4, sy: 1.03, waist: -0.16 }, 'pop.ah...'],
      [6, { head: -0.32, mane: 0.14, bob: -7, sy: 1.06, sx: 0.96, arms: -0.4, elbows: -1.1, waist: -0.256 }, 'pop.AH...'],
      [1, { head: 0.42, mane: 0.45, bob: 8, sy: 0.928, sx: 1.063, smear: [18, 4], echo: [10, 0], crouch: 20.8, waist: 0.336 }, 'pop.CHOO!|fx.confetti|glitch|sfx.sneeze'],
      [2, { head: 0.38, mane: 0.36, bob: 6, shift: -18, tilt: -3.6, waist: 0.168, hipX: 3.6 }],
      [3, { head: 0.2, mane: 0.1, shift: -22, tilt: -2.25, waist: 0.075, hipX: 2.3 }],
      [8, { head: 0.08, mane: -0.04, shift: -14, tilt: -0.9, waist: 0.03, hipX: 0.9 }],
      [3, { shift: -4 }],
      [1, {}],
    ],
  },

  hiccup: {
    priority: 1,
    keys: [
      ...rep(3, [
        [1, { bob: -13, sy: 1.08, sx: 0.94, mane: 0.2, echo: [5, 0] }, 'sfx.hic|glitch'],
        [2, { bob: -8, sy: 1.03 }],
        [3, { bob: 2, sy: 0.98 }],
        [8, { head: 0.04, arms: -0.7, elbows: -0.5 }],
      ]),
      [1, {}],
    ],
  },

  yawn: {
    priority: 1,
    keys: [
      [4, { head: 0.08, mane: -0.04, arms: -0.6, elbows: -0.5 }],
      [6, { head: -0.24, mane: 0.1, arms: 0.9, sy: 1.05, sx: 0.97, bob: -7, elbows: 1.2, waist: -0.14 }, 'sfx.yawn'],
      [14, { head: -0.32, mane: 0.15, arms: 1.45, sy: 1.08, sx: 0.95, bob: -10, elbows: 0.6, waist: -0.14 }, 'pop.yaaawn'],
      [5, { head: -0.1, mane: 0.02, arms: 0.1, sy: 1.0, elbows: 0.9 }],
      [5, { head: 0.16, mane: -0.1, arms: -0.8, sy: 0.986, bob: 3, elbows: -0.3, crouch: 3.9 }],
      [3, {}],
    ],
  },

  wobble: {
    priority: 2,
    keys: [
      ...rep(5, [
        [3, { tilt: -3.6, head: -0.2, hair: -4, shift: -8, armL: 0.2, armR: -1.1, elbowL: 1.2, elbowR: -0.3, waist: -0.136, hipX: 8.4, thighL: 0.12 }],
        [3, { tilt: 3.6, head: 0.2, hair: 4, shift: 8, armL: -1.1, armR: 0.2, elbowL: -0.3, elbowR: 1.2, waist: 0.136, hipX: -8.4, thighR: 0.12 }],
      ]),
      [3, { tilt: -5.4, head: -0.3, bob: 4, waist: -0.204, hipX: 12.6, thighL: 0.12 }],
      [3, { tilt: 6.3, head: 0.32, bob: 6, sy: 0.964, waist: 0.238, hipX: -14.7, crouch: 10.4, thighR: 0.12 }, 'fx.star|sfx.squeak'],
      [6, { tilt: 0.9, head: 0.05, waist: 0.034, hipX: -2.1, thighR: 0.12 }],
      [1, {}],
    ],
  },

  tantrum: {
    priority: 3,
    fps: 24,
    keys: [
      [6, { head: 0.2, mane: 0.1, arms: -0.2, sy: 0.964, bob: 5, elbows: -1.8, crouch: 10.4 }, 'pop.GRRR'],
      ...rep(9, [
        [2, { armL: 1.45, armR: -1.0, head: -0.18, tilt: -2.7, shift: -8, mane: 0.36, kickL: 0.32, bob: -5, echo: [4, 0], elbowL: 0.7, elbowR: -1.3, waist: -0.102, hipX: -2.9, thighL: 0.3 }, 'fx.spark'],
        [2, { armL: -1.0, armR: 1.45, head: 0.18, tilt: 2.7, shift: 8, mane: 0.36, kickR: 0.32, bob: 0, echo: [-4, 0], elbowL: -1.3, elbowR: 0.7, waist: 0.102, hipX: 2.9, thighR: 0.3 }],
      ]),
      [2, { arms: 1.5, mane: 0.5, bob: -16, sy: 1.1, smear: [0, 10], elbows: 0.4 }, 'glitch|sfx.crash'],
      [14, { arms: -0.7, mane: -0.14, head: 0.26, bob: 2, sy: 0.982, elbows: -2.1, crouch: 5.2 }, 'fx.smoke|pop.hmph'],
      [4, { head: 0.1 }],
      [1, {}],
    ],
  },

  facepalm: {
    priority: 1,
    directional: true,
    keys: [
      [5, { head: -0.1, reach: 0.25, elbow: 1.6 }],
      [3, { head: 0.26, reach: 0.2, elbow: 2.7, mane: -0.04, waist: 0.13, crouch: 3 }, 'sfx.pop'],
      [20, { head: 0.32, reach: 0.2, elbow: 2.75, bob: 3, mane: -0.1, waist: 0.13, crouch: 3 }, 'pop.sigh'],
      [4, { head: 0.12, reach: 0.15, elbow: 1 }],
      [1, {}],
    ],
  },

  salute: {
    priority: 1,
    directional: true,
    keys: [
      [3, { sy: 0.986, reach: 0.2, elbow: 1.4, crouch: 3.9 }],
      [2, { reach: 0.55, elbow: 2.35, head: -0.06, tilt: -0.9, smear: [4, 0], waist: -0.084, hipX: -1.1 }, 'sfx.tick'],
      [14, { reach: 0.58, elbow: 2.4, head: -0.08, sy: 1.02, bob: -2, hipX: -2, waist: -0.05 }, 'fx.star'],
      [3, { reach: -0.3, elbow: 0.5 }],
      [1, {}],
    ],
  },

  bow: {
    priority: 1,
    keys: [
      [5, { arms: 1.0, mane: 0.1, sy: 1.03, bob: -3, elbows: 0.9 }],
      [6, { head: 0.42, tilt: 5.85, mane: -0.05, arms: -1.15, bob: 7, sy: 0.969, elbows: -1.8, waist: 0.671, hipX: -5.9, crouch: 9.1 }, 'pop.thank you'],
      [12, { head: 0.46, tilt: 6.75, arms: -1.2, bob: 8, sy: 0.964, elbows: -1.9, waist: 0.705, hipX: -6.8, crouch: 10.4 }, 'fx.heart'],
      [4, { head: 0.12, tilt: 1.8, waist: 0.068, hipX: -1.8 }],
      [3, { sy: 1.02 }],
      [1, {}],
    ],
  },

  boo: {
    priority: 3,
    fps: 24,
    keys: [
      [10, { sy: 0.91, sx: 1.067, bob: 16, arms: -1.2, mane: -0.2, head: 0.16, elbows: 0.5, crouch: 26 }],
      [1, { sy: 1.28, sx: 1.2, bob: -26, arms: 1.5, mane: 0.5, echo: [14, 0], smear: [0, 16], elbows: 0.9, thighL: 0.2, thighR: 0.2 }, 'pop.BOO!|glitch|sfx.honk'],
      [10, { sy: 1.24, sx: 1.18, bob: -24, arms: 1.48, mane: 0.46, echo: [8, 0], elbows: 1, thighL: 0.2, thighR: 0.2 }],
      [8, { sy: 1.05, sx: 1.03, bob: -6, arms: 0.6, mane: 0.1, head: -0.12, elbows: 0.9 }],
      [12, { head: -0.16, tilt: -1.35, armR: 0.2, armL: -0.9, elbowL: -0.3, elbowR: 1.7, waist: -0.051, hipX: 1.4 }, 'pop.heh'],
      [2, {}],
    ],
  },

  glitchstorm: {
    priority: 3,
    fps: 24,
    keys: [
      ...rep(6, [
        [2, { shift: -24, echo: [15, 3], head: -0.18, sx: 1.15, sy: 0.88, mane: 0.34 }, 'glitch|sfx.tick'],
        [2, { shift: 24, echo: [-13, -3], head: 0.18, sx: 0.84, sy: 1.14, mane: 0.1, tilt: 8 }],
        [1, { sx: -1, shift: 10, tilt: -12, echo: [20, 0] }],
      ]),
      [2, { sy: 0.2, sx: 1.8, bob: 40, arms: 1.5, mane: 0.5, elbows: 0.3 }, 'glitch|fx.confetti'],
      [2, { sy: 1.8, sx: 0.4, bob: -22, arms: -1.2, elbows: -0.4 }],
      [5, { sy: 1.05, sx: 0.97, echo: [4, 0] }, 'pop.ERR_FUN'],
      [10, { head: 0.08, tilt: 1 }],
      [1, {}],
    ],
  },

  cannon: {
    priority: 2,
    directional: true,
    keys: [
      [6, { reach: 0.5, head: -0.1, sy: 0.986, elbow: 0.7, crouch: 3.9 }, 'prop.cannon'],
      [8, { reach: 0.6, head: -0.16, tilt: -1.35, sy: 0.973, bob: 3, elbow: 0.6, waist: -0.051, hipX: 1.4, crouch: 7.8 }, 'sfx.charge'],
      [1, { reach: 0.84, long: 0.9, shift: -14, tilt: -4.5, sy: 1.06, smear: [14, 0], mane: 0.4, elbow: 0.1, waist: -0.35, hipX: 4.5, crouch: 6 }, 'pop.FWOOM|fx.confetti|fx.confetti|fx.confetti|sfx.pop'],
      [3, { reach: 0.8, shift: -18, tilt: -3.6, elbow: 0.3, waist: -0.316, hipX: 3.6, crouch: 6 }],
      [12, { reach: 0.3, off: 1.2, shift: -8, head: -0.1, mane: 0.2, elbow: 0.9, elbowOff: 0.9, waist: -0.18, crouch: 6 }, 'fx.confetti'],
      [3, { shift: -2, waist: -0.18, crouch: 6 }],
      [1, {}],
    ],
  },

  boombox: {
    priority: 1,
    directional: true,
    keys: [
      [3, { reach: 0.95, elbow: 2.3, tilt: 0.9, bob: 2, waist: 0.034, hipX: 1.7, crouch: 7 }, 'prop.boombox'],
      ...rep(6, [
        [2, { reach: 0.95, elbow: 2.3, bob: 5, sy: 0.978, head: -0.14, tilt: 1.35, hair: 3, kickL: 0.18, waist: -0.005, hipX: 2.5, crouch: 13.5 }, 'fx.note'],
        [2, { reach: 1, elbow: 2.3, bob: -5, sy: 1.04, head: 0.14, tilt: -1.35, hair: -3, kickR: 0.18, waist: 0.005, hipX: -2.5, crouch: 1 }],
      ]),
      [4, { reach: 0.4, elbow: 1, head: 0.05 }],
      [1, {}],
    ],
  },

  snack: {
    priority: 1,
    directional: true,
    keys: [
      [4, { reach: 0.3, elbow: 1.3 }, 'prop.popcorn'],
      ...rep(3, [
        [3, { reach: 0.34, head: 0.04, off: 1.15, elbow: 1.4, elbowOff: 2.2, hipX: 4 }],
        [2, { reach: 0.34, head: -0.1, off: 1.45, longL: 0.85, elbow: 1.4, elbowOff: 2.6, hipX: 4 }, 'sfx.pop'],
        [4, { reach: 0.34, head: 0.06, off: 0.55, bob: 1, elbow: 1.4, elbowOff: 2, hipX: 4 }],
      ]),
      [8, { reach: 0.34, head: -0.12, off: 0.4, elbow: 1.4, elbowOff: 1.8, hipX: 4 }, 'pop.munch'],
      [4, { reach: -0.2, elbow: 0.4 }],
      [1, {}],
    ],
  },

  coffee: {
    priority: 1,
    directional: true,
    keys: [
      [4, { reach: 0.1, elbow: 1.4 }, 'prop.coffee'],
      [6, { reach: 0.15, elbow: 2.6, head: -0.22, waist: -0.08 }],
      [12, { reach: 0.15, elbow: 2.7, head: -0.3, bob: -2, waist: -0.08 }, 'pop.ahhh'],
      [3, { reach: 0.1, elbow: 1.4, head: 0.06 }],
      [1, { bob: -10, mane: 0.42, sy: 1.1, echo: [8, 0] }, 'glitch'],
      [10, { reach: 0.1, elbow: 1.2, mane: 0.32, head: 0, shift: 3 }, 'pop.WIRED'],
      ...rep(4, [
        [1, { shift: -6, mane: 0.3, reach: 0.1, elbow: 1.2 }],
        [1, { shift: 6, mane: 0.26, reach: 0.1, elbow: 1.4 }],
      ]),
      [3, { reach: -0.3, elbow: 0.3 }],
      [1, {}],
    ],
  },

  squeaker: {
    priority: 2,
    directional: true,
    keys: [
      [4, { reach: 0.8, head: 0.1, elbow: 1.2 }, 'prop.chicken'],
      [4, { reach: 1.1, tilt: -1.8, bob: -3, elbow: 1.7, waist: -0.188, hipX: 1.8 }],
      ...rep(3, [
        [2, { reach: 1.42, long: 1.1, tilt: 2.7, head: 0.2, sy: 0.982, smear: [6, 0], elbow: 0.1, waist: 0.282, hipX: -2.7, crouch: 10.2 }, 'sfx.squeak'],
        [4, { reach: 0.3, tilt: -1.35, head: -0.06, elbow: 1.4, waist: -0.051, hipX: 1.4 }],
      ]),
      [8, { reach: 0.9, head: -0.18, tilt: 0.45, elbow: 1, waist: 0.017, hipX: -0.5 }, 'pop.bonk'],
      [3, { reach: -0.3, elbow: 0.2 }],
      [1, {}],
    ],
  },

  selfie: {
    priority: 1,
    directional: true,
    keys: [
      [4, { reach: 1.05, long: 1.2, tilt: 0.9, elbow: 0.35, waist: 0.034, hipX: 2.1, thighL: 0.08 }, 'prop.camera'],
      [6, { reach: 1.2, long: 1.26, head: 0.2, tilt: 2.25, mane: 0.1, elbow: 0.3, waist: 0.085, hipX: 5.2, thighL: 0.08 }],
      [2, { reach: 1.2, long: 1.26, head: 0.24, tilt: 2.7, mane: 0.14, elbow: 0.3, waist: 0.102, hipX: 6.3, thighL: 0.08 }, 'fx.flash|sfx.tick'],
      [8, { reach: 1.2, long: 1.26, head: -0.1, tilt: -1.35, off: 1.3, elbow: 0.3, elbowOff: 1.6, waist: -0.051, hipX: -3.1, thighL: 0.08 }],
      [2, { reach: 1.2, long: 1.26, head: -0.14, tilt: -1.8, off: 1.3, elbow: 0.3, elbowOff: 1.6, waist: -0.068, hipX: -4.2, thighL: 0.08 }, 'fx.flash|sfx.tick'],
      [6, { reach: 1.1, long: 1.2, head: 0, off: 0.2, elbow: 0.35, elbowOff: 0.6, thighL: 0.08 }],
      [3, { reach: -0.3, elbow: 0.2 }],
      [1, {}],
    ],
  },

  shades: {
    priority: 1,
    keys: [
      [10, { head: -0.1, arms: -0.8, bob: -2, elbows: -0.3 }, 'prop.shades'],
      [2, { bob: 3, sy: 0.982, crouch: 5.2 }, 'sfx.pop'],
      [14, { head: 0.08, armL: -1.25, armR: 0.3, tilt: -2.25, mane: 0.08, elbowL: -0.2, elbowR: 1.7, waist: -0.145, hipX: 9.3 }, 'pop.deal with it'],
      [3, { tilt: 0 }],
      [1, {}],
    ],
  },

  balloon: {
    priority: 1,
    directional: true,
    keys: [
      [4, { reach: 1.36, long: 1.1, elbow: 0.6 }, 'prop.balloon'],
      [8, { reach: 1.42, long: 1.2, bob: -24, tilt: 1.35, kickL: 0.3, kickR: 0.1, hair: -3, sy: 1.04, elbow: 0.45, waist: 0.051, hipX: -1.4, thighL: 0.1, thighR: 0.1 }],
      [10, { reach: 1.42, long: 1.2, bob: -46, tilt: -1.35, kickL: 0.08, kickR: 0.3, hair: 3, sy: 1.05, elbow: 0.45, waist: -0.051, hipX: 1.4, thighL: 0.1, thighR: 0.1 }],
      [10, { reach: 1.42, long: 1.2, bob: -58, tilt: 1.35, kickL: 0.3, kickR: 0.1, hair: -3, elbow: 0.45, waist: 0.051, hipX: -1.4, thighL: 0.1, thighR: 0.1 }, 'pop.wheee'],
      [2, { reach: 1.42, bob: -58, mane: 0.3, elbow: 0.45 }, 'sfx.pop|fx.confetti|pop.POP'],
      [3, { arms: 1.3, bob: -40, sy: 1.1, mane: 0.26, elbows: 0.9 }],
      [3, { arms: 1.3, bob: -16, elbows: 0.9 }],
      [2, { arms: 0, bob: 6, sy: 0.937, sx: 1.054, elbows: 0.3, crouch: 18.2 }, 'fx.smoke'],
      [5, { sy: 1.02, bob: -2 }],
      [1, {}],
    ],
  },

  crashout: {
    priority: 3,
    fps: 24,
    keys: [
      [4, { head: 0.2, sy: 0.94 }, 'prop.error'],
      [10, { head: 0.3, arms: -1.2, mane: -0.12, elbows: -0.3 }],
      [2, { sy: 0.08, sx: 1.9, bob: 50, arms: 1.5, elbows: 0.1 }, 'glitch|sfx.crash'],
      [10, { sy: 0.06, sx: 1.96, bob: 52 }, 'glitch'],
      [2, { sy: 1.5, sx: 0.56, bob: -22, arms: 1.5, echo: [12, 0], elbows: 0.1 }, 'sfx.boing|fx.star'],
      [8, { sy: 1.03, arms: 1.3, mane: 0.16, elbows: 0.9 }, 'pop.jk'],
      [4, {}],
      [1, {}],
    ],
  },
};

export class Player {
  constructor(name, { dir = 0, reach = 1, at = performance.now() } = {}) {
    this.name = name;
    this.act = ACTS[name];
    this.dir = dir;
    this.reach = reach;
    this.start = at;
    this.total = this.act.keys.reduce((n, [hold]) => n + hold, 0);
  }

  get priority() {
    return this.act.priority ?? 0;
  }

  // The drawing on screen at `now` ({ pose, index, cue }), or null once a one-shot act is over.
  sample(now) {
    const fps = this.act.fps || SHEET_FPS;
    let f = Math.floor((now - this.start) / (1000 / fps));
    if (f >= this.total) {
      if (!this.act.loop) return null;
      f %= this.total;
    }
    const { keys } = this.act;
    for (let i = 0; i < keys.length; i++) {
      const [hold, pose, cue] = keys[i];
      if (f < hold) return { pose, index: i, cue };
      f -= hold;
    }
    return null;
  }

  // Turn a drawing into plain fields: mirror it toward the act's direction (`facing` maps
  // screen to sprite space) and spell out arms / reach as armL / armR.
  resolve(pose, facing) {
    const out = { ...pose };
    const lean = this.act.directional && this.dir ? this.dir * facing : 0;
    if (lean) {
      if (pose.head !== undefined) out.head = pose.head * lean;
      if (pose.tilt !== undefined) out.tilt = pose.tilt * this.dir;
      if (pose.shift !== undefined) out.shift = pose.shift * this.dir;
      if (pose.smear) out.smear = [pose.smear[0] * lean, pose.smear[1]];
      if (pose.echo) out.echo = [pose.echo[0] * lean, pose.echo[1]];
    }
    if (pose.arms !== undefined) {
      out.armL = pose.arms;
      out.armR = pose.arms;
    }
    // sprite space, so they turn with her; the screen-space lean above is mirrored separately
    const across = lean || facing;
    if (pose.waist !== undefined) out.waist = pose.waist * across;
    if (pose.hipX !== undefined) out.hipX = pose.hipX * across;
    if (pose.elbows !== undefined) {
      out.elbowL = pose.elbows;
      out.elbowR = pose.elbows;
    }
    const reaching = lean < 0 ? 'L' : 'R', other = lean < 0 ? 'R' : 'L';
    if (pose.reach !== undefined) {
      // the left arm of the sprite points to sprite-left; reach can follow a moving target
      const scale = typeof this.reach === 'function' ? this.reach() : this.reach;
      out[`arm${reaching}`] = pose.reach * scale;
      out[`elbow${reaching}`] = pose.elbow ?? 0; // reaching for something: straight unless drawn bent
    }
    if (pose.long !== undefined) out[lean < 0 ? 'longL' : 'longR'] = pose.long;
    if (pose.off !== undefined) out[`arm${other}`] = pose.off;
    if (pose.elbowOff !== undefined) out[`elbow${other}`] = pose.elbowOff;
    delete out.arms;
    delete out.elbows;
    delete out.elbow;
    delete out.off;
    delete out.elbowOff;
    delete out.reach;
    delete out.long;
    return out;
  }
}
