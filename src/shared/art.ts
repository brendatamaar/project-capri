import { EXPRESSIONS, type Expression } from '../core/motion/expression';
export type ArtSource = 'installed' | 'development' | 'placeholder';
/** The keys a pack may use in its optional `props` map. Each one replaces the code-drawn prop of that name. */
export const PROP_NAMES = ['boombox', 'guitar', 'cannon', 'popcorn', 'coffee', 'chicken', 'camera', 'balloon', 'shades', 'note', 'heart', 'star', 'puff'] as const;
export type PropName = typeof PROP_NAMES[number];
/** The rotation views a pack may supply besides the front sprite. Right-side views are the mirrored left; a missing view falls back toward front. */
export const VIEW_NAMES = ['side', 'quarter', 'back'] as const;
export type ViewName = typeof VIEW_NAMES[number];
/** Drawn pose pictures a pack may supply on the front sprite's 240x420 grid. When present they replace the rig-warped lounge; absent, the rig poses remain. */
export const POSE_NAMES = ['loungeCoiled', 'loungeSprawl'] as const;
export type PoseName = typeof POSE_NAMES[number];
/** The keys a pack may use in its optional `expressions` map: her face on the body sprite, one picture each, drawn over `faceAnchor`. */
export const EXPRESSION_NAMES = EXPRESSIONS;
export type ExpressionName = Expression;
export interface ArtDescriptor {
  name: string;
  version: 1;
  rig: 'mochi-v1';
  source: ArtSource;
  sprite: string;
  faces: Record<string, string>;
  cutins: Record<string, string>;
  intro: Record<string, string>;
  props: Partial<Record<PropName, string>>;
  views: Partial<Record<ViewName, string>>;
  poses: Partial<Record<PoseName, string>>;
  /** Empty unless the pack has a faceAnchor and at least a `neutral` expression. */
  expressions: Partial<Record<ExpressionName, string>>;
  faceAnchor?: { x: number; y: number; width: number; height: number; background: string };
}
