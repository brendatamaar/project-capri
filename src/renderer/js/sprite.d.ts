/** Types for the retained JavaScript renderer; shader implementation stays unchanged. */
export class SpriteRenderer {
  constructor(canvas: HTMLCanvasElement, image: HTMLImageElement);
  gl: WebGLRenderingContext;
  resize(scale: number): void;
  draw(pose: Record<string, number | number[]>): void;
}
