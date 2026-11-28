import { useCallback, useEffect, useRef, useState } from 'react';

export interface AutoHideState {
  isVisible: boolean;
  trigger: () => void;
  hide: () => void;
}

/**
 * Shows a transient HUD surface when triggered and automatically fades it out after `delayMs`.
 */
export function useAutoHide(delayMs = 1500): AutoHideState {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setIsVisible(false);
  }, [clearTimer]);

  const trigger = useCallback(() => {
    clearTimer();
    setIsVisible(true);
    if (typeof window !== 'undefined') {
      timerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        timerRef.current = null;
      }, delayMs);
    }
  }, [clearTimer, delayMs]);

  useEffect(() => clearTimer, [clearTimer]);

  return { isVisible, trigger, hide };
}
