// WebGL renderer for the Capri cut-out.
// One texture, one quad: every bit of life (head tilt, mane sway and flare, both arms, sitting with
// dangling legs, smear frames, afterimages, line boil, speckles, the violet misregistration, glitch
// slices, teleport collapse) is done in the fragment shader.

const VERT = `
attribute vec2 aPos;
uniform vec2 uView;
uniform float uPad;
varying vec2 vPx;
void main() {
  vec2 uv = aPos * 0.5 + 0.5;
  vPx = vec2(uv.x, 1.0 - uv.y) * uView - uPad;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vPx;

uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uSeed;
uniform float uBoil;
uniform float uHair;
uniform float uHead;
uniform float uMane;
uniform float uArmL;
uniform float uArmR;
uniform float uElbowL;
uniform float uWaist;
uniform vec2 uPelvis;
uniform float uThighL;
uniform float uThighR;
uniform vec2 uLegL; // how long the thigh and the shin are drawn, 1 = as drawn (core/motion/legs.ts)
uniform vec2 uLegR;
uniform float uElbowR;
uniform float uLongL;
uniform float uLongR;
uniform float uSit;
uniform float uFlat;
uniform float uBend;
uniform float uKickL;
uniform float uKickR;
uniform vec2 uSmear;
uniform vec2 uEcho;
uniform float uGlitch;
uniform float uGlitchSeed;
uniform float uSplit;
uniform float uCollapse;
uniform float uDissolve;
uniform float uSparkle;
uniform float uGrade;
uniform vec4 uSil;
uniform vec2 uMisreg;
uniform vec3 uRim;
uniform float uAlpha;
uniform float uPx; // sprite pixels per screen pixel

// landmarks, in sprite pixels (capri-full.png is 240x420, see tools/build-sprite.py)
const vec2 NECK = vec2(118.0, 152.0);   // the head tilts around this
const vec2 SHOULDER_L = vec2(98.0, 168.0);
const float MIRROR = 234.0;             // the right arm is the left one flipped around x = 117
const vec2 SHOULDER_R = vec2(136.0, 168.0);
const vec2 MANE = vec2(116.0, 92.0);    // middle of the mane, it flares out from here
const vec2 FACE = vec2(124.0, 132.0);   // her mask, kept rigid when the mane flares
const float AXIS = 118.0;
const float HIP = 232.0;                // bottom of the torso
const float KNEE = 305.0;               // both knees sit around here
const float KNEE_LX = 106.0;
const float KNEE_RX = 142.0;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec2 rot(vec2 p, vec2 c, float a) {
  float s = sin(a), k = cos(a);
  p -= c;
  return c + vec2(k * p.x - s * p.y, s * p.x + k * p.y);
}

vec4 tex(vec2 p) {
  if (p.x < 0.0 || p.y < 0.0 || p.x > uSize.x || p.y > uSize.y) return vec4(0.0);
  return texture2D(uTex, p / uSize);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// The cut-out is darker and duller than the show; pull every pink/crimson toward the
// on-screen hot red and the mask toward neon green. "red" says how much of the mane it is.
vec3 grade(vec3 c, out float red) {
  vec3 h = rgb2hsv(c);
  float hx = h.x < 0.5 ? h.x + 1.0 : h.x;               // unwrap around red
  float lit = smoothstep(0.1, 0.3, h.z);
  red = smoothstep(0.78, 0.85, hx) * (1.0 - smoothstep(1.06, 1.1, hx)) * lit * smoothstep(0.06, 0.2, h.y);
  float green = smoothstep(0.22, 0.27, h.x) * (1.0 - smoothstep(0.47, 0.52, h.x)) * lit * smoothstep(0.15, 0.3, h.y);
  hx = mix(hx, 0.968, red * 0.6 * uGrade);
  h.x = fract(hx);
  h.y = mix(h.y, max(h.y, 0.86), red * uGrade);
  h.y = mix(h.y, min(1.0, h.y * 1.1 + 0.06), green * uGrade);
  h.z = mix(h.z, min(1.0, h.z * 1.5 + 0.1), (red + green) * uGrade);
  return hsv2rgb(h);
}

// One part of the figure, premultiplied. The parts are layered first and coloured once afterwards
// (finish), so the shader stays small enough to compile however many joints the rig has.
float gPartA;
vec2 gPartS;
vec4 part(vec2 s) {
  vec4 c = tex(s);
  if (c.a <= 0.0) return vec4(0.0);
  if (c.a > gPartA) { gPartA = c.a; gPartS = s; }
  return vec4(c.rgb * c.a, c.a);
}

// Graded and speckled. Specks stick to the body part most visible at this pixel.
vec4 finish(vec4 raw) {
  if (raw.a <= 0.0) return vec4(0.0);
  float red;
  vec3 color = grade(raw.rgb / raw.a, red);
  // speckles on the red parts: a fixed star field plus a few that twinkle per drawing.
  // One speck is about one screen pixel whatever her size.
  if (red > 0.0 && uSparkle > 0.0) {
    vec2 cell = floor(gPartS / max(0.8, uPx * 1.2));
    float star = step(0.976, hash(cell + 3.1)) * 0.85;
    float tw = step(0.993, hash(cell + uSeed * 1.37));
    color = mix(color, vec3(1.0, 0.95, 0.97), clamp((star + tw) * red * uSparkle, 0.0, 1.0));
  }
  return vec4(color * raw.a, raw.a);
}

// Lower legs, in source pixels; the line between them leans with the stance.
float legSep(float y) { return y < 290.0 ? 115.0 + (y - 240.0) * 0.1 : 120.0; }
float legL(vec2 s) { return step(KNEE - 6.0, s.y) * (1.0 - step(legSep(s.y), s.x)); }
float legR(vec2 s) { return step(KNEE - 6.0, s.y) * step(legSep(s.y), s.x); }

// Sitting, seen from the front: the thighs come toward us so they shrink,
// and everything below them rides up.
float thighScale() { return mix(1.0, 0.3, uSit); }

vec2 unsit(vec2 q) {
  if (uSit <= 0.0 || q.y <= HIP) return q;
  float c = thighScale();
  if (q.y <= HIP + (KNEE - HIP) * c) q.y = HIP + (q.y - HIP) / c;
  else q.y += (KNEE - HIP) * (1.0 - c);
  return q;
}

// The reaching arm, on the left of the cut-out, between the hair spike above it and the hip
// below. The right arm is this same drawing mirrored (the original hanging one was removed).
float armL(vec2 s) {
  if (s.x > 101.0 || s.y > 234.0) return 0.0;
  float top = 159.0 + (98.0 - s.x) * 0.5;
  float bot = s.x < 50.0 ? 234.0 : 178.0 + (98.0 - s.x) * 0.62;
  return step(top, s.y) * step(s.y, bot);
}

vec2 mirrorArm(vec2 s) { return vec2(MIRROR - s.x, s.y); }

// An arm drawn longer than it is (anime exaggeration, so a reach reads past the mane):
// stretched along its length only, from the shoulder, so it stays as thin. In the left arm's
// rest frame, which is where both arms are looked up.
const vec2 ARM_DIR = vec2(-0.85954, 0.51108); // shoulder to hand at rest
vec2 stretchArm(vec2 s, float k) {
  if (k == 1.0) return s;
  vec2 v = s - SHOULDER_L;
  float along = dot(v, ARM_DIR);
  return SHOULDER_L + ARM_DIR * (along / k) + (v - ARM_DIR * along);
}
// The elbow, halfway down the arm. A bent arm is two straight halves, each drawn past the joint in a
// small round cap so no gap opens on the outside of the bend.
const vec2 ELBOW = vec2(60.2, 190.5);
const float ELBOW_ALONG = 44.0;
const float ELBOW_CAP = 7.0;
float alongArm(vec2 s) { return dot(s - SHOULDER_L, ARM_DIR); }
bool upperArm(vec2 s) { return alongArm(s) <= ELBOW_ALONG || distance(s, ELBOW) < ELBOW_CAP; }
bool foreArm(vec2 f) { return alongArm(f) >= ELBOW_ALONG || distance(f, ELBOW) < ELBOW_CAP; }
vec2 armLeft(vec2 q) { return stretchArm(rot(q, SHOULDER_L, -uArmL), uLongL); }
vec2 armRight(vec2 q) { return stretchArm(mirrorArm(rot(q, SHOULDER_R, uArmR)), uLongR); }

// Standing body: everything above the leg cut moves with the pelvis and bends at the waist; each
// leg is a thigh turned at the hip and a shin turned at the knee, with round caps over the joints.
vec2 bend(vec2 q);
const float LEG_CUT = 244.0;
const vec2 WAIST = vec2(116.0, 202.0);
const vec2 HIP_L = vec2(105.0, 240.0);
const vec2 HIP_R = vec2(130.0, 240.0);
const vec2 STAND_KNEE_L = vec2(106.0, 305.0);
const vec2 STAND_KNEE_R = vec2(136.0, 305.0);
const float JOINT_CAP = 7.0;
vec2 upperBody(vec2 q) {
  vec2 p = q - uPelvis;
  return rot(p, WAIST, -uWaist * smoothstep(WAIST.y + 8.0, WAIST.y - 26.0, p.y));
}
bool standingRig() {
  return uSit <= 0.0 && uBend == 0.0 && (uKickL != 0.0 || uKickR != 0.0 || uThighL != 0.0 || uThighR != 0.0 || uPelvis != vec2(0.0));
}
bool onSide(vec2 s, float side) { return side < 0.0 ? s.x < legSep(s.y) : s.x >= legSep(s.y); }
// A knee bending toward the viewer shortens the thigh and the shin on screen: each is squashed
// along its length before it is turned, so the leg folds without the knee flying out sideways.
vec4 standingLeg(vec2 q, vec2 hip, vec2 knee, float thigh, float shin, float side, vec2 len) {
  vec2 t = rot(q - uPelvis, hip, -thigh);
  t.y = hip.y + (t.y - hip.y) / len.x;
  vec2 joint = uPelvis + rot(vec2(knee.x, hip.y + (knee.y - hip.y) * len.x), hip, thigh);
  vec2 s = knee + rot(q - joint, vec2(0.0), -shin);
  s.y = knee.y + (s.y - knee.y) / len.y;
  vec4 lower = (onSide(s, side) && (s.y >= knee.y || distance(s, knee) < JOINT_CAP)) ? part(s) : vec4(0.0);
  vec4 upper = (onSide(t, side) && t.y >= LEG_CUT && (t.y <= knee.y || distance(t, knee) < JOINT_CAP)) ? part(t) : vec4(0.0);
  return lower + upper * (1.0 - lower.a);
}
vec4 standingBody(vec2 q, vec2 body) {
  vec2 u = bend(body);
  vec4 top = (u.y > LEG_CUT || armL(u) > 0.0) ? vec4(0.0) : part(u);
  vec4 l = standingLeg(q, HIP_L, STAND_KNEE_L, uThighL, uThighL + uKickL, -1.0, uLegL);
  vec4 r = standingLeg(q, HIP_R, STAND_KNEE_R, -uThighR, -uThighR - uKickR, 1.0, uLegR);
  vec4 c = l + top * (1.0 - l.a);
  return r + c * (1.0 - r.a);
}

bool legsRigged() { return uSit > 0.0 || uKickL != 0.0 || uKickR != 0.0; }

// Bent at the hips (lying back on one arm): her legs swung around her hip, toward the left of the
// cut-out for a positive bend, easing in over the waist so nothing tears.
vec2 hips(vec2 q) {
  if (uBend == 0.0) return q;
  return rot(q, vec2(AXIS, HIP), -uBend * smoothstep(HIP - 16.0, HIP + 8.0, q.y));
}

// Everything but the arms, with each lower leg swung on its knee (outward for positive kicks).
vec4 torso(vec2 q) {
  q = hips(q);
  if (!legsRigged()) return armL(q) > 0.0 ? vec4(0.0) : part(q);
  float kneeY = HIP + (KNEE - HIP) * thighScale();
  vec2 qB = unsit(q);
  vec2 qL = unsit(rot(q, vec2(KNEE_LX, kneeY), -uKickL));
  vec2 qR = unsit(rot(q, vec2(KNEE_RX, kneeY), uKickR));
  vec4 b = legL(qB) + legR(qB) + armL(qB) > 0.0 ? vec4(0.0) : part(qB);
  vec4 l = legL(qL) > 0.0 ? part(qL) : vec4(0.0);
  vec4 r = legR(qR) > 0.0 ? part(qR) : vec4(0.0);
  vec4 c = l + b * (1.0 - l.a);
  return r + c * (1.0 - r.a);
}

// Both arms turned on their shoulders (positive raises them). They pass in front of the body
// and the mane (a hand reaching up stays visible), except right at the shoulders, which cover the joints.
float bentAlpha(vec2 s, float elbow) {
  if (elbow == 0.0) return armL(s) * tex(s).a;
  vec2 f = rot(s, ELBOW, -elbow);
  float fore = foreArm(f) ? armL(f) * tex(f).a : 0.0;
  float upper = upperArm(s) ? armL(s) * tex(s).a : 0.0;
  return max(fore, upper);
}
float armAlpha(vec2 q) {
  return max(bentAlpha(armLeft(q), uElbowL), bentAlpha(armRight(q), uElbowR));
}
vec4 bentArm(vec2 s, float elbow) {
  if (elbow == 0.0) return armL(s) > 0.0 ? part(s) : vec4(0.0);
  vec2 f = rot(s, ELBOW, -elbow);
  vec4 fore = (armL(f) > 0.0 && foreArm(f)) ? part(f) : vec4(0.0);
  vec4 upper = (armL(s) > 0.0 && upperArm(s)) ? part(s) : vec4(0.0);
  return fore + upper * (1.0 - fore.a);
}

// The head and mane acting, on the body only: an arm raised up into the mane stays straight.
vec2 bend(vec2 q) {
  // head tilt: everything above the collar bends around the neck, the body stays put. So do the
  // tips of the mane hanging down on either side of her shoulders: they belong to the head.
  float tips = smoothstep(26.0, 40.0, abs(q.x - AXIS)) * smoothstep(195.0, 175.0, q.y);
  q = rot(q, NECK, -uHead * max(smoothstep(162.0, 138.0, q.y), tips));

  // mane flare: the shards bristle outward, unevenly, around a rigid face
  if (uMane != 0.0) {
    vec2 d = q - MANE;
    float spikes = 0.55 + 0.9 * vnoise(vec2(atan(d.y, d.x) * 2.6, 4.0));
    float w = smoothstep(182.0, 60.0, q.y) * smoothstep(16.0, 30.0, distance(q, FACE));
    q = MANE + d / (1.0 + uMane * w * 0.32 * spikes);
  }

  // mane sway, strongest at the tips
  float hw = smoothstep(175.0, 5.0, q.y);
  q.x -= uHair * hw * (0.65 + 0.35 * sin(q.y * 0.055));
  q.y -= uHair * 0.22 * hw * sin(q.x * 0.045);
  return q;
}

bool gRim;
vec4 layered(vec2 screen, bool outline) {
  // a drawn pose picture is not laid out like the sprite: no arm zone, no joints, drawn as it is
  if (uFlat > 0.5) return part(screen);
  vec2 q = upperBody(screen);
  vec2 qL = armLeft(q);
  vec2 qR = armRight(q);
  vec4 l = bentArm(qL, uElbowL);
  vec4 r = bentArm(qR, uElbowR);
  vec4 arms = l + r * (1.0 - l.a);
  vec4 b = standingRig() ? standingBody(screen, q) : torso(bend(q));
  bool joint = distance(q, SHOULDER_L) < 18.0 || distance(q, SHOULDER_R) < 18.0;
  if (joint) return b + arms * (1.0 - b.a);
  // where an arm crosses the body or the mane, ink a violet line around it so it reads
  if (outline && arms.a < 0.5 && b.a > 0.5 && (uArmL != 0.0 || uArmR != 0.0 || uElbowL != 0.0 || uElbowR != 0.0)) {
    float edge = max(max(armAlpha(q + vec2(1.8, 0.0)), armAlpha(q - vec2(1.8, 0.0))),
                     max(armAlpha(q + vec2(0.0, 1.8)), armAlpha(q - vec2(0.0, 1.8))));
    if (edge > 0.5) gRim = true;
  }
  return arms + b * (1.0 - arms.a);
}

vec4 rig(vec2 screen) {
  gPartA = 0.0;
  gRim = false;
  vec4 raw = layered(screen, true);
  return gRim ? vec4(uRim, 1.0) : finish(raw);
}

// Only the coverage: afterimages and the violet rim need the shape, not its colours.
float rigAlpha(vec2 screen) {
  return layered(screen, false).a;
}

// What happens to the whole drawing: the teleport collapse, glitch slices, line boil.
vec2 settle(vec2 p) {
  vec2 q = p;

  // teleport: squeeze into a vertical line of light
  q.x = AXIS + (q.x - AXIS) / max(1.0 - uCollapse, 0.025);
  q.y = 240.0 + (q.y - 240.0) / (1.0 + uCollapse * 0.4);

  // relic-style slices
  if (uGlitch > 0.0) {
    float bh = mix(5.0, 26.0, hash(vec2(uGlitchSeed, 7.0)));
    float band = floor(q.y / bh);
    float on = step(1.0 - uGlitch * 0.6, hash(vec2(band, uGlitchSeed)));
    q.x += on * (hash(vec2(band + 3.0, uGlitchSeed)) - 0.5) * 72.0 * uGlitch;
  }

  // boil: the line wobble you get when every drawing is redone by hand
  q += (vec2(vnoise(q * 0.075 + uSeed * 13.7), vnoise(q * 0.075 + uSeed * 7.3 + 31.0)) - 0.5) * 2.0 * uBoil;
  return q;
}

void main() {
  vec2 p = vPx;

  if (uDissolve > 0.0) {
    vec2 g = rot(p, vec2(110.0, 210.0), 0.55);
    vec2 cell = floor(g / vec2(16.0, 9.0));
    if (hash(cell + floor(uGlitchSeed)) < uDissolve) discard;
  }

  vec2 q = settle(p);
  vec4 c = rig(q);
  vec3 col = c.rgb;
  float a = c.a;

  // chromatic split: red and blue channels pulled apart
  if (uSplit > 0.0) {
    vec4 cr = rig(q + vec2(uSplit, 0.0));
    vec4 cb = rig(q - vec2(uSplit, uSplit * 0.3));
    col = vec3(cr.r, col.g, cb.b);
    a = max(a, max(cr.a, cb.a));
  }

  // smear frame: two multiples of the head trailing where it came from
  if (uSmear != vec2(0.0)) {
    float hw = smoothstep(178.0, 140.0, q.y);
    for (int i = 1; i <= 2; i++) {
      vec4 m = rig(q - uSmear * hw * float(i) * 0.5);
      col += m.rgb * (1.0 - a);
      a += m.a * (1.0 - a);
    }
  }

  // impact frame: flat silhouette
  col = mix(col, uSil.rgb * a, uSil.a);

  // afterimages: the other minds in her, a green and a red copy pulled apart
  if (uEcho != vec2(0.0)) {
    float e1 = rigAlpha(q - uEcho) * (1.0 - a);
    col += vec3(0.21, 1.0, 0.48) * e1;
    a += e1;
    float e2 = rigAlpha(q + uEcho) * (1.0 - a);
    col += vec3(1.0, 0.13, 0.32) * e2;
    a += e2;
  }

  // violet misregistration behind the figure
  float rim = rigAlpha(q - uMisreg) * (1.0 - a);
  col += uRim * rim;
  a += rim;

  gl_FragColor = vec4(col, a) * uAlpha;
}`;

