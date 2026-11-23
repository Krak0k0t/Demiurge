import { useEffect, useState } from 'react';
import { Eye, EyeOff, Flame, Gauge, Globe, HelpCircle, Maximize2, Minimize2, Shield, Sliders, Sparkles, Swords, Volume2, VolumeX, Wind } from 'lucide-react';
import type { GraphicsQuality } from '../core/graphicsSettings';
import type { Difficulty } from '../game/cards';
import { LANGUAGES, type LanguageCode, type TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import { StoneCorners, StoneDivider } from './StoneOrnament';

interface TitleScreenProps {
  t: TranslationPack;
  lang: LanguageCode;
  difficulty: Difficulty;
  school: MagicSchool;
  graphics: GraphicsQuality;
  fastCombat: boolean;
  hoverInspector: boolean;
  muted: boolean;
  isFullscreen: boolean;
  canContinue: boolean;
  savedStageIndex?: number | null;
  archonRank?: number;
  bestStage?: number;
  onSelectLang: (lang: LanguageCode) => void;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectSchool: (s: MagicSchool) => void;
  onSelectGraphics: (g: GraphicsQuality) => void;
  onToggleFastCombat: () => void;
  onToggleHoverInspector: () => void;
  onStart: () => void;
  onContinue: () => void;
  onOpenHelp: () => void;
  onToggleAudio: () => void;
  onToggleFullscreen: () => void;
}

function TarotAstrolabeEmblem() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-11 w-11 sm:h-13 sm:w-13 drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hsGoldFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE8AE" />
          <stop offset="48%" stopColor="#D7A447" />
          <stop offset="100%" stopColor="#7C5422" />
        </linearGradient>
        <radialGradient id="hsStoneInner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2E2838" />
          <stop offset="100%" stopColor="#120F18" />
        </radialGradient>
        <linearGradient id="hsEtherGem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9DFDF3" />
          <stop offset="50%" stopColor="#4BB7AC" />
          <stop offset="100%" stopColor="#1B5550" />
        </linearGradient>
      </defs>
      <polygon
        points="60,5 115,60 60,115 5,60"
        fill="url(#hsStoneInner)"
        stroke="url(#hsGoldFrame)"
        strokeWidth="2.4"
      />
      <circle cx="60" cy="60" r="39" fill="none" stroke="url(#hsGoldFrame)" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="rgba(226, 179, 84, 0.35)" strokeWidth="1" strokeDasharray="3 3" />
      <polygon points="60,24 83,60 60,96 37,60" fill="rgba(16, 13, 22, 0.92)" stroke="url(#hsGoldFrame)" strokeWidth="1.5" />
      <polygon points="60,35 74,60 60,85 46,60" fill="url(#hsEtherGem)" />
      <circle cx="60" cy="14" r="2.6" fill="#FFE8AE" />
      <circle cx="60" cy="106" r="2.6" fill="#FFE8AE" />
      <circle cx="14" cy="60" r="2.6" fill="#FFE8AE" />
      <circle cx="106" cy="60" r="2.6" fill="#FFE8AE" />
    </svg>
  );
}

const SCHOOLS: Array<{ id: MagicSchool; color: string; border: string; Icon: typeof Wind }> = [
  { id: 'kinet', color: '#8BE3DA', border: '#5EC8BE', Icon: Wind },
  { id: 'vital', color: '#F0D284', border: '#D7A447', Icon: Sparkles },
  { id: 'chaos', color: '#FF9B8A', border: '#D94432', Icon: Flame },
  { id: 'synth', color: '#BCD3E6', border: '#7593AB', Icon: Shield },
];

