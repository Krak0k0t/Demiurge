import { useState } from 'react';
import { Flame, Shield, Sparkles, Swords, Volume2, VolumeX, Wind, Zap } from 'lucide-react';
import { etherAudio } from '../audio/etherAudio';
import type { LookDevPreset, LookDevUiState } from '../view/lookdevScene';
import type { MagicSchool } from '../view/assets/creatureTotems';

interface LookDevHudProps {
  state: LookDevUiState;
  onSelectPreset: (preset: LookDevPreset) => void;
  onToggleOverload: () => void;
}

interface MockTarotCard {
  id: string;
  name: string;
  cost: number;
  school: MagicSchool;
  kind: string;
  atk?: number;
  hp?: number;
  rule: string;
}

const MOCK_HAND: MockTarotCard[] = [
  {
    id: 'card-sylph',
    name: 'Крылатый Сильф',
    cost: 2,
    school: 'kinet',
    kind: 'Полёт',
    atk: 3,
    hp: 2,
    rule: 'Игнорирует наземных защитников при атаке.',
  },
  {
    id: 'card-construct',
    name: 'Бронзовый Конструкт',
    cost: 3,
    school: 'synth',
    kind: 'Броня 1',
    atk: 2,
    hp: 5,
    rule: 'Снижает входящий боевой урон на 1.',
  },
  {
    id: 'card-discharge',
    name: 'Разряд Эфира',
    cost: 2,
    school: 'chaos',
    kind: 'Заклинание',
    rule: 'Наносит 4 урона существу или 3 демиургу.',
  },
  {
    id: 'card-altar',
    name: 'Алтарь Эфира',
    cost: 1,
    school: 'vital',
    kind: 'Ритуал',
    rule: 'Даёт +2 Эфира на этот ход и +1/+1 союзнику.',
  },
];

function SchoolIcon({ school }: { school: MagicSchool }) {
  if (school === 'kinet') return <Wind className="h-3.5 w-3.5 text-[#679793]" aria-hidden="true" />;
  if (school === 'synth') return <Shield className="h-3.5 w-3.5 text-[#6A8498]" aria-hidden="true" />;
  if (school === 'chaos') return <Flame className="h-3.5 w-3.5 text-[#E87A68]" aria-hidden="true" />;
  return <Sparkles className="h-3.5 w-3.5 text-[#BE9F4E]" aria-hidden="true" />;
}

