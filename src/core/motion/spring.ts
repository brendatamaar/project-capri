// Exact critically damped spring adapted from TheAgencyMGE Animator (MIT).
export interface Spring { readonly value: number; readonly velocity: number }
export function spring(state: Spring, target: number, dt: number, stiffness = 40): Spring {
  const h = Math.min(0.25, Math.max(0, dt));
  const w = Math.sqrt(stiffness), y = state.value-target;
  const e = Math.exp(-w*h), tmp = (state.velocity+w*y)*h;
  return { value: target+(y+tmp)*e, velocity: (state.velocity-w*tmp)*e };
}