const UNIFORMS = [
  'uView', 'uPad', 'uTex', 'uSize', 'uSeed', 'uBoil', 'uHair', 'uHead', 'uMane', 'uArmL', 'uArmR', 'uElbowL', 'uElbowR', 'uWaist', 'uPelvis', 'uThighL', 'uThighR', 'uLegL', 'uLegR', 'uLongL', 'uLongR',
  'uSit', 'uFlat', 'uBend', 'uKickL', 'uKickR',
  'uSmear', 'uEcho', 'uGlitch', 'uGlitchSeed',
  'uSplit', 'uCollapse', 'uDissolve', 'uSparkle', 'uGrade', 'uSil', 'uMisreg', 'uRim', 'uAlpha', 'uPx',
];

// Rotation views beyond the front sprite. Right-side views are the mirrored left; a view the
// pack does not supply falls back: quarter to side, everything else to front.
export const VIEW_ORDER = ['front', 'side', 'quarter', 'back'];
// Drawn pose pictures live in the same texture map after the rotation views.
export const POSE_ORDER = ['loungeCoiled', 'loungeSprawl'];
export const TEXTURE_ORDER = [...VIEW_ORDER, ...POSE_ORDER];
export function resolveView(view, available) {
  if (available.has(view)) return view;
  if (view === 'quarter' && available.has('side')) return 'side';
  return 'front';
}

