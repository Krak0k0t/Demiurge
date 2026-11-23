import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Zap } from 'lucide-react';
import type { HelloState } from '../systems/etherChannel';

interface HelloHudProps {
  state: HelloState;
  onToggleOverload: () => void;
  onReset: () => void;
}

export function HelloHud({ state, onToggleOverload, onReset }: HelloHudProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') setCollapsed((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const accentBorder = state.overloadActive ? '#B93826' : '#BE9F4E';
  const accentText = state.overloadActive ? '#E87A68' : '#679793';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div
          className="pointer-events-auto border px-4 py-2.5"
          style={{
            backgroundColor: 'rgba(26, 24, 26, 0.92)',
            borderColor: accentBorder,
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#BE9F4E]">
            Тест 3D-среды · Фаза 4
          </div>
          <h1
            className="mt-0.5 text-lg font-semibold tracking-wide text-[#F4ECE0]"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            Дуэль Демиургов
          </h1>
        </div>

        <div
          className="pointer-events-auto flex items-center gap-4 border px-4 py-2 font-num text-xs tabular-nums"
          style={{
            backgroundColor: 'rgba(26, 24, 26, 0.92)',
            borderColor: accentBorder,
          }}
        >
          <div>
            <span className="text-[#956842]">HP </span>
            <span className="font-semibold text-[#F4ECE0]">{state.hp}</span>
          </div>
          <div>
            <span className="text-[#956842]">ЭФИР </span>
            <span className="font-semibold" style={{ color: accentText }}>
              {state.ether}
            </span>
          </div>
          <div>
            <span className="text-[#956842]">ШАГОВ </span>
            <span className="font-semibold text-[#F4ECE0]">{state.moves}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="pointer-events-auto mb-1 inline-flex items-center gap-1.5 border border-[#BE9F4E]/60 px-3 py-1 text-[11px] uppercase tracking-wider text-[#BE9F4E] transition-colors hover:border-[#BE9F4E] hover:text-[#F4ECE0]"
          style={{ backgroundColor: 'rgba(26, 24, 26, 0.92)' }}
        >
          {collapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Панель (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Скрыть (H)</span>
            </>
          )}
        </button>

        {!collapsed && (
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 border px-4 py-2.5 text-xs text-[#E7DFD3]"
            style={{
              backgroundColor: 'rgba(26, 24, 26, 0.94)',
              borderColor: accentBorder,
              maxWidth: 'min(940px, 94vw)',
            }}
          >
            <span className="text-[#C7B8A1]">
              <strong className="font-num text-[#BE9F4E]">WASD / Стрелки</strong> — движение тотема
            </span>

            <span className="h-4 w-px bg-[#BE9F4E]/30" aria-hidden="true" />

            <button
              type="button"
              onClick={onToggleOverload}
              className="inline-flex items-center gap-1.5 border px-3 py-1.5 font-medium transition-colors"
              style={{
                borderColor: state.overloadActive ? '#B93826' : '#679793',
                backgroundColor: state.overloadActive
                  ? 'rgba(185, 56, 38, 0.24)'
                  : 'rgba(103, 151, 147, 0.16)',
                color: state.overloadActive ? '#FFB2A6' : '#A9E2DD',
              }}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {state.overloadActive ? 'Снять Перегрузку (Space)' : 'Перегрузка Канала (Space)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 border border-[#BE9F4E]/50 px-3 py-1.5 text-[#E7DFD3] transition-colors hover:border-[#BE9F4E]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Сброс (R)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
