import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Current time, ticking every `intervalMs` while `active`, and refreshed on returning to the app. */
export function useNow(intervalMs = 1000, active = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    if (!active) return () => sub.remove();
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs, active]);
  return now;
}