export const SPRITE = {
  width: 240, height: 420, pad: 56,
  head: { x: 116, y: 132 },
  feet: { x: 128, y: 418 },
  hip: 232, // where she sits
  // the reaching arm, as in the shader; the right arm is it mirrored around x = mirror / 2
  shoulder: { x: 98, y: 168 },
  hand: { x: 24, y: 212 },
  elbow: { x: 60.2, y: 190.5 },
  legCut: 244,
  waist: { x: 116, y: 202 },
  mirror: 234,
  armL(x, y) {
    if (x > 101 || y > 234) return false;
    const top = 159 + (98 - x) * 0.5;
    const bot = x < 50 ? 234 : 178 + (98 - x) * 0.62;
    return y >= top && y <= bot;
  },
};

// The pose values a redraw depends on, in a fixed order. The seeds only matter while the effects
// using them are on.
export function poseKey(s, out) {
  out[0] = (s.boil > 0 || s.sparkle > 0) ? s.seed : 0;
  out[1] = s.boil; out[2] = s.hair; out[3] = s.head; out[4] = s.mane; out[5] = s.armL; out[6] = s.armR;
  out[7] = s.longL; out[8] = s.longR; out[9] = s.sit; out[10] = s.bend; out[11] = s.kickL + (s.ikKneeL ?? 0); out[12] = s.kickR + (s.ikKneeR ?? 0);
  out[13] = s.smear[0]; out[14] = s.smear[1]; out[15] = s.echo[0]; out[16] = s.echo[1];
  out[17] = s.glitch; out[18] = s.glitch > 0 ? s.glitchSeed : 0; out[19] = s.split; out[20] = s.collapse;
  out[21] = s.dissolve; out[22] = s.sparkle; out[23] = s.grade; out[24] = s.sil[0]; out[25] = s.sil[1];
  out[26] = s.sil[2]; out[27] = s.silAmount; out[28] = s.misreg[0]; out[29] = s.misreg[1]; out[30] = s.alpha;
  out[31] = s.elbowL ?? 0; out[32] = s.elbowR ?? 0;
  out[33] = (s.thighL ?? 0) + (s.ikThighL ?? 0); out[34] = (s.thighR ?? 0) + (s.ikThighR ?? 0);
  out[35] = s.hipX ?? 0; out[36] = s.crouch ?? 0; out[37] = s.waist ?? 0;
  out[38] = TEXTURE_ORDER.indexOf(s.poseTex ?? s.view);
  out[39] = s.face ?? -1;
  return out;
}

