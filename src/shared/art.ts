export type ArtSource = 'installed' | 'development' | 'placeholder';
export interface ArtDescriptor {
  name: string;
  version: 1;
  rig: 'mochi-v1';
  source: ArtSource;
  sprite: string;
  faces: Record<string, string>;
  cutins: Record<string, string>;
  intro: Record<string, string>;
  faceAnchor?: { x: number; y: number; width: number; height: number; background: string };
}