export function LookDevHud({
  state,
  onSelectPreset,
  onToggleOverload,
}: LookDevHudProps) {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [muted, setMuted] = useState(etherAudio.isMuted());
  const [ambientOn, setAmbientOn] = useState(false);

  const accentBorder = state.overloadActive ? '#B93826' : '#BE9F4E';
  const etherTextColor = state.overloadActive ? '#E87A68' : '#679793';

  const handleToggleAudio = () => {
    const nextMuted = !muted;
    etherAudio.setMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted && !ambientOn) {
      const started = etherAudio.toggleAmbient(state.overloadActive);
      setAmbientOn(started);
    } else if (nextMuted) {
      setAmbientOn(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Projected 3D ATK / HP diamond Tarot badges */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {state.badges.map(
          (b) =>
            b.visible && (
              <div
                key={b.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${Math.round(b.x)}px`, top: `${Math.round(b.y)}px` }}
              >
                <div
                  className="flex items-center gap-2 border px-2.5 py-1 font-num text-xs font-semibold tabular-nums shadow-md"
                  style={{
                    backgroundColor: 'rgba(26, 24, 26, 0.92)',
                    borderColor: b.side === 'player' ? '#679793' : '#BE9F4E',
                    color: '#F4ECE0',
                  }}
                >
                  <span className="inline-flex items-center gap-1 text-[#BE9F4E]">
                    <Swords className="h-3 w-3" aria-hidden="true" />
                    {b.atk}
                  </span>
                  <span className="text-[#5B5B5B]">/</span>
                  <span className={b.side === 'player' ? 'text-[#679793]' : 'text-[#E87A68]'}>
                    {b.hp}
                  </span>
                </div>
              </div>
            )
        )}
      </div>

      {/* Top Arena HUD Strip */}
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:px-6 sm:pt-5">
        <div
          className="pointer-events-auto flex items-center gap-4 border px-4 py-2"
          style={{
            backgroundColor: 'rgba(26, 24, 26, 0.92)',
            borderColor: '#BE9F4E',
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#956842]">
              Соперник · Босс Хаотов
            </div>
            <div
              className="text-sm font-semibold tracking-wide text-[#F4ECE0]"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              Игнис-Канцлер
            </div>
          </div>
          <div className="h-6 w-px bg-[#BE9F4E]/30" aria-hidden="true" />
          <div className="flex items-center gap-3 font-num text-xs tabular-nums">
            <span>
              <span className="text-[#956842]">HP </span>
              <strong className="text-[#E87A68]">{state.enemyHp}</strong>
            </span>
            <span>
              <span className="text-[#956842]">ЭФИР </span>
              <strong className="text-[#BE9F4E]">{state.enemyEther}/4</strong>
            </span>
          </div>
        </div>

        <div
          className="pointer-events-auto border px-3.5 py-1.5 text-center"
          style={{
            backgroundColor: 'rgba(26, 24, 26, 0.92)',
            borderColor: accentBorder,
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#BE9F4E]">
            Аномалия арены · Раунд 2
          </div>
          <div className="text-xs font-medium text-[#F4ECE0]">
            Перегретый Разлом (+1 урон заклинаний)
          </div>
        </div>

        <div
          className="pointer-events-auto flex items-center gap-1.5 border p-1 text-xs"
          style={{
            backgroundColor: 'rgba(26, 24, 26, 0.92)',
            borderColor: '#BE9F4E',
          }}
        >
          {(
            [
              { id: 'combat', label: 'Боевая 42°' },
              { id: 'closeup', label: 'Существа' },
              { id: 'wide', label: 'Общий план' },
            ] as const
          ).map((item) => {
            const active = state.preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPreset(item.id)}
                className="px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? '#BE9F4E' : 'transparent',
                  color: active ? '#1A181A' : '#E7DFD3',
                }}
              >
                {item.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleToggleAudio}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            className="ml-1 border-l border-[#BE9F4E]/30 px-2 py-1 text-[#BE9F4E] hover:text-[#F4ECE0]"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* Bottom 22% Tarot Hand & Channel Control Dock */}
      <footer className="flex flex-col items-center gap-2.5 px-4 pb-4 sm:px-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">
          <div
            className="flex items-center gap-4 border px-4 py-1.5 font-num text-xs tabular-nums"
            style={{
              backgroundColor: 'rgba(26, 24, 26, 0.94)',
              borderColor: accentBorder,
            }}
          >
            <span>
              <span className="text-[#956842]">ВАШ HP </span>
              <strong className="text-[#F4ECE0]">{state.playerHp}</strong>
            </span>
            <span>
              <span className="text-[#956842]">ЭФИР </span>
              <strong style={{ color: etherTextColor }}>
                {state.playerEther}/{state.playerMaxEther}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleOverload}
            className="inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: state.overloadActive
                ? 'rgba(185, 56, 38, 0.32)'
                : 'rgba(26, 24, 26, 0.94)',
              borderColor: state.overloadActive ? '#B93826' : '#679793',
              color: state.overloadActive ? '#FFB2A6' : '#A9E2DD',
            }}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {state.overloadActive
                ? 'Перегрузка активна (+2 Эфира / -3 HP)'
                : 'Перегрузка Канала (Space)'}
            </span>
          </button>
        </div>

        {/* 4 Tarot Cards Fan */}
        <div className="pointer-events-auto flex items-end justify-center gap-2.5 sm:gap-3.5">
          {MOCK_HAND.map((card) => {
            const hovered = hoveredCardId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onMouseEnter={() => {
                  setHoveredCardId(card.id);
                  etherAudio.playCardHover();
                }}
                onMouseLeave={() => setHoveredCardId(null)}
                className="group relative flex h-[126px] w-36 flex-col justify-between border p-2.5 text-left transition-transform duration-150 sm:w-44"
                style={{
                  backgroundColor: 'rgba(26, 24, 26, 0.95)',
                  borderColor: hovered ? '#F4ECE0' : accentBorder,
                  transform: hovered ? 'translateY(-10px)' : 'translateY(0)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <SchoolIcon school={card.school} />
                      <span className="truncate whitespace-nowrap text-[10px] uppercase tracking-wider text-[#956842]">
                        {card.kind}
                      </span>
                    </div>
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center border font-num text-[11px] font-semibold tabular-nums"
                      style={{
                        borderColor: '#679793',
                        color: '#A9E2DD',
                        backgroundColor: 'rgba(103, 151, 147, 0.16)',
                      }}
                    >
                      {card.cost}
                    </span>
                  </div>

                  <div
                    className="mt-1.5 text-xs font-semibold leading-tight text-[#F4ECE0] sm:text-[13px]"
                    style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                  >
                    {card.name}
                  </div>

                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#C7B8A1]">
                    {card.rule}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[#BE9F4E]/25 pt-1 font-num text-[11px] font-semibold tabular-nums">
                  {card.atk !== undefined && card.hp !== undefined ? (
                    <>
                      <span className="text-[#BE9F4E]">{card.atk} АТК</span>
                      <span className="text-[#5B5B5B]">·</span>
                      <span className="text-[#679793]">{card.hp} HP</span>
                    </>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-[#956842]">
                      Таро Канала
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
