import { useMemo, useState, type ReactNode } from 'react';
import { Circle, Sparkles, Triangle, UserCheck, X } from 'lucide-react';
import { etherAudio } from '../audio/etherAudio';
import type { TranslationPack } from '../i18n/translations';
import { computeRadialSlotOffsets } from './adaptiveUi';
import { ARCANE_PATTERNS, type ArcanePatternId } from './hudLogic';

export interface RadialArcanaAction {
  id: string;
  label: string;
  title?: string;
  icon: ReactNode;
  disabled?: boolean;
  active?: boolean;
  dataAttr?: Record<string, string>;
  onClick: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export interface MobileControlsProps {
  t: TranslationPack;
  isShortLandscape: boolean;
  vitalsCluster: ReactNode;
  endTurnBtn: ReactNode;
  tarotHand: ReactNode;
  radialActions: RadialArcanaAction[];
  selectedPattern?: ArcanePatternId;
  onSelectPattern?: (pattern: ArcanePatternId) => void;
}

function MobilePatternIcon({ id }: { id: ArcanePatternId }) {
  if (id === 'triangle') return <Triangle className="h-3.5 w-3.5 text-[#62F2E4]" aria-hidden="true" />;
  if (id === 'star') return <Sparkles className="h-3.5 w-3.5 text-[#F4CC68]" aria-hidden="true" />;
  if (id === 'circle') return <Circle className="h-3.5 w-3.5 text-[#79EA74]" aria-hidden="true" />;
  return <UserCheck className="h-3.5 w-3.5 text-[#C59BFF]" aria-hidden="true" />;
}

export function MobileControls({
  t,
  isShortLandscape,
  vitalsCluster,
  endTurnBtn,
  tarotHand,
  radialActions,
  selectedPattern = 'triangle',
  onSelectPattern,
}: MobileControlsProps) {
  const [radialOpen, setRadialOpen] = useState(false);
  const [patternSheetOpen, setPatternSheetOpen] = useState(false);

  const visibleActions = useMemo(() => radialActions.slice(0, 7), [radialActions]);

  // Compute staggered two-tier arc above the command bar center so buttons never overlap on 390px phones
  const radialOffsets = useMemo(() => {
    const outerR = isShortLandscape ? 116 : 150;
    const innerR = isShortLandscape ? 82 : 110;
    const base = computeRadialSlotOffsets(visibleActions.length, outerR, 190, 350);
    return base.map((slot, idx) => {
      const r = idx % 2 === 1 || idx === Math.floor(base.length / 2) ? outerR : innerR;
      const rad = (slot.angleDeg * Math.PI) / 180;
      return {
        x: Math.round(Math.cos(rad) * r),
        y: Math.round(Math.sin(rad) * r) - (isShortLandscape ? 8 : 16),
        angleDeg: slot.angleDeg,
      };
    });
  }, [visibleActions.length, isShortLandscape]);

  const hasReadyBadge = visibleActions.some((a) => a.active && !a.disabled);

  return (
    <div
      data-hud-mode="mobile"
      className="pointer-events-none flex w-full flex-col items-center gap-1"
    >
      {/* Floating Mobile Tarot Hand positioned cleanly above the bottom controls bar */}
      <div className="flex w-full justify-center">{tarotHand}</div>

      {/* Bottom Command Strip: Unified Left Resource Belt (HP/Ether/Deck/Arcana/Sigil) + Dominant End Turn */}
      <div
        data-tactical-bar="true"
        className="pointer-events-auto relative flex w-full items-center justify-between gap-1.5 px-0.5"
      >
        {/* Mobile Arcane Pattern Bottom Sheet anchored cleanly above tactical bar */}
        {patternSheetOpen && onSelectPattern && (
          <div
            data-mobile-pattern-sheet="true"
            className="frosted-obsidian pointer-events-auto mx-auto w-full max-w-md rounded-2xl p-3 shadow-[0_18px_40px_rgba(0,0,0,0.92)]"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', zIndex: 50 }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-[#A67F38]/35 pb-1.5">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#FFE8AE]">
                {t.patternBarLabel}
              </span>
              <button
                type="button"
                aria-label="Close patterns"
                onClick={() => setPatternSheetOpen(false)}
                className="stone-btn inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#C8B8A2]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ARCANE_PATTERNS.map((patternId) => {
                const active = selectedPattern === patternId;
                const info = t.patterns[patternId];
                return (
                  <button
                    key={patternId}
                    type="button"
                    data-mobile-pattern-option={patternId}
                    onClick={() => {
                      etherAudio.playUiSelect();
                      onSelectPattern(patternId);
                      setPatternSheetOpen(false);
                    }}
                    className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-transform active:scale-95 ${
                      active
                        ? 'border-[#FFE29A] bg-[#2D2214]/90 text-[#FFE8AE]'
                        : 'border-[#7D663E]/60 bg-[#14111C]/85 text-[#EFE3CF]'
                    }`}
                  >
                    <MobilePatternIcon id={patternId} />
                    <div className="min-w-0">
                      <div className="font-display truncate text-[10.5px] font-bold uppercase tracking-wider">
                        {info.name}
                      </div>
                      <div className="font-body truncate text-[9.5px] text-[#C8B8A2]">{info.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Radial Fan anchored to horizontal center of tactical bar */}
        <div aria-hidden={!radialOpen} className="pointer-events-none absolute left-1/2 top-0 z-40 h-0 w-0">
          {visibleActions.map((act, idx) => {
            const offset = radialOffsets[idx] ?? { x: 0, y: -110, angleDeg: 270 };
            const tx = radialOpen ? offset.x : 0;
            const ty = radialOpen ? offset.y : 0;
            return (
              <button
                key={act.id}
                type="button"
                disabled={!radialOpen || act.disabled}
                title={act.title ?? act.label}
                {...(act.dataAttr ?? {})}
                onClick={() => {
                  etherAudio.playUiSelect();
                  act.onClick();
                  setRadialOpen(false);
                }}
                className={`stone-btn font-body absolute left-0 top-0 inline-flex min-h-[32px] max-w-[92px] items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-[0_10px_22px_rgba(0,0,0,0.92)] transition-all duration-200 ease-out whitespace-nowrap ${
                  radialOpen
                    ? act.disabled
                      ? 'pointer-events-auto opacity-45'
                      : 'pointer-events-auto opacity-100'
                    : 'pointer-events-none invisible opacity-0'
                }`}
                style={{
                  transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${
                    radialOpen ? 1 : 0.45
                  })`,
                  borderColor: act.active ? '#FFE29A' : '#7D663E',
                  color: act.active ? '#FFE8AE' : '#EFE3CF',
                  background: act.active
                    ? 'linear-gradient(180deg, #433219 0%, #241B0E 100%)'
                    : 'linear-gradient(180deg, #241F2C 0%, #15121B 100%)',
                }}
              >
                <span className="shrink-0">{act.icon}</span>
                <span className="truncate">{act.label}</span>
              </button>
            );
          })}
        </div>

        {/* Unified Mobile Resource Belt + Compact Arcana & Sigil Icons */}
        <div className="resource-belt-pod flex min-w-0 shrink items-center gap-1 px-1.5 py-1">
          {vitalsCluster}

          <button
            type="button"
            data-radial-toggle="true"
            aria-expanded={radialOpen}
            aria-label={t.arcanaWheelBtn}
            title={t.arcanaWheelBtn}
            onClick={() => {
              const next = !radialOpen;
              setPatternSheetOpen(false);
              etherAudio.playUiDrawer(next);
              setRadialOpen(next);
            }}
            className={`relative inline-flex shrink-0 items-center justify-center rounded-full border transition-transform duration-150 active:scale-95 ${
              isShortLandscape ? 'h-7 w-7' : 'h-8 w-8'
            } ${
              radialOpen
                ? 'border-[#FFE29A] bg-[#362814]/90 text-[#FFE8AE]'
                : hasReadyBadge
                  ? 'border-[#66DDD2] bg-[#13222A]/90 text-[#8BE3DA]'
                  : 'border-[#C4984A]/55 bg-[#171828]/88 text-[#E5B85B]'
            }`}
          >
            {radialOpen ? (
              <X className="h-3.5 w-3.5 text-[#FFE29A]" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {onSelectPattern && (
            <button
              type="button"
              data-mobile-pattern-toggle="true"
              aria-expanded={patternSheetOpen}
              aria-label={t.patternBarLabel}
              title={t.patternBarLabel}
              onClick={() => {
                setRadialOpen(false);
                const next = !patternSheetOpen;
                etherAudio.playUiDrawer(next);
                setPatternSheetOpen(next);
              }}
              className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[#5EC8BE]/55 bg-[#141A28]/90 transition-transform duration-150 active:scale-95 ${
                isShortLandscape ? 'h-7 w-7' : 'h-8 w-8'
              }`}
              style={{
                borderColor: patternSheetOpen ? '#FFE29A' : 'rgba(94, 200, 190, 0.55)',
              }}
            >
              <MobilePatternIcon id={selectedPattern} />
            </button>
          )}
        </div>

        <div className="shrink-0">{endTurnBtn}</div>
      </div>
    </div>
  );
}
