import { useEffect, useRef, useState } from 'react';
import { computeSilkPct } from './hudLogic';

export interface SilkBarProps {
  silk: number;
  maxSilk?: number;
  label?: string;
  compact?: boolean;
}

export function SilkBar({ silk, maxSilk = 160, label, compact = false }: SilkBarProps) {
  const pct = computeSilkPct(silk, maxSilk);
  const prevSilkRef = useRef(silk);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (silk < prevSilkRef.current) {
      setShaking(true);
      const id = window.setTimeout(() => setShaking(false), 340);
      prevSilkRef.current = silk;
      return () => window.clearTimeout(id);
    }
    prevSilkRef.current = silk;
  }, [silk]);

  return (
    <div
      data-silk-bar="true"
      className={`flex flex-col gap-0.5 ${shaking ? 'silk-bar-shake' : ''}`}
      aria-label={label ?? 'Ether Silk'}
    >
      {label && (
        <div className="flex items-center justify-between gap-2 text-[9.5px] font-semibold tracking-wide text-[#B8F7F2] drop-shadow-md">
          <span className="font-display uppercase tracking-[0.12em]">{label}</span>
          <span className="font-num text-[#E8FFFD]">
            {Math.round(silk)}/{maxSilk}
          </span>
        </div>
      )}
      <div
        className={`hud-surface relative w-full overflow-hidden rounded-full border border-cyan-300/45 bg-black/55 backdrop-blur-md p-[1px] ${
          compact ? 'h-2' : 'h-2.5'
        }`}
      >
        <div
          className="h-full rounded-full bg-cyan-400/50 backdrop-blur-md transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.55)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
