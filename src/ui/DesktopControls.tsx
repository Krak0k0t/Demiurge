import { useState, type ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';
import { etherAudio } from '../audio/etherAudio';
import type { TranslationPack } from '../i18n/translations';
import type { RadialArcanaAction } from './MobileControls';

export interface DesktopControlsProps {
  t: TranslationPack;
  vitalsCluster: ReactNode;
  endTurnBtn: ReactNode;
  tarotHand: ReactNode;
  radialActions: RadialArcanaAction[];
}

export function DesktopControls({
  t,
  vitalsCluster,
  endTurnBtn,
  tarotHand,
  radialActions,
}: DesktopControlsProps) {
  const [arcanaOpen, setArcanaOpen] = useState(false);
  const hasReadyBadge = radialActions.some((a) => a.active && !a.disabled);

  return (
    <div
      data-tactical-bar="true"
      data-hud-mode="desktop"
      className="pointer-events-none flex w-full items-end justify-between gap-3"
    >
      {/* Bottom-Left: Unified Circular Resource Belt + Compact Arcana Icon Trigger */}
      <div className="pointer-events-auto relative flex shrink-0 items-center gap-2">
        {arcanaOpen && (
          <div
            data-desktop-arcana-drawer="true"
            className="frosted-obsidian pointer-events-auto rounded-2xl p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.88)]"
            style={{
              position: 'absolute',
              left: 0,
              bottom: 'calc(100% + 10px)',
              width: '296px',
              zIndex: 45,
            }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-[#D6A856]/30 pb-1">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFE59F]">
                {t.arcanaWheelBtn}
              </span>
              <button
                type="button"
                aria-label="Close arcana"
                onClick={() => setArcanaOpen(false)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#C8B8A2] hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {radialActions.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  disabled={act.disabled}
                  title={act.title ?? act.label}
                  {...(act.dataAttr ?? {})}
                  onMouseEnter={() => {
                    if (!act.disabled) act.onHoverStart?.();
                  }}
                  onMouseLeave={() => act.onHoverEnd?.()}
                  onClick={() => {
                    etherAudio.playUiSelect();
                    act.onHoverEnd?.();
                    act.onClick();
                    setArcanaOpen(false);
                  }}
                  className={`font-body flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] font-semibold transition-all hover:brightness-110 disabled:opacity-40 ${
                    act.active
                      ? 'border-[#FFE29A] bg-[#3A2B16]/90 text-[#FFE8AE] shadow-[0_0_12px_rgba(226,179,84,0.3)]'
                      : 'border-[#7D663E]/60 bg-[#151523]/85 text-[#EFE3CF]'
                  }`}
                >
                  <span className="shrink-0">{act.icon}</span>
                  <span className="truncate">{act.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="resource-belt-pod flex items-center gap-1.5 px-2.5 py-1.5">
          {vitalsCluster}

          <div className="mx-0.5 h-6 w-[1px] bg-[#D6A856]/30" aria-hidden="true" />

          <button
            type="button"
            data-radial-toggle="true"
            aria-expanded={arcanaOpen}
            aria-label={t.arcanaWheelBtn}
            title={t.arcanaWheelBtn}
            onClick={() => {
              const next = !arcanaOpen;
              etherAudio.playUiDrawer(next);
              setArcanaOpen(next);
            }}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150 hover:scale-105 active:scale-95 ${
              arcanaOpen
                ? 'border-[#FFE29A] bg-[#362814]/90 text-[#FFE8AE] shadow-[0_0_14px_rgba(255,226,154,0.45)]'
                : hasReadyBadge
                  ? 'border-[#66DDD2] bg-[#13222A]/90 text-[#8BE3DA] shadow-[0_0_12px_rgba(102,221,210,0.35)]'
                  : 'border-[#C4984A]/55 bg-[#171828]/88 text-[#E5B85B]'
            }`}
          >
            {arcanaOpen ? (
              <X className="h-4 w-4 text-[#FFE29A]" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {!arcanaOpen && hasReadyBadge && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#FFE29A] shadow-[0_0_6px_rgba(255,226,154,0.95)]"
              />
            )}
          </button>
        </div>
      </div>

      {/* Bottom-Center: Floating Turn-Aware Tarot Hand */}
      <div className="flex min-w-0 flex-1 justify-center overflow-visible pb-1">
        {tarotHand}
      </div>

      {/* Bottom-Right: Dominant Physical 3D End Turn Seal */}
      <div className="pointer-events-auto flex shrink-0 items-end justify-end">
        {endTurnBtn}
      </div>
    </div>
  );
}
