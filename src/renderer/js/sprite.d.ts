/** Types for the retained JavaScript renderer; shader implementation stays unchanged. */
import type { ViewName } from '../../shared/art';
export class SpriteRenderer {
  constructor(canvas: HTMLCanvasElement, image: HTMLImageElement, views?: Partial<Record<ViewName, HTMLImageElement>>);
  gl: WebGLRenderingContext;
  /** Her expressions: one row of equal cells, each painted into the front texture at `rect` (sprite px) while it shows. Null removes them. */
  setFace(face: { atlas: TexImageSource; count: number; rect: { x: number; y: number; width: number; height: number } } | null): void;
  resize(scale: number): void;
  draw(pose: Record<string, number | number[] | string>): void;
}
