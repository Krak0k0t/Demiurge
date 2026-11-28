import { useState } from 'react';
import { Award, BookOpen, Calendar, CheckCircle2, Crown, Flame, Gem, Lock, Maximize2, Minimize2, Shield, Sparkles, Wind, X } from 'lucide-react';
import { ALL_RELIC_IDS, CARD_CATALOG } from '../game/cards';
import { evaluateCathedralOaths, getCodexMasterySummary } from '../game/campaignOaths';
import { CHRONICLE_CHAPTERS, type CodexSaveData, type DailyTrialConfig } from '../game/cathedralMeta';
import type { TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import { StoneCorners, StoneDivider } from './StoneOrnament';

interface CodexModalProps {
  t: TranslationPack;
  codex: CodexSaveData;
  dailyTrial: DailyTrialConfig;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose: () => void;
}

type CodexTab = 'orders' | 'vault' | 'chronicle';

function OrderIcon({ school }: { school: MagicSchool }) {
  if (school === 'kinet') return <Wind className="h-4 w-4 text-[#7BE6DB]" aria-hidden="true" />;
  if (school === 'synth') return <Shield className="h-4 w-4 text-[#A7C4DC]" aria-hidden="true" />;
  if (school === 'chaos') return <Flame className="h-4 w-4 text-[#FF8E7A]" aria-hidden="true" />;
  return <Sparkles className="h-4 w-4 text-[#F0D284]" aria-hidden="true" />;
}

export function CodexModal({
  t,
  codex,
  dailyTrial,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
}: CodexModalProps) {
  const [tab, setTab] = useState<CodexTab>('orders');

  const allCardIds = Object.keys(CARD_CATALOG);
  const discoveredCardSet = new Set(codex.discoveredCards);
  const discoveredRelicSet = new Set(codex.discoveredRelics);
  const totalWins =
    (codex.orderWins.kinet ?? 0) +
    (codex.orderWins.vital ?? 0) +
    (codex.orderWins.chaos ?? 0) +
    (codex.orderWins.synth ?? 0);
  const oaths = evaluateCathedralOaths(codex);
  const mastery = getCodexMasterySummary(codex);

  const schoolNames: Record<MagicSchool, string> = {
    kinet: t.schoolKinet,
    vital: t.schoolVital,
    chaos: t.schoolChaos,
    synth: t.schoolSynth,
  };

  return (
    <div
      data-codex-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/78 p-3 sm:p-5"
    >
      <div className="stone-panel flex max-h-[90vh] w-full max-w-3xl flex-col p-4 sm:p-6">
        <StoneCorners />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[#E2B354]">
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold tracking-wider text-[#FBF2E1] sm:text-xl">
                {t.codex.title}
              </h2>
            </div>
            <p className="font-body mt-0.5 text-xs text-[#C7BA9F]">{t.codex.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleFullscreen && (
              <button
                type="button"
                data-fullscreen-btn="true"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
                title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                className="stone-btn inline-flex h-9 w-9 shrink-0 items-center justify-center text-[#E2B354]"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            <button
              type="button"
              data-codex-close="true"
              onClick={onClose}
              aria-label={t.codex.close}
              className="stone-btn inline-flex h-9 w-9 shrink-0 items-center justify-center text-[#EAD9BD]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="relative z-10 mt-3 grid grid-cols-3 gap-1.5">
          {(['orders', 'vault', 'chronicle'] as const).map((id) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                data-codex-tab={id}
                onClick={() => setTab(id)}
                className={`font-display min-h-[38px] px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  active ? 'gold-cta-btn' : 'stone-btn text-[#DFD3C1]'
                }`}
              >
                {t.codex.tabs[id]}
              </button>
            );
          })}
        </div>

        <StoneDivider />

        {/* Scrollable Tab Body */}
        <div className="relative z-10 mt-2 flex-1 overflow-y-auto pr-1">
          {tab === 'orders' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(['kinet', 'vital', 'chaos', 'synth'] as const).map((sc) => {
                  const wins = codex.orderWins[sc] ?? 0;
                  return (
                    <div key={sc} className="border border-[#7E6334]/75 bg-[#131019]/92 p-3">
                      <div className="flex items-center justify-between gap-2 border-b border-[#A67F38]/30 pb-1.5">
                        <div className="inline-flex items-center gap-1.5">
                          <OrderIcon school={sc} />
                          <span className="font-display text-xs font-bold uppercase tracking-wider text-[#FBF2E1]">
                            {schoolNames[sc]}
                          </span>
                        </div>
                        <span className="font-num inline-flex items-center gap-1 border border-[#7E6334]/65 bg-[#1A1522] px-2 py-0.5 text-[10.5px] font-bold text-[#FFE29A]">
                          <Crown className="h-3 w-3 text-[#E2B354]" aria-hidden="true" />
                          {t.codex.ordersCleared}: {wins}
                        </span>
                      </div>
                      <div className="font-display mt-1.5 text-[11px] font-bold text-[#7BE6DB]">
                        {t.orderDoctrines[sc].name}
                      </div>
                      <p className="font-body mt-0.5 text-[11px] leading-snug text-[#D6C9B5]">
                        {t.orderDoctrines[sc].desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Daily Trial Record Panel */}
              <div className="border border-[#5EC8BE]/55 bg-[#11191E]/92 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#5EC8BE]/25 pb-1.5">
                  <div className="inline-flex items-center gap-1.5 text-[#7BE6DB]">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      {t.dailyTrial.title} · {dailyTrial.dateKey}
                    </span>
                  </div>
                  <span className="font-num text-[11px] font-bold text-[#FFE29A]">
                    {t.dailyTrial.modifiers[dailyTrial.modifier].name}
                  </span>
                </div>
                <p className="font-body mt-1.5 text-xs text-[#D6E4E1]">
                  {t.dailyTrial.modifiers[dailyTrial.modifier].desc}
                </p>
                <div className="font-num mt-2 flex flex-wrap gap-3 text-[11px] text-[#EAD9BD]">
                  {codex.bestTrialStage > 0 ? (
                    <>
                      <span>
                        {t.codex.bestTrialLabel}: {codex.bestTrialStage}/7 ({codex.bestTrialScore} dmg)
                      </span>
                      <span>
                        {t.codex.trialCompletedCount}: {codex.trialsCompleted}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#A89B86]">{t.codex.noTrialYet}</span>
                  )}
                </div>
              </div>

              {/* Persistent Cathedral Oaths */}
              <div
                data-codex-oaths="true"
                className="border border-[#8B6D38]/75 bg-[#13101B]/94 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#A67F38]/30 pb-1.5">
                  <div className="inline-flex items-center gap-1.5 text-[#E2B354]">
                    <Award className="h-4 w-4" aria-hidden="true" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-[#FBF2E1]">
                      {t.codex.oathsTitle}
                    </span>
                  </div>
                  <span className="font-num border border-[#7E6334]/75 bg-[#1B1624] px-2 py-0.5 text-[10.5px] font-bold text-[#FFE29A]">
                    {t.codex.oathsMasteryLabel} {mastery.rank}/4 · {mastery.completedCount}/{mastery.totalCount}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {oaths.map((oath) => {
                    const copy = t.codex.oathItems[oath.id];
                    return (
                      <div
                        key={oath.id}
                        data-oath-id={oath.id}
                        className="flex flex-col justify-between border px-2.5 py-2"
                        style={{
                          borderColor: oath.completed ? '#9D7B3B' : '#433A4F',
                          background: oath.completed ? '#1A1621' : '#110F17',
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold text-[#FBF2E1]">
                              <OrderIcon school={oath.school} />
                              <span>{copy.title}</span>
                            </span>
                            {oath.completed ? (
                              <span className="font-num inline-flex items-center gap-1 text-[10px] font-bold text-[#7BE6DB]">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                {t.codex.oathCompletedBadge}
                              </span>
                            ) : (
                              <span className="font-num text-[10.5px] font-bold text-[#D9C7A3]">
                                {oath.current}/{oath.target}
                              </span>
                            )}
                          </div>
                          <p className="font-body mt-1 text-[10.5px] leading-snug text-[#C7BA9F]">
                            {copy.desc}
                          </p>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden bg-[#221D2C]">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.round(oath.progressRatio * 100)}%`,
                              background: oath.completed ? '#5EC8BE' : '#D5A74B',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'vault' && (
            <div className="flex flex-col gap-3">
              <div className="font-num flex flex-wrap items-center justify-between gap-2 border border-[#7E6334]/55 bg-[#15121B] px-3 py-1.5 text-xs text-[#FFE29A]">
                <span>
                  {t.codex.discoveredCardsLabel}: {codex.discoveredCards.length}/{allCardIds.length}
                </span>
                <span>
                  {t.codex.discoveredRelicsLabel}: {codex.discoveredRelics.length}/{ALL_RELIC_IDS.length}
                </span>
              </div>

              {/* Relics Grid */}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ALL_RELIC_IDS.map((rId) => {
                  const found = discoveredRelicSet.has(rId);
                  return (
                    <div
                      key={rId}
                      className="flex items-start gap-2 border px-2.5 py-2 text-left"
                      style={{
                        borderColor: found ? '#7E6334' : '#3E3647',
                        background: found ? '#17131E' : '#110F15',
                        opacity: found ? 1 : 0.65,
                      }}
                    >
                      {found ? (
                        <Gem className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E2B354]" aria-hidden="true" />
                      ) : (
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6F667A]" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <div className="font-display truncate text-[11px] font-bold text-[#FBF2E1]">
                          {found ? (t.relicNames[rId] ?? rId) : t.codex.unknownCard}
                        </div>
                        <div className="font-body text-[10.5px] leading-snug text-[#C7BA9F]">
                          {found ? (t.relicDescs[rId] ?? '') : '???'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3">
                {allCardIds.map((cId) => {
                  const def = CARD_CATALOG[cId];
                  const found = discoveredCardSet.has(cId);
                  return (
                    <div
                      key={cId}
                      className="flex flex-col justify-between border px-2.5 py-2 text-left"
                      style={{
                        borderColor: found ? '#6B5532' : '#373041',
                        background: found ? '#15121C' : '#100E14',
                        opacity: found ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 truncate font-display text-[11px] font-bold text-[#FBF2E1]">
                          {found ? <OrderIcon school={def.school} /> : <Lock className="h-3 w-3 text-[#6F667A]" />}
                          <span className="truncate">{found ? (t.cardNames[cId] ?? cId) : t.codex.unknownCard}</span>
                        </span>
                        <span className="font-num shrink-0 text-[10.5px] font-bold text-[#7BE6DB]">
                          {found ? `${def.cost}⚡` : '?'}
                        </span>
                      </div>
                      <p className="font-body mt-1 text-[10px] leading-snug text-[#C7BA9F]">
                        {found ? (t.cardRules[cId] ?? '') : '???'}
                      </p>
                      {found && def.type === 'creature' && (
                        <div className="font-num mt-1 text-[10px] font-bold text-[#E8BC5E]">
                          {def.atk} ATK · {def.hp} HP
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'chronicle' && (
            <div className="flex flex-col gap-2.5">
              {CHRONICLE_CHAPTERS.map((ch) => {
                const unlocked = totalWins >= ch.unlockWinsRequired;
                const chText = t.codex.chapters[ch.id];
                return (
                  <div
                    key={ch.id}
                    className="border p-3.5 text-left"
                    style={{
                      borderColor: unlocked ? '#8B6D38' : '#3F3749',
                      background: unlocked ? '#15121C' : '#100E14',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        {unlocked ? (
                          <OrderIcon school={ch.school} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-[#7A7088]" aria-hidden="true" />
                        )}
                        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#FFE29A]">
                          {chText.title}
                        </h3>
                      </div>
                    </div>
                    <p className="font-body mt-1.5 text-xs leading-relaxed text-[#DED2BF]">
                      {unlocked
                        ? chText.text
                        : `${t.codex.lockedChapterHint}${ch.unlockWinsRequired})`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
