import { Maximize2, Minimize2, Sparkles } from 'lucide-react';
import type { CrossroadsEventDef, CrossroadsEventId } from '../game/cathedralMeta';
import type { TranslationPack } from '../i18n/translations';
import { TournamentPathStrip } from './Modals';
import { StoneCorners, StoneDivider } from './StoneOrnament';

interface CrossroadsModalProps {
  t: TranslationPack;
  stageIndex: number;
  options: CrossroadsEventDef[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onChoose: (eventId: CrossroadsEventId) => void;
}

const ACCENT_BORDER: Record<string, string> = {
  kinet: '#5EC8BE',
  vital: '#D7A447',
  chaos: '#D94432',
  synth: '#7593AB',
};

export function CrossroadsModal({
  t,
  stageIndex,
  options,
  isFullscreen = false,
  onToggleFullscreen,
  onChoose,
}: CrossroadsModalProps) {
  return (
    <div
      data-crossroads-modal="true"
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/72 p-4"
    >
      <div className="stone-panel w-full max-w-2xl p-5 sm:p-6 text-center">
        <StoneCorners />
        {onToggleFullscreen && (
          <button
            type="button"
            data-fullscreen-btn="true"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            className="stone-btn absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center text-[#E2B354]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}

        <TournamentPathStrip stageIndex={stageIndex} t={t} />

        <div className="relative z-10 mt-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#7CDAD1] font-display">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {t.stage} {stageIndex + 1} / 7
            </span>
          </div>
          <h2 className="font-display mt-1 text-xl font-bold tracking-wider text-[#FBF2E1] sm:text-2xl">
            {t.crossroads.title}
          </h2>
          <p className="font-body mt-1 text-xs text-[#D6C9B5]">{t.crossroads.subtitle}</p>
        </div>

        <StoneDivider />

        <p className="font-body relative z-10 text-xs text-[#B9AD9A]">{t.crossroads.hint}</p>

        <div className="relative z-10 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((ev) => {
            const copy = t.crossroads.events[ev.id];
            const accent = ACCENT_BORDER[ev.schoolAccent] ?? '#D7A447';
            return (
              <button
                key={ev.id}
                type="button"
                data-crossroads-choice={ev.id}
                onClick={() => onChoose(ev.id)}
                className="tarot-card relative flex min-h-[168px] flex-col justify-between p-4 text-left transition-transform hover:-translate-y-1 hover:border-[#FFE4A1]"
              >
                <StoneCorners color={accent} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between border-b border-[#A67F38]/35 pb-2">
                    <span className="font-display text-sm font-bold text-[#FBF2E1]">{copy.title}</span>
                    <span
                      className="font-num flex h-7 w-7 items-center justify-center border text-sm font-bold"
                      style={{ borderColor: accent, color: accent, background: '#14111A' }}
                    >
                      {ev.icon}
                    </span>
                  </div>
                  <p className="font-body mt-2.5 text-xs font-semibold leading-relaxed text-[#9BF3EA]">
                    {copy.reward}
                  </p>
                  <p className="font-body mt-1 text-[11px] leading-snug text-[#E8A79C]">{copy.cost}</p>
                </div>

                <div className="relative z-10 mt-3 border-t border-[#A67F38]/30 pt-2">
                  <span className="gold-cta-btn font-display inline-flex w-full items-center justify-center py-1.5 text-[11px] font-bold uppercase tracking-wider">
                    {t.crossroads.pickBtn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
