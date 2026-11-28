export interface RadialSlotOffset {
  x: number;
  y: number;
  angleDeg: number;
}

/**
 * Computes evenly spaced arc coordinates for a floating radial action wheel.
 * Positive Y points downward (CSS translate coordinates), so negative Y fans upward above the trigger button.
 */
export function computeRadialSlotOffsets(
  count: number,
  radiusPx: number,
  startDeg = 195,
  endDeg = 345
): RadialSlotOffset[] {
  if (count <= 0) return [];
  if (count === 1) {
    const midRad = (((startDeg + endDeg) * 0.5) * Math.PI) / 180;
    return [
      {
        x: Math.round(Math.cos(midRad) * radiusPx),
        y: Math.round(Math.sin(midRad) * radiusPx),
        angleDeg: (startDeg + endDeg) * 0.5,
      },
    ];
  }
  const slots: RadialSlotOffset[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angleDeg = startDeg + (endDeg - startDeg) * t;
    const rad = (angleDeg * Math.PI) / 180;
    slots.push({
      x: Math.round(Math.cos(rad) * radiusPx),
      y: Math.round(Math.sin(rad) * radiusPx),
      angleDeg,
    });
  }
  return slots;
}
