/** Pure path policy shared by the art boundary and protocol interpreter. */
export function isArtPath(value: string): boolean {
  if (value.length > 200 || !/\.(png|webp|jpe?g)$/i.test(value)) return false;
  return value.split('/').every(part =>
    /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part)
    && !part.endsWith('.')
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}
