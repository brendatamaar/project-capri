export function parseAddress(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Probe requires a loopback HTTP origin');
  }
  return url.origin;
}
export function checkDescriptor(value) {
  if (value?.serverVersion !== '0.1.7' || value?.orchestrationProtocolVersion !== 2) {
    throw new Error('Unsupported server version or protocol');
  }
  return { serverVersion: value.serverVersion, orchestrationProtocolVersion: 2 };
}
export function parseToken(value) {
  if (value?.token_type !== 'Bearer' || typeof value.access_token !== 'string' || !value.access_token.trim()
      || !Number.isFinite(value.expires_in) || value.expires_in <= 0
      || typeof value.scope !== 'string' || !value.scope.split(/\s+/).includes('orchestration:read')) {
    throw new Error('Invalid token response or missing monitoring scope');
  }
  return value;
}

export function shellInput(sequence) {
  if (sequence !== undefined && (!Number.isSafeInteger(sequence) || sequence < 0)) throw new Error('Invalid sequence');
  return { ...(sequence === undefined ? {} : { afterSequence: sequence }), requestCompletionMarker: true };
}
