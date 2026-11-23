import { useState } from 'react';
import {
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Gem,
  Globe,
  HelpCircle,
  Home,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Swords,
  Wind,
} from 'lucide-react';
import type { GraphicsQuality } from '../core/graphicsSettings';
import { CARD_CATALOG, RELIC_CATALOG, type CardDef, type Difficulty, type RelicId } from '../game/cards';
import { getArchonRank, getCardEffectiveStats, type DuelState } from '../game/duelEngine';
import { LANGUAGES, type LanguageCode, type TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import { StoneCorners, StoneDivider } from './StoneOrnament';

function SchoolSigil({ school }: { school: MagicSchool }) {
  if (school === 'kinet') return <Wind className="h-4 w-4 text-[#66DDD2]" aria-hidden="true" />;
  if (school === 'synth') return <Shield className="h-4 w-4 text-[#9AB8D1]" aria-hidden="true" />;
  if (school === 'chaos') return <Flame className="h-4 w-4 text-[#FF8775]" aria-hidden="true" />;
  return <Sparkles className="h-4 w-4 text-[#E5B85B]" aria-hidden="true" />;
}

export function TournamentPathStrip({
  stageIndex,
  t,
}: {
  stageIndex: number;
  t: TranslationPack;
}) {
  return (
    <div className="relative z-10 mx-auto my-2.5 flex w-full max-w-md flex-col items-center gap-1">
      <span className="font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-[#C8A35E]">
        {t.tournamentPathLabel}
      </span>
      <div className="flex w-full items-center justify-between px-2">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const isBoss = idx === 3 || idx === 6;
          const completed = idx < stageIndex;
          const active = idx === stageIndex;
          return (
            <div key={idx} className="flex flex-1 items-center last:flex-none">
              <div
                title={t.bossNames[`s${idx + 1}`] ?? `Stage ${idx + 1}`}
                className={`font-num flex items-center justify-center border text-[10px] font-bold ${
                  isBoss ? 'h-7 w-7' : 'h-6 w-6'
                }`}
                style={{
                  borderColor: active ? '#FFE29A' : completed ? '#5EC8BE' : isBoss ? '#A94334' : '#4E435A',
                  background: active
                    ? 'linear-gradient(180deg, #4C381C 0%, #261B0D 100%)'
                    : completed
                      ? '#12292D'
                      : '#16131D',
                  color: active ? '#FFE8AE' : completed ? '#8BE3DA' : '#8A7F96',
                }}
              >
                {isBoss ? <Crown className="h-3 w-3" aria-hidden="true" /> : idx + 1}
              </div>
              {idx < 6 && (
                <div
                  className="h-[1px] flex-1"
                  style={{
                    background: idx < stageIndex ? '#5EC8BE' : 'rgba(166, 127, 56, 0.35)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BriefingModalProps {
  t: TranslationPack;
  stageIndex: number;
  opponentSchool: MagicSchool;
  playerSchool?: MagicSchool;
  archonRank?: number;
  onContinue: () => void;
}

export function BriefingModal({
  t,
  stageIndex,
  opponentSchool,
  playerSchool,
  archonRank = 1,
  onContinue,
}: BriefingModalProps) {
  const key = `s${stageIndex + 1}`;
  const name = t.bossNames[key] ?? `Stage ${stageIndex + 1}`;
  const quote = t.bossQuotes[key] ?? '';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/74 p-4">
      <div className="stone-panel w-full max-w-lg p-6 text-center">
        <StoneCorners />

        <TournamentPathStrip stageIndex={stageIndex} t={t} />

        <div className="font-display relative z-10 mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7CDAD1]">
          <SchoolSigil school={opponentSchool} />
          <span>
            {t.stage} {stageIndex + 1} / 7
          </span>
        </div>

        <h2 className="font-display relative z-10 mt-2 text-2xl font-bold tracking-wide text-[#FBF2E1] sm:text-3xl">
          {name}
        </h2>

        <StoneDivider />

        <p className="font-body relative z-10 py-2 text-sm italic leading-relaxed text-[#E2D6C3]">
          {quote}
        </p>

        {playerSchool && (
          <div className="relative z-10 mt-2 border border-[#5EC8BE]/45 bg-[#121D21]/90 px-3 py-2 text-left text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold uppercase tracking-wider text-[#7BE6DB]">
                {t.orderDoctrines[playerSchool].name}
              </span>
              <span className="font-num text-[10.5px] font-bold text-[#FFE29A]">
                {t.archonRankLabel} {archonRank}
              </span>
            </div>
            <p className="font-body mt-0.5 text-[11px] leading-snug text-[#D6E4E1]">
              {t.orderDoctrines[playerSchool].desc}
            </p>
          </div>
        )}

        <StoneDivider />

        <button
          type="button"
          data-start="true"
          onClick={onContinue}
          className="gold-cta-btn font-display relative z-10 mt-3 inline-flex min-h-[48px] items-center justify-center gap-2 px-7 py-2.5 text-sm font-extrabold uppercase tracking-[0.16em]"
        >
          <Swords className="h-4 w-4" aria-hidden="true" />
          <span>{t.briefingContinue}</span>
        </button>
      </div>
    </div>
  );
}

interface PauseModalProps {
  t: TranslationPack;
  lang: LanguageCode;
  difficulty: Difficulty;
  graphics: GraphicsQuality;
  fastCombat: boolean;
  hoverInspector: boolean;
  isFullscreen: boolean;
  onSelectLang: (l: LanguageCode) => void;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectGraphics: (g: GraphicsQuality) => void;
  onToggleFastCombat: () => void;
  onToggleHoverInspector: () => void;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  t,
  lang,
  difficulty,
  graphics,
  fastCombat,
  hoverInspector,
  isFullscreen,
  onSelectLang,
  onSelectDifficulty,
  onSelectGraphics,
  onToggleFastCombat,
  onToggleHoverInspector,
  onToggleFullscreen,
  onOpenHelp,
  onResume,
  onRestart,
  onExitToMenu,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/76 p-3 sm:p-4">
      <div className="stone-panel max-h-[92vh] w-full max-w-md overflow-y-auto p-4 sm:p-6">
        <StoneCorners />

        <h2 className="font-display relative z-10 text-center text-2xl font-bold tracking-[0.12em] text-[#FBF2E1]">
          {t.menu}
        </h2>

        <div className="relative z-10 mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="gold-cta-btn font-display inline-flex min-h-[46px] items-center justify-center gap-2 px-5 py-2 text-sm font-extrabold uppercase tracking-wider"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>{t.resume}</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="stone-btn font-body inline-flex min-h-[44px] items-center justify-center gap-2 border-[#4E9F97] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#A9F3EB]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{t.restart}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="stone-btn font-body inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#EAD9BD]"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-[#E2B354]" /> : <Maximize2 className="h-4 w-4 text-[#E2B354]" />}
            <span>{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
          </button>

          <button
            type="button"
            data-help-btn="true"
            onClick={onOpenHelp}
            className="stone-btn font-body inline-flex min-h-[44px] items-center justify-center gap-2 border-[#7E6334] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#FFE8AE]"
          >
            <HelpCircle className="h-4 w-4 text-[#E2B354]" aria-hidden="true" />
            <span>{t.helpBtn}</span>
          </button>

          <StoneDivider />

          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xs font-semibold uppercase tracking-wider text-[#D7A84E]">
              {t.difficulty}
            </span>
            <select
              value={difficulty}
              onChange={(e) => onSelectDifficulty(e.target.value as Difficulty)}
              className="font-body min-h-[40px] border border-[#8C6C36] bg-[#14111A] px-2.5 py-1 text-xs text-[#F4ECE0]"
            >
              <option value="apprentice">{t.diffApprentice}</option>
              <option value="archmage">{t.diffArchmage}</option>
              <option value="cataclysm">{t.diffCataclysm}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D7A84E]">
              <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.graphicsLabel}</span>
            </span>
            <select
              aria-label={t.graphicsLabel}
              value={graphics}
              onChange={(e) => onSelectGraphics(e.target.value as GraphicsQuality)}
              className="font-body min-h-[40px] border border-[#8C6C36] bg-[#14111A] px-2.5 py-1 text-xs text-[#F4ECE0]"
            >
              <option value="ultra">{t.gfxUltra}</option>
              <option value="high">{t.gfxHigh}</option>
              <option value="medium">{t.gfxMedium}</option>
              <option value="low">{t.gfxLow}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D7A84E]">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.fastCombatLabel}</span>
            </span>
            <button
              type="button"
              aria-label={t.fastCombatLabel}
              onClick={onToggleFastCombat}
              className="stone-btn font-body min-h-[38px] min-w-[112px] px-3 py-1 text-xs font-bold"
              style={{
                borderColor: fastCombat ? '#5EC8BE' : '#8C6C36',
                color: fastCombat ? '#A8F3EC' : '#EAD9BD',
              }}
            >
              {fastCombat ? t.fastCombatOn : t.fastCombatOff}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D7A84E]">
              {hoverInspector ? (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{t.hoverInspectorLabel}</span>
            </span>
            <button
              type="button"
              data-hover-toggle="true"
              aria-label={t.hoverInspectorLabel}
              onClick={onToggleHoverInspector}
              className="stone-btn font-body min-h-[38px] min-w-[112px] px-3 py-1 text-xs font-bold"
              style={{
                borderColor: hoverInspector ? '#5EC8BE' : '#8C6C36',
                color: hoverInspector ? '#A8F3EC' : '#EAD9BD',
              }}
            >
              {hoverInspector ? t.hoverInspectorOn : t.hoverInspectorOff}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-display inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D7A84E]">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.language}</span>
            </span>
            <select
              value={lang}
              onChange={(e) => onSelectLang(e.target.value as LanguageCode)}
              className="font-body min-h-[40px] border border-[#8C6C36] bg-[#14111A] px-2.5 py-1 text-xs text-[#F4ECE0]"
            >
              {LANGUAGES.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onExitToMenu}
            className="stone-btn font-body mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 border-[#A94334] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#FFB4A8]"
            style={{ background: 'linear-gradient(180deg, #3A191B 0%, #220E10 100%)' }}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{t.exitToMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function cardTypeBadgeLabel(card: CardDef, t: TranslationPack): string {
  if (card.type === 'creature') return `${card.atk} ATK · ${card.hp} HP`;
  if (card.type === 'enchantment') return t.keywordEnchantment;
  if (card.type === 'trap') return t.keywordTrap;
  if (card.type === 'ritual') return t.keywordRitual;
  return t.keywordSpell;
}

export type SanctuaryAction =
  | { kind: 'replace'; replaceIndex: number | null }
  | { kind: 'forge'; targetCardId: string }
  | { kind: 'shrine' }
  | { kind: 'purge'; removeIndex: number };

interface DraftModalProps {
  t: TranslationPack;
  choices: string[];
  relicChoices: RelicId[];
  activeRelics: RelicId[];
  deck: string[];
  stageIndex?: number;
  archonXp?: number;
  xpGained?: number;
  forgedCards?: Record<string, number>;
  defeatedSchool?: MagicSchool;
  playerSchool?: MagicSchool;
  onConfirmDraft: (newCardId: string, sanctuary: SanctuaryAction, pickedRelic: RelicId | null) => void;
}

export function DraftModal({
  t,
  choices,
  relicChoices,
  activeRelics,
  deck,
  stageIndex = 0,
  archonXp = 0,
  xpGained = 0,
  forgedCards = {},
  defeatedSchool,
  playerSchool,
  onConfirmDraft,
}: DraftModalProps) {
  const [pickedCard, setPickedCard] = useState<string | null>(null);
  const [pickedRelic, setPickedRelic] = useState<RelicId | null>(null);
  const [relicStepDone, setRelicStepDone] = useState(false);
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [sanctuaryMode, setSanctuaryMode] = useState<'replace' | 'forge' | 'shrine' | 'purge'>('replace');

  const needsRelicPick = relicChoices.length > 0 && !relicStepDone;
  const rank = getArchonRank(archonXp);
  const nextRankXp = rank * 220 - archonXp;
  const uniqueDeckCards = Array.from(new Set(pickedCard ? [...deck, pickedCard] : deck));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/62 p-4">
      <div className="stone-panel w-full max-w-3xl p-5 sm:p-6">
        <StoneCorners />

        <TournamentPathStrip stageIndex={Math.min(6, stageIndex + 1)} t={t} />

        <div className="relative z-10 text-center">
          <h2 className="font-display text-xl font-bold tracking-wider text-[#FBF2E1] sm:text-2xl">
            {pickedCard && needsRelicPick
              ? t.relicsTitle
              : pickedCard
                ? t.sanctuaryTitle
                : t.draftTitle}
          </h2>
          <p className="font-body mt-1 text-xs text-[#D6C9B5]">
            {!pickedCard
              ? t.draftHint
              : needsRelicPick
                ? t.relicPickHint
                : t.sanctuaryHint}
          </p>

          {/* Archon Rank & XP Progress Readout */}
          <div className="font-num mt-2 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border border-[#7E6334]/65 bg-[#15121C] px-3 py-1 text-[11px] text-[#EAD9BD]">
            <span className="font-bold text-[#FFE29A]">
              {t.archonRankLabel} {rank}
            </span>
            {xpGained > 0 && <span className="text-[#7BE6DB]">+{xpGained} XP</span>}
            <span className="text-[#B8AB98]">
              {t.xpNextRankLabel}: {nextRankXp} XP · {t.rankBonusSummary}
            </span>
          </div>

          {activeRelics.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {activeRelics.map((rId) => (
                <span
                  key={rId}
                  title={t.relicDescs[rId] ?? ''}
                  className="inline-flex items-center gap-1 border border-[#9E7835] bg-[#1A1520] px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]"
                >
                  <Gem className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                  <span>{t.relicNames[rId] ?? rId}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {!pickedCard ? (
          <div className="relative z-10 mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {choices.map((id) => {
                const card = CARD_CATALOG[id];
                if (!card) return null;
                const eff = getCardEffectiveStats(id, forgedCards);
                const isTrophy = Boolean(
                  defeatedSchool && card.school === defeatedSchool && card.school !== playerSchool
                );
                return (
                  <button
                    key={id}
                    type="button"
                    data-trophy-card={isTrophy ? 'true' : undefined}
                    onClick={() => {
                      setPickedCard(id);
                      if (relicChoices.length === 0) setRelicStepDone(true);
                    }}
                    className="tarot-card relative flex min-h-[164px] flex-col justify-between p-4 text-left transition-transform hover:-translate-y-1 hover:border-[#FFE4A1]"
                  >
                    <StoneCorners color={isTrophy ? '#FF8E7A' : undefined} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between border-b border-[#A67F38]/35 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <SchoolSigil school={card.school} />
                          {isTrophy && (
                            <span className="border border-[#C95846] bg-[#361618] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FFB4A8]">
                              {t.trophyBadge}
                            </span>
                          )}
                        </div>
                        <span className="gem-socket font-num flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-[#0B1C1B]">
                          {eff.cost}
                        </span>
                      </div>
                      <h3 className="font-display mt-2 text-sm font-bold text-[#FBF2E1]">
                        {t.cardNames[id] ?? id}
                        {eff.forgeTier > 0 && (
                          <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                        )}
                      </h3>
                      <p className="font-body mt-1.5 text-xs leading-relaxed text-[#D6C9B5]">
                        {t.cardRules[id] ?? ''}
                      </p>
                    </div>
                    <div className="font-num relative z-10 mt-3 border-t border-[#A67F38]/35 pt-2 text-xs font-bold text-[#E8BC5E]">
                      {card.type === 'creature' ? `${eff.atk} ATK · ${eff.hp} HP` : cardTypeBadgeLabel(card, t)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowDeckPreview((v) => !v)}
                className="stone-btn font-body inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1 text-xs text-[#DFD3C1]"
              >
                <Layers className="h-3.5 w-3.5 text-[#E2B354]" aria-hidden="true" />
                <span>
                  {t.manageDeckBtn} ({deck.length}/16)
                </span>
              </button>
            </div>

            {showDeckPreview && (
              <div className="mt-2.5 grid max-h-[140px] grid-cols-2 gap-1.5 overflow-y-auto border border-[#6E562E]/60 bg-[#120F17]/90 p-2 sm:grid-cols-4">
                {deck.map((dId, i) => {
                  const eff = getCardEffectiveStats(dId, forgedCards);
                  return (
                    <div
                      key={`${dId}-${i}`}
                      className="flex items-center justify-between border border-[#4A3B23] bg-[#1A1622] px-2 py-1 text-[11px] text-[#EAD9BD]"
                    >
                      <span className="truncate">
                        {t.cardNames[dId] ?? dId}
                        {eff.forgeTier > 0 && (
                          <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                        )}
                      </span>
                      <span className="font-num ml-1.5 font-bold text-[#7EE6DC]">{eff.cost}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : needsRelicPick ? (
          <div className="relative z-10 mt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {relicChoices.map((rId) => {
                const def = RELIC_CATALOG[rId];
                const schoolKey = def?.school === 'all' ? 'synth' : (def?.school ?? 'synth');
                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => {
                      setPickedRelic(rId);
                      setRelicStepDone(true);
                    }}
                    className="tarot-card relative flex min-h-[144px] flex-col justify-between p-4 text-left transition-transform hover:-translate-y-1 hover:border-[#7BE6DB]"
                  >
                    <StoneCorners color="#5EC8BE" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between border-b border-[#5EC8BE]/35 pb-1.5">
                        <SchoolSigil school={schoolKey} />
                        <Gem className="h-4 w-4 text-[#FFE29A]" aria-hidden="true" />
                      </div>
                      <h3 className="font-display mt-2 text-sm font-bold text-[#FFE8AE]">
                        {t.relicNames[rId] ?? rId}
                      </h3>
                      <p className="font-body mt-1.5 text-xs leading-relaxed text-[#D6C9B5]">
                        {t.relicDescs[rId] ?? ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setPickedRelic(null);
                  setRelicStepDone(true);
                }}
                className="stone-btn font-display min-h-[40px] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C8B9A2]"
              >
                {t.skipRelic}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 mt-4">
            {/* Sanctuary Rite Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(['replace', 'forge', 'shrine', 'purge'] as const).map((m) => {
                const active = sanctuaryMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    data-sanctuary-tab={m}
                    onClick={() => setSanctuaryMode(m)}
                    className={`p-2 text-left text-xs ${
                      active ? 'gold-cta-btn font-bold' : 'stone-btn text-[#EAD9BD]'
                    }`}
                  >
                    <div className="font-display text-[11px] font-bold uppercase tracking-wider">
                      {t.sanctuaryModes[m].title}
                    </div>
                    <div className={`font-body mt-0.5 text-[10px] ${active ? 'text-[#2B1F11]' : 'text-[#B9AD9A]'}`}>
                      {t.sanctuaryModes[m].desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {sanctuaryMode === 'replace' && (
              <div className="mt-4">
                <p className="font-body mb-2 text-center text-xs text-[#D6C9B5]">{t.replacePrompt}</p>
                <div className="grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {deck.map((deckCardId, idx) => {
                    const eff = getCardEffectiveStats(deckCardId, forgedCards);
                    return (
                      <button
                        key={`${deckCardId}-${idx}`}
                        type="button"
                        onClick={() => onConfirmDraft(pickedCard, { kind: 'replace', replaceIndex: idx }, pickedRelic)}
                        className="stone-btn font-body flex min-h-[42px] items-center justify-between px-3 py-1.5 text-left text-xs text-[#F4ECE0] hover:border-[#FF8A75]"
                      >
                        <span className="truncate font-bold">
                          {t.cardNames[deckCardId] ?? deckCardId}
                          {eff.forgeTier > 0 && (
                            <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                          )}
                        </span>
                        <span className="font-num ml-2 font-bold text-[#7EE6DC]">{eff.cost}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => onConfirmDraft(pickedCard, { kind: 'replace', replaceIndex: null }, pickedRelic)}
                    className="stone-btn font-display min-h-[44px] border-[#5EC8BE] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#A9F2EA]"
                  >
                    {t.keepDeck}
                  </button>
                </div>
              </div>
            )}

            {sanctuaryMode === 'forge' && (
              <div className="mt-4">
                <div className="grid max-h-[240px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {uniqueDeckCards.map((cid) => {
                    const def = CARD_CATALOG[cid];
                    if (!def) return null;
                    const eff = getCardEffectiveStats(cid, forgedCards);
                    const maxed = eff.forgeTier >= 2;
                    const bonusHint =
                      def.type === 'creature'
                        ? t.forgedBonusCreature
                        : def.type === 'enchantment' || def.type === 'trap'
                          ? t.forgedBonusCost
                          : t.forgedBonusSpell;
                    return (
                      <button
                        key={cid}
                        type="button"
                        disabled={maxed}
                        onClick={() => onConfirmDraft(pickedCard, { kind: 'forge', targetCardId: cid }, pickedRelic)}
                        className="stone-btn flex items-center justify-between gap-2 px-3 py-2 text-left disabled:opacity-45 hover:border-[#FFE29A]"
                      >
                        <div className="min-w-0">
                          <div className="font-display truncate text-xs font-bold text-[#FBF2E1]">
                            {t.cardNames[cid] ?? cid}
                            {eff.forgeTier > 0 && (
                              <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                            )}
                          </div>
                          <div className="font-body text-[10px] text-[#7BE6DB]">
                            ★ → {bonusHint}
                          </div>
                        </div>
                        <span className="font-num shrink-0 border border-[#9E7835] bg-[#16131B] px-2 py-0.5 text-[11px] font-bold text-[#FFE29A]">
                          {eff.cost}⚡
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sanctuaryMode === 'shrine' && (
              <div className="mt-4 border border-[#5EC8BE]/50 bg-[#121D21]/90 p-5 text-center">
                <p className="font-body text-sm leading-relaxed text-[#E4EFEA]">{t.shrineEffect}</p>
                <button
                  type="button"
                  onClick={() => onConfirmDraft(pickedCard, { kind: 'shrine' }, pickedRelic)}
                  className="gold-cta-btn font-display mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2 text-xs font-extrabold uppercase tracking-wider"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{t.shrineConfirmBtn}</span>
                </button>
              </div>
            )}

            {sanctuaryMode === 'purge' && (
              <div className="mt-4">
                {deck.length <= 8 ? (
                  <p className="font-body py-6 text-center text-xs text-[#E89B8D]">{t.purgeTooSmall}</p>
                ) : (
                  <div className="grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                    {deck.map((deckCardId, idx) => {
                      const eff = getCardEffectiveStats(deckCardId, forgedCards);
                      return (
                        <button
                          key={`purge-${deckCardId}-${idx}`}
                          type="button"
                          onClick={() => onConfirmDraft(pickedCard, { kind: 'purge', removeIndex: idx }, pickedRelic)}
                          className="stone-btn font-body flex min-h-[42px] items-center justify-between px-3 py-1.5 text-left text-xs text-[#FFD2CA] hover:border-[#FF7E6B]"
                        >
                          <span className="truncate font-bold">{t.cardNames[deckCardId] ?? deckCardId}</span>
                          <span className="font-num ml-2 font-bold text-[#FF9482]">{eff.cost}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface GameOverModalProps {
  t: TranslationPack;
  state: DuelState;
  isVictory: boolean;
  isCampaignComplete: boolean;
  xpGained?: number;
  archonXp?: number;
  onNextDuel: () => void;
  onPlayAgain: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  t,
  state,
  isVictory,
  isCampaignComplete,
  xpGained = 0,
  archonXp = 0,
  onNextDuel,
  onPlayAgain,
  onExitToMenu,
}: GameOverModalProps) {
  const headline = isCampaignComplete
    ? t.campaignWinTitle
    : isVictory
      ? t.victoryTitle
      : t.defeatTitle;
  const rank = getArchonRank(archonXp);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/62 p-4">
      <div className={`${isVictory ? 'stone-panel' : 'stone-panel-crimson'} w-full max-w-md p-6 text-center`}>
        <StoneCorners color={isVictory ? '#D7A84E' : '#C95846'} />

        <Crown
          className="relative z-10 mx-auto h-10 w-10"
          style={{ color: isVictory ? '#E2B354' : '#D94432' }}
          aria-hidden="true"
        />

        <h2 className="font-display relative z-10 mt-3 text-2xl font-bold tracking-[0.1em] text-[#FBF2E1] sm:text-3xl">
          {headline}
        </h2>

        <TournamentPathStrip stageIndex={state.stageIndex} t={t} />

        {(xpGained > 0 || archonXp > 0) && (
          <div className="font-num relative z-10 mt-2 inline-flex items-center gap-3 border border-[#7E6334]/65 bg-[#15121C] px-3 py-1 text-xs text-[#FFE29A]">
            <span>
              {t.archonRankLabel} {rank}
            </span>
            {xpGained > 0 && <span className="text-[#7BE6DB]">+{xpGained} XP</span>}
          </div>
        )}

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2.5 border-y border-[#A67F38]/35 py-4 text-xs">
          <div className="border border-[#5A4728] bg-[#141118] p-2.5">
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-[#C8A35E]">
              {t.statDamageDealt}
            </div>
            <div className="font-num mt-1 text-lg font-bold text-[#FBF2E1]">{state.damageDealtTotal}</div>
          </div>
          <div className="border border-[#5A4728] bg-[#141118] p-2.5">
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-[#C8A35E]">
              {t.statOverloads}
            </div>
            <div className="font-num mt-1 text-lg font-bold text-[#FF8A75]">{state.overloadCount}</div>
          </div>
          <div className="border border-[#5A4728] bg-[#141118] p-2.5">
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-[#C8A35E]">
              {t.statTurns}
            </div>
            <div className="font-num mt-1 text-lg font-bold text-[#66DDD2]">{state.round}</div>
          </div>
          <div className="border border-[#5A4728] bg-[#141118] p-2.5">
            <div className="font-display text-[10px] font-semibold uppercase tracking-wider text-[#C8A35E]">
              {t.statStageReached}
            </div>
            <div className="font-num mt-1 text-lg font-bold text-[#E8BC5E]">{state.stageIndex + 1}/7</div>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-col gap-2.5">
          {isVictory && !isCampaignComplete ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextDuel}
              className="gold-cta-btn font-display min-h-[48px] px-6 py-2.5 text-sm font-extrabold uppercase tracking-[0.15em]"
            >
              {t.nextDuel}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="gold-cta-btn font-display min-h-[48px] px-6 py-2.5 text-sm font-extrabold uppercase tracking-[0.15em]"
            >
              {t.playAgain}
            </button>
          )}

          <button
            type="button"
            onClick={onExitToMenu}
            className="stone-btn font-body min-h-[44px] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#EAD9BD]"
          >
            {t.exitToMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
