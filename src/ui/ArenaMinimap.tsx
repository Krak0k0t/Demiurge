import type { DuelState } from '../game/duelEngine';
import { buildMinimapDots } from './hudLogic';

export interface ArenaMinimapProps {
  state: DuelState;
  title: string;
  compact?: boolean;
}

export function ArenaMinimap({ state, title, compact = false }: ArenaMinimapProps) {
  const dots = buildMinimapDots(state);
  const sizeClass = compact ? 'h-16 w-16' : 'h-20 w-20';

  return (
    <div
      data-arena-minimap="true"
      title={title}
      aria-label={title}
      className={`hud-surface relative shrink-0 overflow-hidden rounded-full border border-[#C69646]/65 bg-black/70 shadow-[0_8px_22px_rgba(0,0,0,0.8)] ${sizeClass}`}
    >
      {/* Subtle Rose Ring & Crosshair Lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-1.5 rounded-full border border-[#5EC8BE]/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 h-[1px] -translate-y-1/2 bg-[#A67F38]/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-2 left-1/2 w-[1px] -translate-x-1/2 bg-[#A67F38]/20"
      />

      {dots.map((dot) => {
        const isEnemy = dot.kind === 'enemy_archon' || dot.kind === 'enemy_unit';
        const isArchon = dot.kind === 'player_archon' || dot.kind === 'enemy_archon';
        return (
          <span
            key={dot.id}
            style={{ left: `${dot.xPct}%`, top: `${dot.yPct}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
              isArchon ? 'h-2.5 w-2.5 ring-1 ring-[#FFE8AE]/70' : 'h-2 w-2'
            } ${
              isEnemy
                ? 'bg-[#FF6C57] shadow-[0_0_6px_rgba(255,108,87,0.85)]'
                : 'bg-[#66E8DC] shadow-[0_0_6px_rgba(102,232,220,0.85)]'
            } ${dot.shielded ? 'ring-1 ring-white' : ''}`}
          />
        );
      })}
    </div>
  );
}
