// Adapted from TheAgencyMGE/capri-companion c094ec1 (MIT); see THIRD_PARTY_NOTICES.md.
import type { Params } from './params';

/**
 * Keyframed animation clips layered over the behavior pose.
 * `source` is honest provenance: 'frame#N' = pose matched to an official frame
 * (reference/SOURCES.md), 'interpretation' = authored for this app.
 */
type Pose = Partial<Params>;
export interface Clip {
  name: string;
  duration: number; // seconds at speed 1
  keys: { t: number; pose: Pose }[]; // t in 0..1, sorted
  tags: ('idle' | 'subtle' | 'reaction' | 'gesture' | 'emote')[];
  mirror?: boolean; // may be played left/right flipped
  /** 'snap' = Trigger-style limited animation: fast move (15% of a segment), then hold (N 1:49-1:54) */
  ease?: 'smooth' | 'snap';
  source: 'interpretation';
}

const k = (t: number, pose: Pose) => ({ t, pose });
/** n+1 alternating keys from `from` to 0.9 (keeps key times sorted after a lead-in key). */
const osc = (n: number, amp: number, key: keyof Params, extra: Pose = {}, from = 0.1) =>
  Array.from({ length: n + 1 }, (_, i) => k(from + ((0.9 - from) * i) / n, { ...extra, [key]: i % 2 ? -amp : amp }));

