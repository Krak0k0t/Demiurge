import { useEffect, useState, type CSSProperties } from 'react';
import {
  BookOpen,
  Calendar,
  Contrast,
  Disc3,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Globe,
  HelpCircle,
  Maximize2,
  Minimize2,
  Shield,
  Sliders,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { etherAudio } from '../audio/etherAudio';
import type { GraphicsQuality } from '../core/graphicsSettings';
import type { Difficulty } from '../game/cards';
import type { CodexSaveData, DailyTrialConfig } from '../game/cathedralMeta';
import { LANGUAGES, type LanguageCode, type TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import { useHudSettings } from './HudSettingsContext';
import { MusicCarousel } from './MusicCarousel';
import { StoneCorners } from './StoneOrnament';

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
  isMobile?: boolean;
  canContinue: boolean;
  savedStageIndex?: number | null;
  archonRank?: number;
  bestStage?: number;
  dailyTrial: DailyTrialConfig;
  codex: CodexSaveData;
  onSelectLang: (lang: LanguageCode) => void;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectSchool: (s: MagicSchool) => void;
  onSelectGraphics: (g: GraphicsQuality) => void;
  onToggleFastCombat: () => void;
  onToggleHoverInspector: () => void;
  onStart: () => void;
  onStartDailyTrial: () => void;
  onContinue: () => void;
  onOpenCodex: () => void;
  onOpenHelp: () => void;
  onToggleAudio: () => void;
  onToggleFullscreen: () => void;
}

function TarotAstrolabeEmblem({ compact }: { compact: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${
        compact ? 'h-7 w-7' : 'h-10 w-10 sm:h-12 sm:w-12'
      } drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)]`}
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
      <circle
        cx="60"
        cy="60"
        r="31"
        fill="none"
        stroke="rgba(226, 179, 84, 0.35)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <polygon
        points="60,24 83,60 60,96 37,60"
        fill="rgba(16, 13, 22, 0.92)"
        stroke="url(#hsGoldFrame)"
        strokeWidth="1.5"
      />
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

const AMBIENT_DUST: Array<{ left: string; top: string; size: string; dur: string; delay: string; color: string }> = [
  { left: '14%', top: '76%', size: '3px', dur: '7.2s', delay: '0s', color: '#FFE29A' },
  { left: '26%', top: '64%', size: '2px', dur: '8.4s', delay: '1.3s', color: '#7BE6DB' },
  { left: '38%', top: '82%', size: '3px', dur: '6.8s', delay: '2.1s', color: '#FFE29A' },
  { left: '62%', top: '78%', size: '2.5px', dur: '7.8s', delay: '0.7s', color: '#7BE6DB' },
  { left: '74%', top: '68%', size: '3px', dur: '8.9s', delay: '1.9s', color: '#FFE29A' },
  { left: '84%', top: '80%', size: '2px', dur: '6.5s', delay: '2.8s', color: '#7BE6DB' },
  { left: '49%', top: '86%', size: '2.5px', dur: '7.5s', delay: '0.4s', color: '#FFE8AE' },
  { left: '20%', top: '34%', size: '2px', dur: '9.1s', delay: '1.1s', color: '#FFE29A' },
  { left: '80%', top: '32%', size: '2px', dur: '8.3s', delay: '2.4s', color: '#7BE6DB' },
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
  isMobile = false,
  canContinue,
  savedStageIndex = null,
  archonRank = 1,
  bestStage = 0,
  dailyTrial,
  codex,
  onSelectLang,
  onSelectDifficulty,
  onSelectSchool,
  onSelectGraphics,
  onToggleFastCombat,
  onToggleHoverInspector,
  onStart,
  onStartDailyTrial,
  onContinue,
  onOpenCodex,
  onOpenHelp,
  onToggleAudio,
  onToggleFullscreen,
}: TitleScreenProps) {
  const { uiScale, setUiScale, isHighContrast, toggleHighContrast } = useHudSettings();
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [openDrawer, setOpenDrawer] = useState<'audio' | 'setup' | null>(null);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isShortLandscape = viewport.h <= 540;
  const isPortraitMobile = viewport.w < 768 && !isShortLandscape;
  const isCompact = isMobile || viewport.w < 1024 || isShortLandscape;

  const schoolNames: Record<MagicSchool, string> = {
    kinet: t.schoolKinet,
    vital: t.schoolVital,
    chaos: t.schoolChaos,
    synth: t.schoolSynth,
  };

  const difficulties = [
    { id: 'apprentice' as const, label: t.diffApprentice, tier: 'I' },
    { id: 'archmage' as const, label: t.diffArchmage, tier: 'II' },
    { id: 'cataclysm' as const, label: t.diffCataclysm, tier: 'III' },
  ];

  const toggleDrawer = (target: 'audio' | 'setup') => {
    const next = openDrawer === target ? null : target;
    etherAudio.playUiDrawer(next !== null);
    setOpenDrawer(next);
  };

  return (
    <div
      data-title-screen="true"
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between overflow-y-auto ${
        isShortLandscape ? 'gap-1 p-2' : 'gap-2 p-2.5 sm:p-4 lg:p-5'
      }`}
    >
      {/* Subtle Ambient Arcane Dust Particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {AMBIENT_DUST.map((mote, idx) => (
          <span
            key={idx}
            className="arcane-dust-mote absolute rounded-full blur-[0.4px]"
            style={
              {
                left: mote.left,
                top: mote.top,
                width: mote.size,
                height: mote.size,
                backgroundColor: mote.color,
                boxShadow: `0 0 8px ${mote.color}`,
                '--dust-dur': mote.dur,
                '--dust-delay': mote.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Top Perimeter: Compact Frosted Language (Top-Left) & Magical Rune Icons (Top-Right) */}
      <header className="relative z-30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`frosted-obsidian pointer-events-auto flex items-center gap-1.5 rounded-xl ${
              isShortLandscape ? 'px-2 py-0.5' : 'px-2.5 py-1'
            }`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 text-[#E2B354]" aria-hidden="true" />
            <label htmlFor="lang-select" className="sr-only">
              {t.language}
            </label>
            <select
              id="lang-select"
              value={lang}
              onChange={(e) => onSelectLang(e.target.value as LanguageCode)}
              className={`font-body cursor-pointer rounded-md border border-[#A67F38]/40 bg-[#0D0B14]/75 px-2 text-xs text-[#F4ECE0] outline-none transition-colors hover:border-[#E2B354] ${
                isShortLandscape ? 'min-h-[26px] py-0' : 'min-h-[30px] py-0.5'
              }`}
            >
              {LANGUAGES.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-[#131018] text-[#F4ECE0]">
                  {opt.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div className="frosted-obsidian pointer-events-auto flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              data-title-audio-toggle="true"
              aria-expanded={openDrawer === 'audio'}
              aria-label={t.titleAudioBtn}
              title={t.titleAudioBtn}
              onClick={() => toggleDrawer('audio')}
              className={`font-body inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs whitespace-nowrap transition-transform hover:scale-105 active:scale-95 ${
                openDrawer === 'audio'
                  ? 'bg-[#E2B354]/22 text-[#FFE8AE] shadow-[0_0_12px_rgba(226,179,84,0.3)]'
                  : muted
                    ? 'text-[#E89B8D] hover:bg-white/5'
                    : 'text-[#8BE3DA] hover:bg-white/5'
              } ${isShortLandscape ? 'min-h-[30px]' : 'min-h-[34px]'}`}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Disc3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {!isShortLandscape && <span className="hidden md:inline">{t.titleAudioBtn}</span>}
            </button>

            <button
              type="button"
              data-title-setup-toggle="true"
              aria-expanded={openDrawer === 'setup'}
              aria-label={t.titleSetupBtn}
              title={t.titleSetupBtn}
              onClick={() => toggleDrawer('setup')}
              className={`font-body inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs whitespace-nowrap transition-transform hover:scale-105 active:scale-95 ${
                openDrawer === 'setup'
                  ? 'bg-[#E2B354]/22 text-[#FFE8AE] shadow-[0_0_12px_rgba(226,179,84,0.3)]'
                  : 'text-[#E7DFD3] hover:bg-white/5'
              } ${isShortLandscape ? 'min-h-[30px]' : 'min-h-[34px]'}`}
            >
              <Sliders className="h-4 w-4 shrink-0 text-[#E2B354]" aria-hidden="true" />
              {!isShortLandscape && <span className="hidden md:inline">{t.titleSetupBtn}</span>}
            </button>

            <button
              type="button"
              data-codex-btn="true"
              onClick={onOpenCodex}
              aria-label={t.codexBtn}
              title={t.codexBtn}
              className={`font-body inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs text-[#FFE8AE] whitespace-nowrap transition-transform hover:scale-105 hover:bg-white/5 active:scale-95 ${
                isShortLandscape ? 'min-h-[30px]' : 'min-h-[34px]'
              }`}
            >
              <BookOpen className="h-4 w-4 shrink-0 text-[#7BE6DB]" aria-hidden="true" />
              {!isShortLandscape && <span className="hidden lg:inline">{t.codexBtn}</span>}
            </button>

            <button
              type="button"
              data-help-btn="true"
              onClick={onOpenHelp}
              aria-label={t.helpBtn}
              title={t.helpBtn}
              className={`font-body inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs text-[#FFE8AE] whitespace-nowrap transition-transform hover:scale-105 hover:bg-white/5 active:scale-95 ${
                isShortLandscape ? 'min-h-[30px]' : 'min-h-[34px]'
              }`}
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-[#E2B354]" aria-hidden="true" />
              {!isShortLandscape && <span className="hidden lg:inline">{t.helpBtn}</span>}
            </button>

            <button
              type="button"
              data-fullscreen-btn="true"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
              title={isFullscreen ? t.exitFullscreen : t.fullscreen}
              className={`inline-flex items-center justify-center rounded-lg px-2 text-[#E2B354] transition-transform hover:scale-110 hover:bg-white/5 active:scale-95 ${
                isShortLandscape ? 'min-h-[30px]' : 'min-h-[34px]'
              }`}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Audio Drawer */}
        {openDrawer === 'audio' && (
          <div
            data-title-audio-drawer="true"
            className="frosted-obsidian pointer-events-auto ml-auto w-full max-w-md rounded-xl p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#A67F38]/30 pb-1.5">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFE8AE]">
                {t.musicCarouselTitle}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className="stone-btn font-body inline-flex min-h-[28px] items-center gap-1 rounded px-2 py-0.5 text-[11px] text-[#E7DFD3]"
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5 text-[#E87A68]" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-[#5EC8BE]" aria-hidden="true" />
                  )}
                  <span>{muted ? t.soundOff : t.soundOn}</span>
                </button>
                <button
                  type="button"
                  aria-label="Close audio drawer"
                  onClick={() => toggleDrawer('audio')}
                  className="stone-btn inline-flex h-7 w-7 items-center justify-center rounded text-[#C8B8A2] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <MusicCarousel t={t} variant="compact" short={isShortLandscape} />
          </div>
        )}

        {/* Collapsible Sanctuary Setup Drawer */}
        {openDrawer === 'setup' && (
          <div
            data-title-setup-drawer="true"
            className="frosted-obsidian pointer-events-auto ml-auto max-h-[68vh] w-full max-w-md overflow-y-auto rounded-xl p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#A67F38]/30 pb-1.5">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFE8AE]">
                {t.sanctuaryDrawerTitle}
              </span>
              <button
                type="button"
                aria-label="Close setup drawer"
                onClick={() => toggleDrawer('setup')}
                className="stone-btn inline-flex h-7 w-7 items-center justify-center rounded text-[#C8B8A2] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-left">
              <div>
                <div className="font-display mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8A66A]">
                  {t.graphicsLabel}
                </div>
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
                        className={`font-body min-h-[34px] rounded px-2 py-1 text-[11px] whitespace-nowrap ${
                          active ? 'gold-cta-btn font-bold' : 'stone-btn text-[#DFD3C1]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onToggleFastCombat}
                  className="stone-btn font-body inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[11px]"
                  style={{
                    borderColor: fastCombat ? '#5EC8BE' : undefined,
                    color: fastCombat ? '#A8F3EC' : '#E7DFD3',
                  }}
                >
                  <Gauge className={`h-3.5 w-3.5 ${fastCombat ? 'text-[#5EC8BE]' : 'text-[#E2B354]'}`} />
                  <span>
                    {t.fastCombatLabel}: {fastCombat ? t.fastCombatOn : t.fastCombatOff}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onToggleHoverInspector}
                  className="stone-btn font-body inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[11px]"
                  style={{
                    borderColor: hoverInspector ? '#5EC8BE' : undefined,
                    color: hoverInspector ? '#A8F3EC' : '#E7DFD3',
                  }}
                >
                  {hoverInspector ? (
                    <Eye className="h-3.5 w-3.5 text-[#5EC8BE]" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-[#8D8170]" />
                  )}
                  <span>
                    {t.hoverInspectorLabel}: {hoverInspector ? t.hoverInspectorOn : t.hoverInspectorOff}
                  </span>
                </button>
              </div>

              {/* UI Scale & High Contrast */}
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-[#A67F38]/30 bg-black/35 p-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[11px] text-[#E7DFD3]">
                  <span className="font-display flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#C8A66A]">
                    <span>{t.uiScaleLabel}</span>
                    <span className="font-num text-[#FFE29A]">{uiScale.toFixed(2)}×</span>
                  </span>
                  <input
                    type="range"
                    min={0.8}
                    max={1.5}
                    step={0.05}
                    value={uiScale}
                    onChange={(e) => setUiScale(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-[#E2B354]"
                  />
                </label>
                <button
                  type="button"
                  onClick={toggleHighContrast}
                  className="stone-btn font-body inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded px-2.5 py-1 text-[11px]"
                  style={{
                    borderColor: isHighContrast ? '#FFE29A' : undefined,
                    color: isHighContrast ? '#FFE8AE' : '#E7DFD3',
                  }}
                >
                  <Contrast className="h-3.5 w-3.5 text-[#E2B354]" aria-hidden="true" />
                  <span>
                    {t.highContrastLabel}: {isHighContrast ? t.highContrastOn : t.highContrastOff}
                  </span>
                </button>
              </div>

              <div className="rounded-lg border border-[#5EC8BE]/35 bg-[#10181F]/80 px-2.5 py-2 text-xs">
                <span className="font-display font-bold uppercase tracking-wider text-[#7BE6DB]">
                  {t.orderDoctrines[school].name}
                </span>
                <span className="mx-1.5 text-[#7A6A55]">·</span>
                <span className="font-body leading-snug text-[#EAE2D6]">
                  {t.orderDoctrines[school].desc}
                </span>
              </div>

              <div className="rounded-lg border border-[#5EC8BE]/35 bg-[#10191E]/80 px-2.5 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />
                  <span className="font-display text-[10.5px] font-bold uppercase tracking-wider text-[#7BE6DB]">
                    {t.dailyTrial.title}
                  </span>
                  <span className="font-num text-[10.5px] text-[#C6B9A6]">
                    {dailyTrial.dateKey} · {t.dailyTrial.modifiers[dailyTrial.modifier].name}
                  </span>
                </div>
                <p className="font-body mt-0.5 text-[11px] leading-snug text-[#DFECE9]">
                  {t.dailyTrial.modifiers[dailyTrial.modifier].desc}
                  {codex.bestTrialStage > 0
                    ? ` · ${t.dailyTrial.bestRecord}: ${codex.bestTrialStage}/7`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Center Observatory Triad: Luminous Header + Left Factions + Center Portal Medallion + Right Difficulty Steps */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-between py-1 sm:justify-center sm:gap-5">
        {/* Elevated Luminous Serif Title */}
        <section className="pointer-events-none flex flex-col items-center px-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <TarotAstrolabeEmblem compact={isShortLandscape} />
            <div className={isPortraitMobile ? 'text-center' : 'text-left'}>
              {!isShortLandscape && (
                <div
                  className="font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8CEEE4] sm:text-xs"
                  style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.98)' }}
                >
                  {t.subtitle}
                </div>
              )}
              <h1
                className={`font-title-serif font-black tracking-[0.06em] text-[#FFF4DC] ${
                  isShortLandscape
                    ? 'text-[26px] leading-none sm:text-[32px]'
                    : isPortraitMobile
                      ? 'text-[30px] leading-[1.06]'
                      : 'text-4xl leading-[1.05] sm:text-5xl lg:text-[58px] xl:text-[64px]'
                }`}
                style={{
                  textShadow:
                    '0 4px 24px rgba(0, 0, 0, 0.96), 0 0 32px rgba(226, 179, 84, 0.44), 0 2px 0 #5C3D12',
                }}
              >
                {t.gameTitle}
              </h1>
            </div>
          </div>
        </section>

        {/* Observatory Triad — leaves the 3D Cathedral Rose Sanctuary & Archons breathing behind & between */}
        <section
          className={`flex w-full max-w-5xl items-center justify-center ${
            isPortraitMobile
              ? 'flex-col gap-3'
              : isShortLandscape
                ? 'flex-row gap-4'
                : 'flex-row gap-6 lg:gap-12'
          }`}
        >
          {/* Left Side: Carved Faction Crests */}
          <div
            data-title-factions="true"
            className={`frosted-obsidian pointer-events-auto rounded-xl ${
              isPortraitMobile
                ? 'grid w-full max-w-[360px] grid-cols-2 gap-1.5 p-2'
                : isShortLandscape
                  ? 'flex w-[160px] flex-col gap-1 p-1.5'
                  : 'flex w-[196px] flex-col gap-2 p-2.5 lg:w-[216px]'
            }`}
          >
            <StoneCorners color="#D7A447" />
            {!isShortLandscape && (
              <div className="font-display relative z-10 col-span-2 text-center text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#C8A66A]">
                {t.schoolLabel}
              </div>
            )}
            {SCHOOLS.map(({ id, color, Icon }) => {
              const active = school === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-school-option={id}
                  onClick={() => {
                    etherAudio.playUiSelect();
                    onSelectSchool(id);
                  }}
                  className={`font-body relative z-10 inline-flex items-center gap-2 rounded-lg border px-2.5 transition-all duration-150 hover:scale-[1.04] active:scale-95 whitespace-nowrap ${
                    isShortLandscape
                      ? 'min-h-[28px] text-[10.5px]'
                      : isPortraitMobile
                        ? 'min-h-[36px] justify-center text-[11px]'
                        : 'min-h-[40px] justify-start text-xs'
                  }`}
                  style={{
                    borderColor: active ? '#FFE29A' : 'rgba(130, 138, 165, 0.35)',
                    color: active ? '#FFE8AE' : '#B7C0CE',
                    background: active
                      ? 'linear-gradient(135deg, rgba(226, 179, 84, 0.24) 0%, rgba(44, 34, 22, 0.85) 100%)'
                      : 'linear-gradient(180deg, rgba(30, 34, 48, 0.62) 0%, rgba(16, 18, 28, 0.78) 100%)',
                    boxShadow: active
                      ? 'inset 0 1px 0 rgba(255, 232, 175, 0.4), 0 0 16px rgba(226, 179, 84, 0.32)'
                      : 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: active ? color : '#7B8599' }}
                    aria-hidden="true"
                  />
                  <span className={active ? 'font-bold tracking-wide' : 'font-normal'}>
                    {schoolNames[id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center Dominant Focal Anchor: Circular Glowing Portal Medallion */}
          <div className="pointer-events-auto relative flex flex-col items-center justify-center">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className={`portal-medallion group flex flex-col items-center justify-center gap-1.5 text-center ${
                isShortLandscape
                  ? 'h-28 w-28 px-2'
                  : isPortraitMobile
                    ? 'h-36 w-36 px-3'
                    : 'h-44 w-44 px-4 lg:h-48 lg:w-48'
              }`}
            >
              {/* Inner Sacred Ring */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full border border-[#7BE6DB]/45 transition-transform duration-500 group-hover:rotate-45"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-3.5 rounded-full border border-dashed border-[#FFE29A]/40"
              />
              <Swords
                className={`relative z-10 text-[#FFE8AE] drop-shadow-[0_2px_10px_rgba(226,179,84,0.85)] ${
                  isShortLandscape ? 'h-5 w-5' : 'h-7 w-7 sm:h-8 sm:w-8'
                }`}
                aria-hidden="true"
              />
              <span
                className={`font-display relative z-10 font-extrabold uppercase leading-tight tracking-[0.14em] text-[#FFF7E6] ${
                  isShortLandscape ? 'text-[10px]' : isPortraitMobile ? 'text-xs' : 'text-sm lg:text-[15px]'
                }`}
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 14px rgba(123,230,219,0.55)' }}
              >
                {t.startDuel}
              </span>
            </button>
          </div>

          {/* Right Side: Carved Altar Tier Difficulty Selector */}
          <div
            data-title-difficulties="true"
            className={`frosted-obsidian pointer-events-auto rounded-xl ${
              isPortraitMobile
                ? 'grid w-full max-w-[360px] grid-cols-3 gap-1.5 p-2'
                : isShortLandscape
                  ? 'flex w-[160px] flex-col gap-1 p-1.5'
                  : 'flex w-[196px] flex-col gap-2 p-2.5 lg:w-[216px]'
            }`}
          >
            <StoneCorners color="#D7A447" />
            {!isShortLandscape && (
              <div
                className={`font-display relative z-10 text-center text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#C8A66A] ${
                  isPortraitMobile ? 'col-span-3' : ''
                }`}
              >
                {t.difficulty}
              </div>
            )}
            {difficulties.map((item) => {
              const active = difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-difficulty-option={item.id}
                  onClick={() => {
                    etherAudio.playUiSelect();
                    onSelectDifficulty(item.id);
                  }}
                  className={`font-body relative z-10 inline-flex items-center justify-between gap-1.5 rounded-lg border px-2.5 transition-all duration-150 hover:scale-[1.04] active:scale-95 whitespace-nowrap ${
                    isShortLandscape
                      ? 'min-h-[28px] text-[10.5px]'
                      : isPortraitMobile
                        ? 'min-h-[36px] justify-center text-[11px]'
                        : 'min-h-[42px] text-xs'
                  }`}
                  style={{
                    borderColor: active ? '#FFE29A' : 'rgba(130, 138, 165, 0.35)',
                    color: active ? '#FFE8AE' : '#B7C0CE',
                    background: active
                      ? 'linear-gradient(135deg, rgba(226, 179, 84, 0.28) 0%, rgba(56, 38, 16, 0.88) 100%)'
                      : 'linear-gradient(180deg, rgba(30, 34, 48, 0.62) 0%, rgba(16, 18, 28, 0.78) 100%)',
                    boxShadow: active
                      ? 'inset 0 1px 0 rgba(255, 236, 188, 0.45), 0 0 16px rgba(226, 179, 84, 0.34)'
                      : 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {!isPortraitMobile && (
                    <span
                      className={`font-num text-[10px] font-bold ${
                        active ? 'text-[#FFE29A]' : 'text-[#6F788C]'
                      }`}
                    >
                      {item.tier}
                    </span>
                  )}
                  <span className={active ? 'font-bold tracking-wide' : 'font-normal'}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Bottom spacer on desktop/landscape */}
        {!isPortraitMobile && !isShortLandscape && <div className="h-1" aria-hidden="true" />}
      </main>

      {/* Bottom Thin Translucent Strip for Secondary Actions */}
      <footer className="relative z-20 mx-auto flex w-full max-w-2xl flex-col items-center gap-1 text-center">
        <div
          className={`frosted-obsidian pointer-events-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full ${
            isShortLandscape ? 'px-3 py-1' : 'px-4 py-1.5'
          }`}
        >
          {canContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="font-display inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#5EC8BE]/60 bg-[#102024]/70 px-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#A8F3EC] transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              <span>{t.continueCampaign}</span>
              {savedStageIndex !== null && (
                <span className="font-num text-[10px] text-[#FFE29A]">
                  · {savedStageIndex + 1}/7 · R{archonRank}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            data-trial-start="true"
            onClick={onStartDailyTrial}
            title={t.dailyTrial.modifiers[dailyTrial.modifier].desc}
            className="font-display inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#A67F38]/55 bg-[#151320]/70 px-3 text-[10.5px] font-bold uppercase tracking-wider text-[#E8D7B8] transition-transform hover:scale-105 hover:border-[#FFE29A] active:scale-95 whitespace-nowrap"
          >
            <Calendar className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />
            <span>{t.dailyTrial.startBtn}</span>
          </button>

          {bestStage > 0 && !isShortLandscape && (
            <span className="font-num px-1.5 text-[10.5px] text-[#C8B8A2]">
              {t.careerBestStage}: {bestStage}/7
            </span>
          )}
        </div>

        {!isCompact && (
          <p
            className="font-body px-4 text-[10.5px] tracking-wide text-[#DFD3C1]/85 drop-shadow-md"
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.96)' }}
          >
            {t.controlsHint}
          </p>
        )}
      </footer>
    </div>
  );
}
