import { useEffect, useMemo, useState } from "react";

export function useCountdown(releaseAt?: string | null) {
  const target = useMemo(() => (releaseAt ? new Date(releaseAt).getTime() : null), [releaseAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!target) return { expired: false, days: 0, hours: 0, minutes: 0, seconds: 0, remaining: null };

  const remaining = Math.max(0, target - now);
  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const expired = remaining <= 0;

  return { expired, days, hours, minutes, seconds, remaining };
}