export const CLIPS: Clip[] = [
  // ---- idle fidgets (interpretation)
  { name: 'glance_side', duration: 1.8, source: 'interpretation', tags: ['idle', 'subtle'], mirror: true, keys: [k(0, {}), k(0.2, { gazeX: 0.9 }), k(0.45, { gazeX: 0.9, headYaw: 0.3 }), k(1, {})] },
  { name: 'glance_up', duration: 1.6, source: 'interpretation', tags: ['idle', 'subtle'], keys: [k(0, {}), k(0.3, { gazeY: -0.8, headPitch: -0.15 }), k(1, {})] },
  { name: 'peek_down', duration: 2, source: 'interpretation', tags: ['idle', 'subtle'], mirror: true, keys: [k(0, {}), k(0.3, { gazeY: 0.9, gazeX: 0.3, headPitch: 0.35 }), k(0.7, { gazeY: 0.9, gazeX: 0.4, headPitch: 0.35 }), k(1, {})] },
  { name: 'over_shoulder', duration: 2.4, source: 'interpretation', tags: ['idle'], mirror: true, keys: [k(0, {}), k(0.3, { headYaw: 1, gazeX: 1, bodyRot: 0.05, hairWind: 0.6 }), k(0.65, { headYaw: 1, gazeX: 1 }), k(1, {})] },
  { name: 'slow_blink', duration: 1.2, source: 'interpretation', tags: ['idle', 'subtle'], keys: [k(0, {}), k(0.4, { blinkL: 1, blinkR: 1 }), k(0.6, { blinkL: 1, blinkR: 1 }), k(1, {})] },
  { name: 'double_take', duration: 1.6, source: 'interpretation', tags: ['idle', 'reaction'], mirror: true, keys: [k(0, {}), k(0.15, { headYaw: 0.6, gazeX: 0.8 }), k(0.3, { headYaw: 0, gazeX: 0 }), k(0.45, { headYaw: 0.75, gazeX: 1, eyeWide: 0.9 }), k(0.8, { headYaw: 0.7, eyeWide: 0.8 }), k(1, {})] },
  { name: 'hair_flick', duration: 1.4, source: 'interpretation', tags: ['idle', 'emote'], mirror: true, keys: [k(0, {}), k(0.2, { headRoll: -0.25, hairWind: 1 }), k(0.4, { headRoll: 0.2, hairWind: 1, squint: 0.3, mouthSmile: 0.7 }), k(1, {})] },
  { name: 'head_bob', duration: 2.4, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), ...osc(6, 0.18, 'headPitch', { mouthSmile: 0.6 }), k(1, {})] },
  { name: 'sway_hum', duration: 3.2, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), ...osc(4, 0.12, 'headRoll', { squint: 0.4, mouthSmile: 0.6 }), k(1, {})] },
  { name: 'stretch', duration: 2.6, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), k(0.35, { armLRaise: 1, armRRaise: 1, headPitch: -0.3, squint: 0.6, mouthOpen: 0.3, float: 0.7 }), k(0.65, { armLRaise: 1, armRRaise: 1, headPitch: -0.3, squint: 0.6 }), k(1, {})] },
  { name: 'yawn', duration: 2.4, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), k(0.3, { mouthOpen: 0.9, mouthSmile: 0, squint: 0.8, headPitch: -0.2, armLRaise: 0.4 }), k(0.6, { mouthOpen: 0.95, squint: 0.9 }), k(1, {})] },
  { name: 'sigh', duration: 2, source: 'interpretation', tags: ['idle', 'subtle'], keys: [k(0, {}), k(0.35, { breathe: 1, headPitch: -0.1 }), k(0.7, { breathe: 0, headPitch: 0.15, squint: 0.3, mouthSmile: 0.1 }), k(1, {})] },
  { name: 'float_up', duration: 2.4, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), k(0.4, { float: 1, hairWind: 0.5 }), k(0.7, { float: 1 }), k(1, {})] },
  { name: 'shiver_glitch', duration: 1, source: 'interpretation', tags: ['idle', 'emote'], keys: [k(0, {}), k(0.2, { glitch: 0.9, eyeWide: 0.5 }), k(0.5, { glitch: 0.6 }), k(1, {})] },
  { name: 'chin_tap', duration: 2.6, source: 'interpretation', tags: ['idle', 'gesture'], keys: [k(0, {}), ...osc(5, 0.06, 'headRoll', { armLRaise: 0.55, gazeX: -0.5, gazeY: -0.5, squint: 0.3 }), k(1, {})] },
  { name: 'proud_pose', duration: 2.4, source: 'interpretation', tags: ['emote'], mirror: true, keys: [k(0, {}), k(0.3, { headPitch: -0.35, headRoll: 0.15, squint: 0.55, mouthSmile: 1, float: 0.8, hairWind: 0.7 }), k(0.75, { headPitch: -0.3, squint: 0.5, mouthSmile: 1 }), k(1, {})] }, // "beautiful me"

  // ---- gestures
  { name: 'wave_small', duration: 1.8, source: 'interpretation', tags: ['gesture', 'reaction'], keys: [k(0, {}), k(0.2, { armRRaise: 0.85, mouthSmile: 0.8 }), ...osc(4, 0.6, 'armRWave', { armRRaise: 0.85, mouthSmile: 0.8 }, 0.3), k(1, {})] },
  { name: 'wave_big', duration: 2.4, source: 'interpretation', tags: ['gesture', 'reaction'], keys: [k(0, {}), k(0.15, { armRRaise: 1, mouthSmile: 1, squint: 0.4, headRoll: 0.1 }), ...osc(6, 1, 'armRWave', { armRRaise: 1, mouthSmile: 1, squint: 0.4 }, 0.25), k(1, {})] },
  { name: 'shrug', duration: 1.6, source: 'interpretation', tags: ['gesture', 'reaction'], keys: [k(0, {}), k(0.35, { armLRaise: 0.3, armRRaise: 0.3, headRoll: 0.18, mouthSmile: -0.1, breathe: 1 }), k(0.65, { armLRaise: 0.3, armRRaise: 0.3, headRoll: 0.18 }), k(1, {})] },
  { name: 'nod_slow', duration: 1.4, source: 'interpretation', tags: ['gesture', 'reaction'], keys: [k(0, {}), k(0.25, { headPitch: 0.35 }), k(0.5, { headPitch: -0.05 }), k(0.75, { headPitch: 0.3 }), k(1, {})] },
  { name: 'shake_no', duration: 1.4, source: 'interpretation', tags: ['gesture', 'reaction'], keys: [k(0, {}), ...osc(4, 0.45, 'headYaw', { mouthSmile: -0.2 }), k(1, {})] },
  { name: 'point_up', duration: 1.8, source: 'interpretation', tags: ['gesture'], keys: [k(0, {}), k(0.25, { armRRaise: 0.8, armRWave: -0.4, gazeY: -0.6, eyeWide: 0.4 }), k(0.75, { armRRaise: 0.8, armRWave: -0.4 }), k(1, {})] },

  // ---- reactions / emotes
  { name: 'giggle', duration: 1.6, source: 'interpretation', tags: ['reaction', 'emote'], keys: [k(0, {}), k(0.15, { bodyY: 2, headPitch: 0.12, squint: 0.8, mouthOpen: 0.45, mouthSmile: 1, armLRaise: 0.15, armRRaise: 0.15 }), k(0.3, { bodyY: -2, headPitch: -0.05, squint: 0.8, mouthOpen: 0.45, mouthSmile: 1, armLRaise: 0.15, armRRaise: 0.15 }), k(0.45, { bodyY: 2, headPitch: 0.12, squint: 0.8, mouthOpen: 0.45, mouthSmile: 1, armLRaise: 0.15, armRRaise: 0.15 }), k(0.6, { bodyY: -2, headPitch: -0.05, squint: 0.8, mouthOpen: 0.45, mouthSmile: 1, armLRaise: 0.15, armRRaise: 0.15 }), k(0.78, { bodyY: 1, headPitch: 0.08, squint: 0.7, mouthOpen: 0.3, mouthSmile: 1 }), k(1, {})] },
  { name: 'surprise_flinch', duration: 1.4, source: 'interpretation', tags: ['reaction'], keys: [k(0, {}), k(0.1, { eyeWide: 1, mouthOpen: 0.7, mouthSmile: 0, headPitch: -0.25, hairWind: 1, glitch: 0.6, float: 0.9, manyEyes: 0.7 }), k(0.6, { eyeWide: 0.8, mouthOpen: 0.4 }), k(1, {})] },
  { name: 'eye_roll', duration: 1.6, source: 'interpretation', tags: ['reaction', 'emote'], keys: [k(0, {}), k(0.2, { gazeX: -0.7, gazeY: -0.7, squint: 0.3 }), k(0.45, { gazeX: 0, gazeY: -1, squint: 0.3 }), k(0.7, { gazeX: 0.7, gazeY: -0.6, mouthSmile: -0.4, headRoll: -0.1 }), k(1, {})] },
  { name: 'pout', duration: 1.8, source: 'interpretation', tags: ['reaction', 'emote'], mirror: true, keys: [k(0, {}), k(0.3, { mouthSmile: -0.8, squint: 0.5, headRoll: -0.15, headYaw: 0.4, gazeX: 0.6 }), k(0.75, { mouthSmile: -0.8, squint: 0.5 }), k(1, {})] },
  { name: 'curious_lean', duration: 1.8, source: 'interpretation', tags: ['reaction'], mirror: true, keys: [k(0, {}), k(0.3, { headRoll: 0.25, bodyRot: 0.06, eyeWide: 0.5, mouthSmile: 0.3 }), k(0.8, { headRoll: 0.25, bodyRot: 0.05, eyeWide: 0.45 }), k(1, {})] },
  { name: 'wink', duration: 1.2, source: 'interpretation', tags: ['emote', 'reaction'], mirror: true, keys: [k(0, {}), k(0.3, { blinkL: 1, squint: 0.3, mouthSmile: 1, headRoll: 0.12 }), k(0.6, { blinkL: 1, mouthSmile: 1 }), k(1, {})] },
  { name: 'tease', duration: 2.2, source: 'interpretation', tags: ['emote'], mirror: true, keys: [k(0, {}), k(0.25, { headRoll: 0.3, headPitch: 0.2, squint: 0.6, mouthSmile: 1, mouthOpen: 0.25, gazeX: 0.3 }), k(0.5, { blinkL: 1, headRoll: 0.3, mouthSmile: 1 }), k(0.7, { headRoll: 0.28, squint: 0.5 }), k(1, {})] },
  { name: 'cheer', duration: 1.8, source: 'interpretation', tags: ['emote', 'reaction'], keys: [k(0, {}), k(0.25, { armLRaise: 1, armRRaise: 1, mouthOpen: 0.6, mouthSmile: 1, squint: 0.6, float: 1 }), ...osc(3, 0.3, 'armRWave', { armLRaise: 1, armRRaise: 1, mouthSmile: 1, float: 1 }, 0.35), k(1, {})] },
  { name: 'facepalm', duration: 2, source: 'interpretation', tags: ['emote', 'reaction'], keys: [k(0, {}), k(0.3, { armLRaise: 0.62, headPitch: 0.4, blinkL: 1, blinkR: 1, mouthSmile: -0.4 }), k(0.75, { armLRaise: 0.62, headPitch: 0.4, blinkL: 1, blinkR: 1 }), k(1, {})] },
  { name: 'drowsy_nod', duration: 3, source: 'interpretation', tags: ['idle'], keys: [k(0, {}), k(0.3, { headPitch: 0.5, squint: 0.8, sleep: 0.5 }), k(0.45, { headPitch: -0.1, eyeWide: 0.5, sleep: 0 }), k(1, {})] },
];

export const clipByName = (n: string) => CLIPS.find((c) => c.name === n);
