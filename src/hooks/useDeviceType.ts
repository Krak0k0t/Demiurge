import { useEffect, useState } from 'react';

export type PlatformKind = 'mobile' | 'desktop';

export interface DeviceTypeState {
  deviceType: PlatformKind;
  isMobile: boolean;
  hasTouch: boolean;
  isShortLandscape: boolean;
  width: number;
  height: number;
}

export function classifyDeviceType(
  width: number,
  height: number,
  hasTouch: boolean
): DeviceTypeState {
  const safeW = Number.isFinite(width) && width > 0 ? width : 1280;
  const safeH = Number.isFinite(height) && height > 0 ? height : 720;
  const isShortLandscape = safeH <= 540;
  // Phones, tablets, short landscape mobile viewports, or touch devices under 1180px switch to Mobile UI.
  const isMobile = safeW < 1024 || isShortLandscape || (hasTouch && safeW < 1180);

  return {
    deviceType: isMobile ? 'mobile' : 'desktop',
    isMobile,
    hasTouch,
    isShortLandscape,
    width: safeW,
    height: safeH,
  };
}

function readWindowDeviceType(): DeviceTypeState {
  if (typeof window === 'undefined') {
    return classifyDeviceType(1280, 720, false);
  }
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  return classifyDeviceType(window.innerWidth, window.innerHeight, hasTouch);
}

export function useDeviceType(): DeviceTypeState {
  const [device, setDevice] = useState<DeviceTypeState>(() => readWindowDeviceType());

  useEffect(() => {
    const checkDevice = () => {
      setDevice(readWindowDeviceType());
    };
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}