// True when a drawing would visibly differ (springs asymptote; don't redraw for that).
export function poseChanged(previous, next, epsilon = 0.0004) {
  for (let i = 0; i < next.length; i++) if (!(Math.abs(previous[i] - next[i]) <= epsilon)) return true;
  return false;
}

// Where the left hand is in sprite space, for an arm raised by `angle`, stretched by `long` and bent by `elbow`.
export function handPoint(angle, long, elbow) {
  const { shoulder, elbow: joint, hand } = SPRITE;
  const fx = (hand.x - joint.x) * long, fy = (hand.y - joint.y) * long;
  const vx = (joint.x - shoulder.x) * long + Math.cos(elbow) * fx - Math.sin(elbow) * fy;
  const vy = (joint.y - shoulder.y) * long + Math.sin(elbow) * fx + Math.cos(elbow) * fy;
  return { x: shoulder.x + Math.cos(angle) * vx - Math.sin(angle) * vy, y: shoulder.y + Math.sin(angle) * vx + Math.cos(angle) * vy };
}

export class SpriteRenderer {
  constructor(canvas, image, views = {}, poses = {}) {
    this.key = new Float64Array(40).fill(NaN);
    this.nextKey = new Float64Array(40);
    this.face = null;
    this.stats = { frames: 0, draws: 0 };
    this.canvas = canvas;
    this.image = image;
    this.views = views;
    this.poses = poses;
    this.scale = null;
    this.setup();
    // the GPU can be reset (waking from sleep, a driver update): without this she'd stay gone
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => {
      this.setup();
      if (this.scale) this.resize(this.scale);
    });
  }

  // Her shader and picture on the GPU (again, after a reset).
  setup() {
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    for (const name of UNIFORMS) this.u[name] = gl.getUniformLocation(prog, name);

    // Every rotation view gets its own texture; they share one sampler and the same 240x420
    // grid, and the drawing binds the pose's view (see resolveView for the fallback).
    const upload = (picture) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    this.tex = new Map([['front', upload(this.image)]]);
    for (const [name, picture] of Object.entries({ ...this.views, ...this.poses })) {
      if (picture && picture !== this.image && !this.tex.has(name)) this.tex.set(name, upload(picture));
    }

    this.faceShown = -1; // the new texture has the face as drawn on the sprite
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform2f(this.u.uSize, SPRITE.width, SPRITE.height);
    gl.uniform1f(this.u.uPad, SPRITE.pad);
    gl.uniform2f(this.u.uView, SPRITE.width + SPRITE.pad * 2, SPRITE.height + SPRITE.pad * 2);
    gl.clearColor(0, 0, 0, 0);
    this.key.fill(NaN); // a new context has nothing on it
  }

  // Her expressions (overlay/face.ts builds the atlas): one row of equal cells, each a picture of
  // her face for `rect` on the sprite. The one showing is painted into the front texture itself,
  // a few dozen pixels re-sent only when her face changes: the shader has nothing extra to do, and
  // the face tilts, boils, smears and glitches with the rest of her.
  setFace(face) {
    this.face = null;
    this.showFace(-1);
    if (face) {
      const rect = { x: Math.round(face.rect.x), y: Math.round(face.rect.y), width: Math.round(face.rect.width), height: Math.round(face.rect.height) };
      const cellW = face.atlas.width / face.count;
      const patch = (index) => {
        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        if (index >= 0) ctx.drawImage(face.atlas, index * cellW, 0, cellW, face.atlas.height, 0, 0, rect.width, rect.height);
        return canvas;
      };
      this.face = { rect, count: face.count, drawn: patch(-1), cells: Array.from({ length: face.count }, (_, index) => patch(index)) };
    }
    this.key.fill(NaN);
  }

  // Put expression `index` on the front texture (-1: her face as drawn on the sprite).
  showFace(index) {
    const face = this.face;
    const cell = face && index >= 0 && index < face.count ? index : -1;
    if (cell === this.faceShown) return;
    this.faceShown = cell;
    if (!face) return;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.get('front'));
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, face.rect.x, face.rect.y, gl.RGBA, gl.UNSIGNED_BYTE, cell < 0 ? face.drawn : face.cells[cell]);
  }

  // css size of the canvas for a given sprite scale
  static cssSize(scale) {
    return {
      width: Math.round((SPRITE.width + SPRITE.pad * 2) * scale),
      height: Math.round((SPRITE.height + SPRITE.pad * 2) * scale),
    };
  }

  resize(scale) {
    this.scale = scale;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = SpriteRenderer.cssSize(scale);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.u.uPx, 1 / (scale * dpr));
    this.key.fill(NaN); // resizing cleared the buffer
  }

  // Draws only when the drawing would change, so held cels cost nothing. Returns whether it drew:
  // the buffer can only be read back in the same task as a real draw.
  draw(s) {
    this.stats.frames++;
    poseKey(s, this.nextKey);
    if (!poseChanged(this.key, this.nextKey)) return false;
    this.key.set(this.nextKey);
    this.stats.draws++;
    const { gl, u } = this;
    this.showFace(this.nextKey[39]);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.get(s.poseTex && this.tex.has(s.poseTex) ? s.poseTex : resolveView(s.view, this.tex)) ?? this.tex.get('front'));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.uSeed, s.seed);
    gl.uniform1f(u.uBoil, s.boil);
    gl.uniform1f(u.uHair, s.hair);
    gl.uniform1f(u.uHead, s.head);
    gl.uniform1f(u.uMane, s.mane);
    gl.uniform1f(u.uArmL, s.armL);
    gl.uniform1f(u.uArmR, s.armR);
    gl.uniform1f(u.uElbowL, s.elbowL ?? 0);
    gl.uniform1f(u.uElbowR, s.elbowR ?? 0);
    gl.uniform1f(u.uLongL, s.longL);
    gl.uniform1f(u.uLongR, s.longR);
    gl.uniform1f(u.uSit, s.sit);
    gl.uniform1f(u.uFlat, s.poseTex && this.tex.has(s.poseTex) ? 1 : 0);
    gl.uniform1f(u.uBend, s.bend);
    gl.uniform1f(u.uKickL, this.nextKey[11]);
    gl.uniform1f(u.uKickR, this.nextKey[12]);
    gl.uniform1f(u.uThighL, this.nextKey[33]);
    gl.uniform1f(u.uThighR, this.nextKey[34]);
    // the leg lengths follow from the pelvis, which is already part of the key
    const len = s.legScale;
    gl.uniform2f(u.uLegL, len?.[0] ?? 1, len?.[1] ?? 1);
    gl.uniform2f(u.uLegR, len?.[2] ?? 1, len?.[3] ?? 1);
    gl.uniform2f(u.uPelvis, this.nextKey[35], this.nextKey[36]);
    gl.uniform1f(u.uWaist, this.nextKey[37]);
    gl.uniform2f(u.uSmear, s.smear[0], s.smear[1]);
    gl.uniform2f(u.uEcho, s.echo[0], s.echo[1]);
    gl.uniform1f(u.uGlitch, s.glitch);
    gl.uniform1f(u.uGlitchSeed, s.glitchSeed);
    gl.uniform1f(u.uSplit, s.split);
    gl.uniform1f(u.uCollapse, s.collapse);
    gl.uniform1f(u.uDissolve, s.dissolve);
    gl.uniform1f(u.uSparkle, s.sparkle);
    gl.uniform1f(u.uGrade, s.grade);
    gl.uniform4f(u.uSil, s.sil[0], s.sil[1], s.sil[2], s.silAmount);
    gl.uniform2f(u.uMisreg, s.misreg[0], s.misreg[1]);
    gl.uniform3f(u.uRim, 0.48, 0.24, 1.0);
    gl.uniform1f(u.uAlpha, s.alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
}
