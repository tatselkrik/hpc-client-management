import { useEffect, useState } from "react";

export function useClinicClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    let timer: number;
    const schedule = () => {
      const day = 86_400_000;
      const delay = day - ((Date.now() + 8 * 3_600_000) % day) + 20;
      timer = window.setTimeout(() => { update(); schedule(); }, delay);
    };
    schedule();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return now;
}
