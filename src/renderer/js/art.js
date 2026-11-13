// Art assets are resolved by the main-process boundary; no filesystem paths enter the renderer.
export async function loadArtImages(descriptor, loadImage) {
  const loadOptional = async (assets) => Object.fromEntries((await Promise.all(
    Object.entries(assets).map(async ([name, url]) => {
      try { return [name, await loadImage(url)]; } catch { return null; }
    }),
  )).filter(Boolean));
  const [image, faces, cutins, introFrames, props, views, poses, expressions] = await Promise.all([
    loadImage(descriptor.sprite), loadOptional(descriptor.faces),
    loadOptional(descriptor.cutins), loadOptional(descriptor.intro), loadOptional(descriptor.props),
    loadOptional(descriptor.views ?? {}), loadOptional(descriptor.poses ?? {}), loadOptional(descriptor.expressions ?? {}),
  ]);
  return { image, faces, cutins, intro: introFrames.grab ? introFrames : null, props, views, poses, expressions };
}
