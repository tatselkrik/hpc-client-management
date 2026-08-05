import { useEffect, useRef } from "react";

const DEFAULT_IDLE_LOCK_MINUTES = 15;
const MIN_IDLE_LOCK_MINUTES = 1;

const getConfiguredIdleLockMinutes = () => {
  const configuredValue = Number(import.meta.env.VITE_IDLE_LOCK_MINUTES);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_IDLE_LOCK_MINUTES;
  }

  return Math.max(MIN_IDLE_LOCK_MINUTES, configuredValue);
};

export const CLINICAL_IDLE_LOCK_MINUTES = getConfiguredIdleLockMinutes();

type UseIdleSessionLockOptions = {
  enabled: boolean;
  onIdle: () => void | Promise<void>;
};

export function useIdleSessionLock({ enabled, onIdle }: UseIdleSessionLockOptions) {
  const onIdleRef = useRef(onIdle);
  const isLockingRef = useRef(false);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) {
      isLockingRef.current = false;
      return;
    }

    let idleTimerId: number | undefined;

    const clearIdleTimer = () => {
      if (idleTimerId !== undefined) {
        window.clearTimeout(idleTimerId);
        idleTimerId = undefined;
      }
    };

    const lockIfIdle = () => {
      if (isLockingRef.current) return;

      isLockingRef.current = true;
      void onIdleRef.current();
    };

    const resetIdleTimer = () => {
      if (isLockingRef.current) return;

      clearIdleTimer();
      idleTimerId = window.setTimeout(
        lockIfIdle,
        CLINICAL_IDLE_LOCK_MINUTES * 60 * 1000,
      );
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "pointerdown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      clearIdleTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [enabled]);
}
