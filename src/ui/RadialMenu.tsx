import { Circle, Sparkles, Triangle, UserCheck } from 'lucide-react';
import type { ArcanePatternId } from './hudLogic';

export interface RadialMenuProps {
  open: boolean;
  centerX: number;
  centerY: number;
  activeSector: ArcanePatternId | null;
  selectedPattern: ArcanePatternId;
  labels: Record<ArcanePatternId, { name: string; desc: string }>;
  onSelectSector: (sector: ArcanePatternId) => void;
  onHoverSector: (sector: ArcanePatternId | null) => void;
}

interface SectorSpec {
  id: ArcanePatternId;
  startDeg: number;
  endDeg: number;
  iconX: number;
  iconY: number;
  color: string;
}

const SECTORS: SectorSpec[] = [
  { id: 'triangle', startDeg: -135, endDeg: -45, iconX: 120, iconY: 45, color: '#62F2E4' },
  { id: 'star', startDeg: -45, endDeg: 45, iconX: 194, iconY: 120, color: '#F4CC68' },
  { id: 'circle', startDeg: 45, endDeg: 135, iconX: 120, iconY: 195, color: '#79EA74' },
  { id: 'decoy', startDeg: 135, endDeg: 225, iconX: 46, iconY: 120, color: '#C59BFF' },
];

function sectorArcPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const s = (startDeg * Math.PI) / 180;
  const e = (endDeg * Math.PI) / 180;
  const x1 = cx + Math.cos(s) * rOuter;
  const y1 = cy + Math.sin(s) * rOuter;
  const x2 = cx + Math.cos(e) * rOuter;
  const y2 = cy + Math.sin(e) * rOuter;
  const x3 = cx + Math.cos(e) * rInner;
  const y3 = cy + Math.sin(e) * rInner;
  const x4 = cx + Math.cos(s) * rInner;
  const y4 = cy + Math.sin(s) * rInner;
  return [
    `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    `L ${x3.toFixed(1)} ${y3.toFixed(1)}`,
    `A ${rInner} ${rInner} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)}`,
    'Z',
  ].join(' ');
}

function PatternIcon({ id, color }: { id: ArcanePatternId; color: string }) {
  if (id === 'triangle') return <Triangle className="h-4 w-4" style={{ color }} aria-hidden="true" />;
  if (id === 'star') return <Sparkles className="h-4 w-4" style={{ color }} aria-hidden="true" />;
  if (id === 'circle') return <Circle className="h-4 w-4" style={{ color }} aria-hidden="true" />;
  return <UserCheck className="h-4 w-4" style={{ color }} aria-hidden="true" />;
}

export function RadialMenu({
  open,
  centerX,
  centerY,
  activeSector,
  selectedPattern,
  labels,
  onSelectSector,
  onHoverSector,
}: RadialMenuProps) {
  if (!open) return null;

  const size = 240;
  const half = size / 2;
  const highlighted = activeSector ?? selectedPattern;

  return (
    <div
      data-radial-wheel="true"
      className="fixed z-50 select-none"
      style={{
        left: `${Math.round(centerX - half)}px`,
        top: `${Math.round(centerY - half)}px`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg viewBox="0 0 240 240" className="h-full w-full drop-shadow-[0_14px_28px_rgba(0,0,0,0.88)]">
        <circle cx={half} cy={half} r={114} fill="rgba(10, 9, 16, 0.55)" stroke="rgba(214,168,86,0.45)" strokeWidth="1.2" />
        {SECTORS.map((sec) => {
          const isActive = highlighted === sec.id;
          return (
            <path
              key={sec.id}
              d={sectorArcPath(half, half, 38, 108, sec.startDeg + 2, sec.endDeg - 2)}
              fill={isActive ? 'rgba(226, 179, 84, 0.28)' : 'rgba(20, 18, 30, 0.84)'}
              stroke={isActive ? sec.color : 'rgba(176, 134, 62, 0.52)'}
              strokeWidth={isActive ? 2.2 : 1.1}
              className="cursor-pointer transition-colors duration-100"
              onMouseEnter={() => onHoverSector(sec.id)}
              onClick={() => onSelectSector(sec.id)}
            />
          );
        })}
        <circle cx={half} cy={half} r={30} fill="rgba(12, 11, 18, 0.92)" stroke="#E2B354" strokeWidth="1.5" />
      </svg>

      {SECTORS.map((sec) => {
        const isActive = highlighted === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            data-radial-sector={sec.id}
            onMouseEnter={() => onHoverSector(sec.id)}
            onClick={() => onSelectSector(sec.id)}
            style={{ left: `${sec.iconX}px`, top: `${sec.iconY}px` }}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center transition-transform ${
              isActive ? 'scale-110' : 'opacity-85'
            }`}
          >
            <PatternIcon id={sec.id} color={sec.color} />
            <span className="font-display max-w-[78px] text-[8px] font-bold uppercase leading-[1.1] tracking-wide text-[#FBF2E1] drop-shadow-md">
              {labels[sec.id].name}
            </span>
          </button>
        );
      })}

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="font-display block text-[8px] font-bold uppercase tracking-widest text-[#FFE29A]">
          {labels[highlighted].name.split(' ')[0]}
        </span>
      </div>
    </div>
  );
}
