export type Activity = 'moving' | 'working' | 'idle' | 'asleep';
export function targetFrameRate(activity: Activity, hidden: boolean, setting: 30 | 60): number {
  if (hidden) return 0;
  switch (activity) {
    case 'moving': return setting;
    case 'working': return Math.min(setting, 30);
    case 'idle': return 15;
    case 'asleep': return 6;
  }
  const exhaustive: never = activity; return exhaustive;
}