export function TitleScreen({
  t,
  lang,
  difficulty,
  school,
  graphics,
  fastCombat,
  hoverInspector,
  muted,
  isFullscreen,
  canContinue,
  savedStageIndex = null,
  archonRank = 1,
  bestStage = 0,
  onSelectLang,
  onSelectDifficulty,
  onSelectSchool,
  onSelectGraphics,
  onToggleFastCombat,
  onToggleHoverInspector,
  onStart,
  onContinue,
  onOpenHelp,
  onToggleAudio,
  onToggleFullscreen,
}: TitleScreenProps) {
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 720
  );

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isShortLandscape = viewportH <= 540;

  const schoolNames: Record<MagicSchool, string> = {
    kinet: t.schoolKinet,
    vital: t.schoolVital,
    chaos: t.schoolChaos,
    synth: t.schoolSynth,
  };

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto ${
        isShortLandscape ? 'gap-1 p-2' : 'gap-2 p-3 sm:p-6'
      }`}
    >
      {/* Top Carved Stone Utility Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={`stone-panel pointer-events-auto flex items-center gap-1.5 ${
            isShortLandscape ? 'px-2 py-1' : 'gap-2 px-3 py-1.5'
          }`}
        >
          <Globe className="h-4 w-4 shrink-0 text-[#E2B354]" aria-hidden="true" />
          <label
            htmlFor="lang-select"
            className={`font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C8A66A] ${
              isShortLandscape ? 'hidden' : 'inline'
            }`}
          >
            {t.language}
          </label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => onSelectLang(e.target.value as LanguageCode)}
            className={`font-body cursor-pointer border border-[#7F6232] bg-[#131018] px-2 text-xs font-normal text-[#F4ECE0] outline-none ${
              isShortLandscape ? 'min-h-[30px] py-0.5' : 'min-h-[36px] py-1'
            }`}
          >
            {LANGUAGES.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-[#131018] text-[#F4ECE0]">
                {opt.nativeName}
              </option>
            ))}
          </select>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleHoverInspector}
            aria-label={t.hoverInspectorLabel}
            title={t.hoverInspectorLabel}
            className={`stone-btn font-body inline-flex items-center gap-2 text-xs text-[#E7DFD3] whitespace-nowrap shrink-0 ${
              isShortLandscape ? 'min-h-[34px] px-2.5 py-1' : 'min-h-[44px] px-3 py-2'
            }`}
            style={{
              borderColor: hoverInspector ? '#5EC8BE' : undefined,
              color: hoverInspector ? '#A8F3EC' : '#E7DFD3',
            }}
          >
            {hoverInspector ? (
              <Eye className="h-4 w-4 text-[#5EC8BE]" />
            ) : (
              <EyeOff className="h-4 w-4 text-[#8D8170]" />
            )}
            <span className={isShortLandscape ? 'hidden' : 'hidden lg:inline'}>
              {t.hoverInspectorLabel}: {hoverInspector ? t.hoverInspectorOn : t.hoverInspectorOff}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleFastCombat}
            aria-label={t.fastCombatLabel}
            title={t.fastCombatLabel}
            className={`stone-btn font-body inline-flex items-center gap-2 text-xs text-[#E7DFD3] whitespace-nowrap shrink-0 ${
              isShortLandscape ? 'min-h-[34px] px-2.5 py-1' : 'min-h-[44px] px-3 py-2'
            }`}
            style={{
              borderColor: fastCombat ? '#5EC8BE' : undefined,
              color: fastCombat ? '#A8F3EC' : '#E7DFD3',
            }}
          >
            <Gauge className={`h-4 w-4 ${fastCombat ? 'text-[#5EC8BE]' : 'text-[#E2B354]'}`} />
            <span className={isShortLandscape ? 'hidden' : 'hidden sm:inline'}>
              {t.fastCombatLabel}: {fastCombat ? t.fastCombatOn : t.fastCombatOff}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-label={muted ? t.soundOff : t.soundOn}
            title={muted ? t.soundOff : t.soundOn}
            className={`stone-btn font-body inline-flex items-center gap-2 text-xs text-[#E7DFD3] whitespace-nowrap shrink-0 ${
              isShortLandscape ? 'min-h-[34px] px-2.5 py-1' : 'min-h-[44px] px-3.5 py-2'
            }`}
          >
            {muted ? <VolumeX className="h-4 w-4 text-[#E87A68]" /> : <Volume2 className="h-4 w-4 text-[#5EC8BE]" />}
            <span className={isShortLandscape ? 'hidden' : 'hidden sm:inline'}>
              {muted ? t.soundOff : t.soundOn}
            </span>
          </button>

          <button
            type="button"
            data-help-btn="true"
            onClick={onOpenHelp}
            aria-label={t.helpBtn}
            title={t.helpBtn}
            className={`stone-btn font-body inline-flex items-center gap-1.5 text-xs text-[#FFE8AE] whitespace-nowrap shrink-0 ${
              isShortLandscape ? 'min-h-[34px] px-2.5 py-1' : 'min-h-[44px] px-3.5 py-2'
            }`}
          >
            <HelpCircle className="h-4 w-4 text-[#E2B354]" />
            <span className="hidden sm:inline">{t.helpBtn}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            className={`stone-btn font-body inline-flex items-center gap-2 text-xs text-[#E7DFD3] whitespace-nowrap shrink-0 ${
              isShortLandscape ? 'min-h-[34px] px-2.5 py-1' : 'min-h-[44px] px-3.5 py-2'
            }`}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-[#E2B354]" /> : <Maximize2 className="h-4 w-4 text-[#E2B354]" />}
            <span className={isShortLandscape ? 'hidden' : 'hidden sm:inline'}>
              {isFullscreen ? t.exitFullscreen : t.fullscreen}
            </span>
          </button>
        </div>
      </header>

      {/* Center Hearthstone / Slay-the-Spire Carved Sanctuary Tablet */}
      <main
        className={`mx-auto flex w-full flex-col items-center text-center ${
          isShortLandscape ? 'max-w-2xl my-auto' : 'max-w-xl'
        }`}
      >
        {!isShortLandscape && <TarotAstrolabeEmblem />}

        {!isShortLandscape && (
          <div
            className="font-display mt-1 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[#7CDAD1]"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
          >
            {t.subtitle}
          </div>
        )}

        <h1
          className={`font-display font-bold tracking-[0.07em] text-[#FBF2E1] ${
            isShortLandscape ? 'text-lg' : 'mt-0.5 text-2xl sm:text-3xl'
          }`}
          style={{
            textShadow: '0 4px 18px rgba(0, 0, 0, 0.95), 0 1px 0 #4B3314',
          }}
        >
          {t.gameTitle}
        </h1>

        <section
          className={`stone-panel pointer-events-auto w-full ${
            isShortLandscape ? 'mt-1.5 p-2.5' : 'mt-2.5 p-3.5 sm:p-4'
          }`}
        >
          <StoneCorners />

          {/* Difficulty Selector */}
          <div className="relative z-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[#E2B354]">
              {t.difficulty}
            </h2>
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
              {(
                [
                  { id: 'apprentice', label: t.diffApprentice },
                  { id: 'archmage', label: t.diffArchmage },
                  { id: 'cataclysm', label: t.diffCataclysm },
                ] as const
              ).map((item) => {
                const active = difficulty === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectDifficulty(item.id)}
                    className={`font-body px-3 transition-all whitespace-nowrap ${
                      isShortLandscape ? 'min-h-[30px] py-1 text-[11px]' : 'min-h-[44px] py-1.5 text-xs'
                    } ${active ? 'gold-cta-btn font-bold' : 'stone-btn font-normal text-[#DFD3C1]'}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={isShortLandscape ? 'my-1.5 h-[1px] bg-[#A67F38]/30' : ''}>
            {!isShortLandscape && <StoneDivider />}
          </div>

          {/* School / Order Selector */}
          <div className="relative z-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-[#7CDAD1]">
              {t.schoolLabel}
            </h2>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {SCHOOLS.map(({ id, color, border, Icon }) => {
                const active = school === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectSchool(id)}
                    className={`stone-btn font-body inline-flex items-center justify-center gap-1.5 px-2.5 whitespace-nowrap ${
                      isShortLandscape ? 'min-h-[30px] py-1 text-[11px]' : 'min-h-[44px] px-3 py-1.5 text-xs'
                    }`}
                    style={{
                      borderColor: active ? border : '#5C4A2E',
                      color: active ? color : '#B9AD9A',
                      background: active
                        ? 'linear-gradient(180deg, #322C3C 0%, #1F1B27 100%)'
                        : undefined,
                      boxShadow: active
                        ? `inset 0 1px 0 ${border}55, inset 0 -2px 4px rgba(0,0,0,0.8), 0 0 12px ${border}33`
                        : undefined,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: active ? color : '#8D8170' }} />
                    <span className={active ? 'font-bold' : 'font-normal'}>{schoolNames[id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!isShortLandscape && (
            <div className="relative z-10 mt-2 border border-[#5EC8BE]/35 bg-[#121920]/85 px-3 py-1.5 text-left text-[11px]">
              <span className="font-display font-bold uppercase tracking-wider text-[#7BE6DB]">
                {t.orderDoctrines[school].name}
              </span>
              <span className="mx-1.5 text-[#7A6A55]">·</span>
              <span className="font-body text-[#DCD2C2]">{t.orderDoctrines[school].desc}</span>
            </div>
          )}

          <div className={isShortLandscape ? 'my-1.5 h-[1px] bg-[#A67F38]/30' : ''}>
            {!isShortLandscape && <StoneDivider />}
          </div>

          {/* Graphics Quality Selector */}
          <div className="relative z-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display inline-flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#E2B354] sm:justify-start">
              <Sliders className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t.graphicsLabel}</span>
            </h2>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(
                [
                  { id: 'ultra', label: t.gfxUltra },
                  { id: 'high', label: t.gfxHigh },
                  { id: 'medium', label: t.gfxMedium },
                  { id: 'low', label: t.gfxLow },
                ] as const
              ).map((item) => {
                const active = graphics === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-graphics-option={item.id}
                    onClick={() => onSelectGraphics(item.id)}
                    className={`font-body px-2.5 text-[11px] whitespace-nowrap ${
                      isShortLandscape ? 'min-h-[30px] py-0.5' : 'min-h-[40px] py-1'
                    } ${active ? 'gold-cta-btn font-bold' : 'stone-btn font-normal text-[#DFD3C1]'}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Play CTA */}
          <div
            className={`relative z-10 flex flex-wrap items-center justify-center gap-2.5 ${
              isShortLandscape ? 'mt-2' : 'mt-3.5 gap-3'
            }`}
          >
            {canContinue && (
              <button
                type="button"
                onClick={onContinue}
                className={`stone-btn font-display inline-flex items-center justify-center gap-2 border-[#5EC8BE] px-4 text-xs font-bold uppercase tracking-[0.14em] text-[#A8F3EC] whitespace-nowrap ${
                  isShortLandscape ? 'min-h-[36px] py-1.5' : 'min-h-[44px] px-5 py-2.5'
                }`}
              >
                <span>{t.continueCampaign}</span>
                {savedStageIndex !== null && (
                  <span className="font-num text-[10.5px] font-bold text-[#FFE29A]">
                    · {t.stage} {savedStageIndex + 1}/7 · {t.archonRankLabel} {archonRank}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className={`gold-cta-btn font-display inline-flex min-w-[200px] items-center justify-center gap-2.5 px-6 font-extrabold uppercase tracking-[0.16em] whitespace-nowrap ${
                isShortLandscape ? 'min-h-[36px] py-1.5 text-xs' : 'min-h-[46px] min-w-[220px] px-7 py-2.5 text-sm'
              }`}
            >
              <Swords className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.startDuel}</span>
            </button>
          </div>
          {!isShortLandscape && bestStage > 0 && (
            <div className="font-num relative z-10 mt-2 text-[10.5px] text-[#C8B8A2]">
              {t.careerBestStage}: {bestStage}/7
            </div>
          )}
        </section>
      </main>

      {/* Bottom Controls Hint (Quiet Clean Typography) */}
      {!isShortLandscape ? (
        <footer className="text-center">
          <p
            className="font-body mx-auto inline-block px-4 py-1 text-[11px] tracking-wide text-[#DFD3C1]"
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)' }}
          >
            {t.controlsHint}
          </p>
        </footer>
      ) : (
        <div aria-hidden="true" />
      )}
    </div>
  );
}
