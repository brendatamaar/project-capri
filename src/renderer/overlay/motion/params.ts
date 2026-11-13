/** Every animatable degree of freedom of the rig. Springs live in core/motion/spring.ts. */
export interface Params {
  bodyX: number; bodyY: number; bodyRot: number; // px, px, rad
  breathe: number; // 0..1 chest/shoulder lift
  headYaw: number; headPitch: number; headRoll: number; // -1..1, -1..1, rad
  gazeX: number; gazeY: number; // -1..1
  blinkL: number; blinkR: number; // 0 open → 1 closed
  eyeWide: number; // 0..1 surprise
  squint: number; // 0..1 sly/happy narrowing
  mouthOpen: number; // 0..1
  mouthSmile: number; // -1 frown .. 1 grin
  maskGlow: number; // 0..1 green emissive pulse
  armLRaise: number; armRRaise: number; // 0 hanging .. 1 raised
  armRWave: number; // -1..1 forearm swing
  hip: number; // -1..1 weight shift
  hairWind: number; // 0..1 extra hair agitation
  float: number; // 0..1 hover amount (sleep sinks, excited lifts)
  glitch: number; // 0..1 glitch intensity this frame
  sleep: number; // 0..1 drowsiness (head droops, eyes heavy)
  ringPulse: number; // 0..1 listening indicator
  armSpread: number; // 0..1 arms flung wide (reveal pose, N 1:51)
  manyEyes: number; // 0..1 extra eyes bloom across the mask (N 2:14)
  // ---- legs & posture (v3): degrees; thigh "out" swings the leg away from the body, knee bends the shin
  thighL: number; kneeL: number; foreL: number; // fore = visible thigh length (foreshortening, 1 = full)
  thighR: number; kneeR: number; foreR: number;
  hipDrop: number; // px the body sinks (sitting on an edge)
  lean: number; // rad, whole-body lean around the hip (recline / peek)
  hairStream: number; // -1..1 hair blown sideways (dash, B 4:03)
  happyEyes: number; // 0..1 eyes become ^ ^ arcs (B 2:33)
  blankEyes: number; // 0..1 irises vanish to blank white (B 0:13)
  clawScale: number; // 1 = normal; >1 claws reaching toward the viewer (B 2:48)
  zoom: number; // whole-figure scale about the hip (fits the side-lying pose in the frame)
  hairUp: number; // 0..1 hair counter-rotates against body lean, so the cloud stays up when she lies down
  turn: number; // -1..1 whole body turned toward viewer-left/right; ±1 = side profile
  back: number; // 0..1 turned away from the viewer (back view)
}

export const NEUTRAL: Params = {
  bodyX: 0, bodyY: 0, bodyRot: 0, breathe: 0, headYaw: 0, headPitch: 0, headRoll: 0, gazeX: 0, gazeY: 0,
  blinkL: 0, blinkR: 0, eyeWide: 0, squint: 0, mouthOpen: 0, mouthSmile: 0.35, maskGlow: 0.2,
  armLRaise: 0, armRRaise: 0, armRWave: 0, hip: 0, hairWind: 0, float: 0.4, glitch: 0, sleep: 0, ringPulse: 0, armSpread: 0, manyEyes: 0,
  thighL: 0, kneeL: 0, foreL: 1, thighR: 0, kneeR: 0, foreR: 1, hipDrop: 0, lean: 0, hairStream: 0, happyEyes: 0, blankEyes: 0, clawScale: 1, zoom: 1, hairUp: 0, turn: 0, back: 0,
};

/** Random natural blinking: 2–6 s intervals, occasional double blinks, blink on big gaze shifts. */
export class Blinker {
  private t = 0;
  private next = 2.5;
  private phase = -1; // -1 = not blinking, else seconds into blink
  private double = false;
  constructor(private rand: () => number = Math.random) {}
  trigger() { if (this.phase < 0) { this.phase = 0; this.double = false; } }
  /** returns closure 0..1 */
  update(dt: number, opts: { drowsy: number; suppressed: boolean }): number {
    this.t += dt;
    if (this.phase < 0 && !opts.suppressed && this.t >= this.next) {
      this.phase = 0;
      this.double = this.rand() < 0.15;
      this.t = 0;
      this.next = (2 + this.rand() * 4) * (1 - opts.drowsy * 0.5);
    }
    if (this.phase < 0) return 0;
    this.phase += dt;
    const dur = 0.16 + opts.drowsy * 0.25;
    if (this.phase >= dur) {
      if (this.double) { this.double = false; this.phase = 0.0; return 0; }
      this.phase = -1;
      return 0;
    }
    return Math.sin((this.phase / dur) * Math.PI); // close then open
  }
}
