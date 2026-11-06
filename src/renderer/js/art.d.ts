import type { ArtDescriptor } from '../../shared/art';
export function loadArtImages(descriptor: ArtDescriptor, loadImage: (url: string) => Promise<HTMLImageElement>): Promise<{
  image: HTMLImageElement; faces: Record<string, HTMLImageElement>;
  cutins: Record<string, HTMLImageElement>; intro: Record<string, HTMLImageElement> | null;
}>;
