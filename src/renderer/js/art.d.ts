import type { ArtDescriptor, ExpressionName, PropName, PoseName, ViewName } from '../../shared/art';
export function loadArtImages(descriptor: ArtDescriptor, loadImage: (url: string) => Promise<HTMLImageElement>): Promise<{
  image: HTMLImageElement; faces: Record<string, HTMLImageElement>;
  cutins: Record<string, HTMLImageElement>; intro: Record<string, HTMLImageElement> | null;
  props: Partial<Record<PropName, HTMLImageElement>>;
  views: Partial<Record<ViewName, HTMLImageElement>>;
  poses: Partial<Record<PoseName, HTMLImageElement>>;
  expressions: Partial<Record<ExpressionName, HTMLImageElement>>;
}>;
