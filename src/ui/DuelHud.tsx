import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowLeftRight,
  Camera,
  Crown,
  Eye,
  Flame,
  Gem,
  Heart,
  HelpCircle,
  Layers,
  Link2,
  Maximize2,
  Menu,
  Minimize2,
  Orbit,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { GRAPHICS_LEVEL } from '../core/graphicsSettings';
import { CARD_CATALOG, type CardDef } from '../game/cards';
import {
  computeEnemyIntent,
  getCardEffectiveStats,
  getOpponentForStage,
  type DuelState,
} from '../game/duelEngine';
import type { TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import type { CameraPreset, HoverTargetInfo, ProjectedBadge } from '../view/duelScene';
import { StoneCorners } from './StoneOrnament';

export interface CardAnchorPoint {
  x: number;
  y: number;
}

interface DuelHudProps {
  t: TranslationPack;
  state: DuelState;
  badges: ProjectedBadge[];
  hoverTarget: HoverTargetInfo | null;
  preset: CameraPreset;
  selectedHandIndex: number | null;
  swapMode: boolean;
  swapSourceLane: number | null;
  ascendMode: boolean;
  isTargetingSpell?: boolean;
  resolvingTurn?: boolean;
  rivalCallout?: string | null;
  graphicsLevel: number;
  muted: boolean;
  isFullscreen: boolean;
  onSelectPreset: (p: CameraPreset) => void;
  onSelectCard: (handIndex: number, anchor?: CardAnchorPoint) => void;
  onHoverCard: (handIndex: number | null, anchor?: CardAnchorPoint) => void;
  onTargetCreature?: (side: 'player' | 'enemy', lane: number) => void;
  onPerformMulligan: (indices: number[]) => void;
  onFuseCreature: (handIndex: number, lane: number) => void;
  onToggleAscendMode: () => void;
  onToggleSwapMode: () => void;
  onSelectSwapLane: (lane: number) => void;
  onToggleStance: (lane: number) => void;
  onTriggerAbility: (lane: number) => void;
  onTriggerOverload: () => void;
  onToggleAltar: () => void;
  onTriggerUltimatum: () => void;
  onTriggerLeap: () => void;
  onTriggerChronoRewind: () => void;
  onTriggerSoulTether: () => void;
  onTriggerResonance: () => void;
  onEndTurn: () => void;
  onOpenHelp: () => void;
  onOpenMenu: () => void;
  onToggleAudio: () => void;
  onToggleFullscreen: () => void;
}

function SchoolIcon({ school }: { school: MagicSchool }) {
  if (school === 'kinet') return <Wind className="h-3.5 w-3.5 shrink-0 text-[#66DDD2]" aria-hidden="true" />;
  if (school === 'synth') return <Shield className="h-3.5 w-3.5 shrink-0 text-[#9AB8D1]" aria-hidden="true" />;
  if (school === 'chaos') return <Flame className="h-3.5 w-3.5 shrink-0 text-[#FF8775]" aria-hidden="true" />;
  return <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E5B85B]" aria-hidden="true" />;
}

function cardTypeTag(card: CardDef, t: TranslationPack): string {
  if (card.type === 'enchantment') return t.keywordEnchantment;
  if (card.type === 'trap') return t.keywordTrap;
  if (card.type === 'spell') return t.keywordSpell;
  if (card.type === 'ritual') return t.keywordRitual;
  const kw = card.keywords[0];
  if (kw === 'flying') return t.keywordFlying;
  if (kw === 'firstStrike') return t.keywordFirstStrike;
  if (kw === 'armor') return t.keywordArmor;
  if (kw === 'poison') return t.keywordPoison;
  if (kw === 'heal') return t.keywordHeal;
  return card.activeAbility ? (t.abilityNames[card.activeAbility] ?? 'Skill') : 'Unit';
}

function keywordLabel(kw: string, t: TranslationPack): string {
  if (kw === 'flying') return t.keywordFlying;
  if (kw === 'firstStrike') return t.keywordFirstStrike;
  if (kw === 'armor') return t.keywordArmor;
  if (kw === 'poison') return t.keywordPoison;
  if (kw === 'heal') return t.keywordHeal;
  return kw;
}

export function DuelHud({
  t,
  state,
  badges,
  hoverTarget,
  preset,
  selectedHandIndex,
  swapMode,
  swapSourceLane,
  ascendMode,
  isTargetingSpell = false,
  resolvingTurn = false,
  rivalCallout = null,
  graphicsLevel,
  muted,
  isFullscreen,
  onSelectPreset,
  onSelectCard,
  onHoverCard,
  onTargetCreature,
  onPerformMulligan,
  onFuseCreature,
  onToggleAscendMode,
  onToggleSwapMode,
  onSelectSwapLane,
  onToggleStance,
  onTriggerAbility,
  onTriggerOverload,
  onToggleAltar,
  onTriggerUltimatum,
  onTriggerLeap,
  onTriggerChronoRewind,
  onTriggerSoulTether,
  onTriggerResonance,
  onEndTurn,
  onOpenHelp,
  onOpenMenu,
  onToggleAudio,
  onToggleFullscreen,
}: DuelHudProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [cardTilt, setCardTilt] = useState<{ idx: number; rx: number; ry: number; gx: number } | null>(null);
  const [mulliganMode, setMulliganMode] = useState(false);
  const [mulliganSelected, setMulliganSelected] = useState<number[]>([]);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const onHoverCardRef = { current: onHoverCard };

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isShortLandscape = viewport.h <= 540;
  const isCompact = viewport.w < 1024 || isShortLandscape;
  const isNarrowPhone = viewport.w < 640;

  const playerHpPct = Math.max(0, Math.min(100, (state.playerHp / Math.max(1, state.playerMaxHp)) * 100));
  const enemyHpPct = Math.max(0, Math.min(100, (state.enemyHp / Math.max(1, state.enemyMaxHp)) * 100));

  const [playerTrailPct, setPlayerTrailPct] = useState(playerHpPct);
  const [enemyTrailPct, setEnemyTrailPct] = useState(enemyHpPct);
  const [roundBanner, setRoundBanner] = useState<{ round: number; key: number } | null>(null);

  useEffect(() => {
    setHoveredIdx(null);
    setCardTilt(null);
    onHoverCardRef.current(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playerHand.length, state.round, state.phase]);

  useEffect(() => {
    if (state.mulliganDone || state.round !== 1 || state.phase !== 'player_main') {
      setMulliganMode(false);
      setMulliganSelected([]);
    }
  }, [state.mulliganDone, state.round, state.phase]);

  useEffect(() => {
    if (graphicsLevel < GRAPHICS_LEVEL.high || playerHpPct >= playerTrailPct) {
      setPlayerTrailPct(playerHpPct);
      return;
    }
    const id = window.setTimeout(() => setPlayerTrailPct(playerHpPct), 180);
    return () => window.clearTimeout(id);
  }, [playerHpPct, playerTrailPct, graphicsLevel]);

  useEffect(() => {
    if (graphicsLevel < GRAPHICS_LEVEL.high || enemyHpPct >= enemyTrailPct) {
      setEnemyTrailPct(enemyHpPct);
      return;
    }
    const id = window.setTimeout(() => setEnemyTrailPct(enemyHpPct), 180);
    return () => window.clearTimeout(id);
  }, [enemyHpPct, enemyTrailPct, graphicsLevel]);

  useEffect(() => {
    if (graphicsLevel === GRAPHICS_LEVEL.low || isCompact) {
      setRoundBanner(null);
      return;
    }
    if (state.phase !== 'player_main') return;
    const key = state.stageIndex * 1000 + state.round;
    setRoundBanner({ round: state.round, key });
    const id = window.setTimeout(() => {
      setRoundBanner((prev) => (prev?.key === key ? null : prev));
    }, 1480);
    return () => window.clearTimeout(id);
  }, [state.round, state.stageIndex, state.phase, graphicsLevel, isCompact]);

  const oppKey = `s${state.stageIndex + 1}`;
  const opponentDef = getOpponentForStage(state.stageIndex);
  const bossPassiveId = opponentDef.bossPassive;
  const enemyName = t.bossNames[oppKey] ?? `Stage ${state.stageIndex + 1}`;
  const anomalyInfo = t.anomalies[state.anomaly] ?? { name: state.anomaly, desc: '' };
  const intent = computeEnemyIntent(state);

  const isPlayerTurnReady = state.phase === 'player_main' && !resolvingTurn;
  const isOverloaded = state.overloadUsedThisTurn || state.ultimatumActive;
  const hasAffordableCard = state.playerHand.some((id) => {
    const c = CARD_CATALOG[id];
    if (!c) return false;
    const effCost = getCardEffectiveStats(id, state.forgedCards).cost;
    return state.altarMode || state.playerEther >= effCost;
  });

  const canUltimatum =
    isPlayerTurnReady && !state.ultimatumUsed && state.playerHp < state.playerMaxHp * 0.5;
  const canOverload =
    isPlayerTurnReady && !state.overloadUsedThisTurn && state.playerHp > 1;
  const canMulligan =
    isPlayerTurnReady && state.round === 1 && !state.mulliganDone && state.playerHand.length > 0;
  const hasAnyPlayerCreature = state.playerBoard.some((c) => c !== null);
  const canSwap = isPlayerTurnReady && !state.swapUsedThisTurn && hasAnyPlayerCreature;
  const hasAffordableCreature = state.playerHand.some((id) => {
    const c = CARD_CATALOG[id];
    const effCost = getCardEffectiveStats(id, state.forgedCards).cost;
    return c?.type === 'creature' && state.playerEther >= effCost;
  });
  const hasRestorableAlly = state.playerBoard.some(
    (c) => c !== null && (c.hp < c.maxHp || Boolean(c.abilityUsedThisTurn) || Boolean(c.exhausted))
  );
  const canChronoRewind =
    isPlayerTurnReady &&
    !state.chronoRewindUsed &&
    (Boolean(state.lastLostAlly) || hasRestorableAlly);
  const canSoulTether =
    isPlayerTurnReady && !state.soulTetherActive && state.soulTetherCooldown === 0;
  const canResonance = isPlayerTurnReady && state.playerResonance >= 5;
  const activeBurnCount = state.chaosBurnLanes.filter((turns) => turns > 0).length;

  const selectedHandCard =
    selectedHandIndex !== null && state.playerHand[selectedHandIndex]
      ? CARD_CATALOG[state.playerHand[selectedHandIndex]]
      : undefined;
  const selectedEffStats = selectedHandCard
    ? getCardEffectiveStats(selectedHandCard.id, state.forgedCards)
    : null;
  const canFuseSelected = Boolean(
    selectedHandIndex !== null &&
      selectedHandCard &&
      selectedEffStats &&
      selectedHandCard.type === 'creature' &&
      !state.altarMode &&
      !mulliganMode &&
      isPlayerTurnReady &&
      state.playerEther >= selectedEffStats.cost
  );
  const spellTargetSide: 'player' | 'enemy' =
    selectedHandCard?.spellEffect?.kind === 'double_hp_armor' ? 'player' : 'enemy';

  // Remaining draw pile grouped by card & sorted by cost (doesn't reveal draw order)
  const remainingGrouped = Object.entries(
    state.playerDrawPile.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {})
  ).sort(
    (a, b) =>
      getCardEffectiveStats(a[0], state.forgedCards).cost -
      getCardEffectiveStats(b[0], state.forgedCards).cost
  );

  // Ether crystal sockets (up to 10 visible gems)
  const totalSockets = Math.min(10, Math.max(state.playerChannel, state.playerEther));

  // Determine active card for keyword tooltip (hovered takes priority, else selected)
  const inspectIdx = hoveredIdx ?? selectedHandIndex;
  const inspectedCardId = inspectIdx !== null ? state.playerHand[inspectIdx] : undefined;
  const inspectedCard = inspectedCardId ? CARD_CATALOG[inspectedCardId] : undefined;
  const tooltipKeywords: string[] = inspectedCard
    ? inspectedCard.type === 'creature'
      ? inspectedCard.keywords.length > 0
        ? inspectedCard.keywords
        : []
      : [inspectedCard.type]
    : [];
  const tooltipEntries = tooltipKeywords
    .map((kw) => ({ kw, desc: t.keywordDescs[kw] }))
    .filter((entry): entry is { kw: string; desc: string } => Boolean(entry.desc));

  const schoolNames: Record<MagicSchool, string> = {
    kinet: t.schoolKinet,
    vital: t.schoolVital,
    chaos: t.schoolChaos,
    synth: t.schoolSynth,
  };

  const playerBoardEmpty = state.playerBoard.every((cell) => cell === null);
  const enemyBoardEmpty = state.enemyBoard.every((cell) => cell === null);
  const hasReadyPlayerAttacker = state.playerBoard.some(
    (c) => c !== null && c.stance === 'attack' && !c.exhausted && !c.summonSick && c.atk > 0
  );
  const boardHintText =
    state.phase !== 'player_main' || isShortLandscape
      ? null
      : playerBoardEmpty
        ? t.boardHintSummon
        : hasReadyPlayerAttacker && enemyBoardEmpty
          ? t.boardHintOpenFrontline
          : null;

  // Resolve 3D Hover Stat Inspector data & clamped screen position (floating only on compact screens; docked cleanly on desktop)
  const hoveredCreature =
    hoverTarget?.kind === 'creature'
      ? ([...state.playerBoard, ...state.enemyBoard].find((c) => c?.uid === hoverTarget.uid) ?? null)
      : null;
  const inspectorCardW = 256;
  const inspectorCardH = 210;
  const floatingInspectorStyle: CSSProperties | undefined =
    hoverTarget && isCompact
      ? {
          left: `${Math.round(
            Math.max(
              12,
              Math.min(
                viewport.w - inspectorCardW - 12,
                hoverTarget.x + 22 > viewport.w - inspectorCardW - 12
                  ? hoverTarget.x - inspectorCardW - 22
                  : hoverTarget.x + 22
              )
            )
          )}px`,
          top: `${Math.round(
            Math.max(12, Math.min(viewport.h - inspectorCardH - 12, hoverTarget.y - 54))
          )}px`,
          width: `${inspectorCardW}px`,
        }
      : undefined;

  // De-overlap adjacent projected creature badges and clamp inside visible arena band
  const resolvedBadges: ProjectedBadge[] = (() => {
    const visible = badges.filter((b) => b.visible);
    const minX = isCompact ? 56 : 96;
    const maxX = Math.max(minX + 10, viewport.w - (isCompact ? 56 : 96));
    const minY = isShortLandscape ? 72 : isCompact ? 112 : 114;
    const maxY = Math.max(minY + 20, viewport.h - (isShortLandscape ? 132 : isCompact ? 196 : 210));
    const stepX = isCompact ? 112 : 176;
    const stepY = isCompact ? 28 : 34;

    const sorted = [...visible]
      .map((b) => ({
        ...b,
        x: Math.max(minX, Math.min(maxX, b.x)),
        y: Math.max(minY, Math.min(maxY, b.y)),
      }))
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      for (let pass = 0; pass < 3; pass++) {
        const clash = sorted
          .slice(0, i)
          .some((prev) => Math.abs(prev.x - sorted[i].x) < stepX && Math.abs(prev.y - sorted[i].y) < stepY);
        if (!clash) break;
        sorted[i].y = Math.max(minY - 12, sorted[i].y - stepY);
      }
    }
    return sorted;
  })();

  const renderHoverInspectorCard = (docked: boolean) => {
    if (!hoverTarget) return null;
    if (hoverTarget.kind === 'creature' && hoveredCreature) {
      return (
        <div
          data-hover-inspector="creature"
          data-hover-uid={hoveredCreature.uid}
          className={`stone-panel pointer-events-none p-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.9)] ${
            docked ? 'mt-1 w-[264px]' : 'fixed z-30'
          }`}
          style={docked ? undefined : floatingInspectorStyle}
        >
            <StoneCorners color={hoveredCreature.side === 'player' ? '#5EC8BE' : '#D95843'} />
            <div className="relative z-10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-[#A67F38]/35 pb-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <SchoolIcon school={hoveredCreature.school} />
                  <span className="font-display truncate text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#C8A35E]">
                    {schoolNames[hoveredCreature.school]}
                  </span>
                </div>
                <span
                  className={`font-display text-[9px] font-bold uppercase tracking-wider ${
                    hoveredCreature.side === 'player' ? 'text-[#7BE6DB]' : 'text-[#FF9482]'
                  }`}
                >
                  {hoveredCreature.side === 'player' ? t.inspectorArchonYou : t.enemyPrefix}
                </span>
              </div>

              <div className="font-display text-sm font-bold text-[#FBF2E1]">
                {t.cardNames[hoveredCreature.cardId] ?? hoveredCreature.cardId}
              </div>

              <div className="font-num flex items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 border border-[#9E7835] bg-[#16131B] px-2 py-0.5 text-[#F0C86E]">
                  <Swords className="h-3 w-3" aria-hidden="true" />
                  {t.inspectorAttack} {hoveredCreature.atk}
                </span>
                <span className="inline-flex items-center gap-1 border border-[#448D85] bg-[#121D1E] px-2 py-0.5 text-[#85EDE3]">
                  <Heart className="h-3 w-3" aria-hidden="true" />
                  {t.inspectorHealth} {hoveredCreature.hp}/{hoveredCreature.maxHp}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="border border-[#6D5B39] bg-[#18141F] px-1.5 py-0.5 font-semibold text-[#E8D5B3]">
                  {hoveredCreature.stance === 'guard' ? t.stanceGuard : t.stanceAttack}
                </span>
                {hoveredCreature.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="border border-[#5EC8BE]/50 bg-[#122224] px-1.5 py-0.5 font-semibold text-[#9AF3EA]"
                  >
                    {keywordLabel(kw, t)}
                  </span>
                ))}
                {hoveredCreature.veteranCount > 0 && (
                  <span className="border border-[#D7A447]/70 bg-[#251E12] px-1.5 py-0.5 font-semibold text-[#FFE08A]">
                    {t.veteranTag} ×{hoveredCreature.veteranCount}
                  </span>
                )}
                {hoveredCreature.shielded && (
                  <span className="border border-[#7BE3FF]/70 bg-[#12262E] px-1.5 py-0.5 font-semibold text-[#A8EEFF]">
                    {t.inspectorShielded}
                  </span>
                )}
                {hoveredCreature.exhausted && (
                  <span className="border border-[#B94738]/70 bg-[#291315] px-1.5 py-0.5 font-semibold text-[#FFA494]">
                    {t.inspectorExhausted}
                  </span>
                )}
                {hoveredCreature.summonSick && (
                  <span className="border border-[#756880]/60 bg-[#1C1824] px-1.5 py-0.5 font-semibold text-[#D0C4DC]">
                    {t.inspectorSummonSick}
                  </span>
                )}
              </div>

              {hoveredCreature.activeAbility ? (
                <p className="font-body border-t border-[#A67F38]/25 pt-1 text-[10.5px] leading-snug text-[#A8F3EC]">
                  <strong className="font-display mr-1 text-[9.5px] uppercase tracking-wider text-[#66DDD2]">
                    {t.abilityNames[hoveredCreature.activeAbility] ?? t.inspectorAbility}:
                  </strong>
                  {t.abilityDescs[hoveredCreature.activeAbility] ?? ''}
                </p>
              ) : (
                <p className="font-body border-t border-[#A67F38]/25 pt-1 text-[10.5px] leading-snug text-[#D6C9B5]">
                  {t.cardRules[hoveredCreature.cardId] ?? ''}
                </p>
              )}
            </div>
          </div>
      );
    }
    if (hoverTarget.kind === 'archon') {
      return (
        <div
          data-hover-inspector="archon"
          data-hover-side={hoverTarget.side}
          className={`${hoverTarget.side === 'player' ? 'stone-panel' : 'stone-panel-crimson'} pointer-events-none p-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.9)] ${
            docked ? 'mt-1 w-[264px]' : 'fixed z-30'
          }`}
          style={docked ? undefined : floatingInspectorStyle}
        >
            <StoneCorners color={hoverTarget.side === 'player' ? '#5EC8BE' : '#D95843'} />
            {hoverTarget.side === 'player' ? (
              <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#A67F38]/35 pb-1">
                  <div className="flex items-center gap-1.5">
                    <SchoolIcon school={state.playerSchool} />
                    <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#7BE6DB]">
                      {schoolNames[state.playerSchool]}
                    </span>
                  </div>
                  {canUltimatum && (
                    <span className="border border-[#D7A447] bg-[#2D1F12] px-1.5 py-0.5 text-[9px] font-bold text-[#FFE29A]">
                      {t.inspectorReadyUlt}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-sm font-bold text-[#FBF2E1]">{t.inspectorArchonYou}</div>
                  <span className="font-num border border-[#9E7835] bg-[#1D1724] px-1.5 py-0.5 text-[10px] font-bold text-[#FFE29A]">
                    {t.archonRankLabel} {state.archonRank}
                  </span>
                </div>
                <div className="font-num flex items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 border border-[#448D85] bg-[#121D1E] px-2 py-0.5 text-[#85EDE3]">
                    <Heart className="h-3 w-3" aria-hidden="true" />
                    {state.playerHp}/{state.playerMaxHp}
                  </span>
                  <span className="inline-flex items-center gap-1 border border-[#9E7835] bg-[#16131B] px-2 py-0.5 text-[#7EE6DC]">
                    <Sparkles className="h-3 w-3 text-[#E2B354]" aria-hidden="true" />
                    {state.playerEther}/{state.playerChannel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 ${
                      state.playerResonance >= 5
                        ? 'border-[#FFE29A] bg-[#312310] text-[#FFE8AE]'
                        : 'border-[#5EC8BE]/60 bg-[#101F24] text-[#9BF3EA]'
                    }`}
                  >
                    <Orbit className="h-3 w-3" aria-hidden="true" />
                    {state.playerResonance}/5
                  </span>
                </div>
                <div className="font-body border-t border-[#A67F38]/25 pt-1 text-[10px] leading-snug text-[#D8E7E4]">
                  <span className="font-semibold text-[#7BE6DB]">
                    {t.orderDoctrines[state.playerSchool].name}:{' '}
                  </span>
                  {t.orderDoctrines[state.playerSchool].desc}
                </div>
                <div className="font-body flex flex-col gap-0.5 border-t border-[#A67F38]/25 pt-1 text-[10.5px] text-[#E4D9C8]">
                  {state.soulTetherActive && (
                    <div className="font-semibold text-[#9AF3EA]">
                      <Link2 className="mr-1 inline h-3 w-3 text-[#66DDD2]" aria-hidden="true" />
                      {t.soulTetherActive}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-[#C8A35E]">{t.inspectorAura}: </span>
                    {state.playerEnchantment
                      ? (t.cardNames[state.playerEnchantment] ?? state.playerEnchantment)
                      : t.inspectorEmptyAura}
                  </div>
                  <div>
                    <span className="font-semibold text-[#C8A35E]">{t.inspectorWard}: </span>
                    {state.playerTrap ? (t.cardNames[state.playerTrap] ?? state.playerTrap) : t.inspectorEmptyAura}
                  </div>
                  <div>
                    <span className="font-semibold text-[#C8A35E]">{t.inspectorRelics}: </span>
                    {state.relics.length > 0
                      ? state.relics.map((r) => t.relicNames[r] ?? r).join(', ')
                      : t.inspectorEmptyAura}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#B94738]/40 pb-1">
                  <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#E89B8D]">
                    {t.enemyPrefix} · {t.stage} {state.stageIndex + 1}/7
                  </span>
                </div>
                <div className="font-display text-sm font-bold text-[#FBF2E1]">{enemyName}</div>
                <div className="font-num flex items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 border border-[#8E352B] bg-[#211012] px-2 py-0.5 text-[#FF9E8D]">
                    <Heart className="h-3 w-3" aria-hidden="true" />
                    {state.enemyHp}/{state.enemyMaxHp}
                  </span>
                  <span className="inline-flex items-center gap-1 border border-[#9E7835] bg-[#16131B] px-2 py-0.5 text-[#F0C973]">
                    <Sparkles className="h-3 w-3 text-[#E2B354]" aria-hidden="true" />
                    {state.enemyEther}/{state.enemyChannel}
                  </span>
                </div>
                <div className="font-body flex flex-col gap-0.5 border-t border-[#B94738]/30 pt-1 text-[10.5px] text-[#E8D5CF]">
                  <div>
                    <span className="font-semibold text-[#E89B8D]">{t.intentLabel}: </span>
                    {intent.totalIncomingDmg > 0
                      ? `${intent.directDemiurgeDmg} ${t.intentDirect} / ${intent.boardCreatureDmg} ${t.intentClash}`
                      : state.round === 1 && state.lastAiSummary === null
                        ? t.intentWaitingTurn
                        : state.lastAiSummary?.passedReason === 'board_full'
                          ? t.intentBoardFull
                          : t.intentSavedEther}
                  </div>
                  <div>
                    <span className="font-semibold text-[#E89B8D]">{t.inspectorAura}: </span>
                    {state.enemyEnchantment
                      ? (t.cardNames[state.enemyEnchantment] ?? state.enemyEnchantment)
                      : t.inspectorEmptyAura}
                  </div>
                  <div>
                    <span className="font-semibold text-[#E89B8D]">{t.inspectorWard}: </span>
                    {state.enemyTrap ? t.inspectorHiddenWard : t.inspectorEmptyAura}
                  </div>
                  {bossPassiveId && (
                    <div className="mt-0.5 border-t border-[#B94738]/25 pt-0.5 text-[#FFD2CA]">
                      <span className="font-semibold text-[#FF8E7A]">
                        {t.bossPassiveNames[bossPassiveId] ?? bossPassiveId}:{' '}
                      </span>
                      {t.bossPassiveDescs[bossPassiveId] ?? ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      );
    }
    return null;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Subtle Crimson Low-HP Edge Vignette */}
      {state.playerHp > 0 && state.playerHp <= 7 && state.phase === 'player_main' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{ boxShadow: 'inset 0 0 88px rgba(185, 42, 30, 0.36)' }}
        />
      )}
      {/* Compact / Smartphone Floating Hover Inspector */}
      {isCompact && renderHoverInspectorCard(false)}

      {/* Remaining Draw Pile Inspector Modal */}
      {showDeckModal && (
        <div
          data-deck-modal="true"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/68 p-4"
          onClick={() => setShowDeckModal(false)}
        >
          <div
            className="stone-panel w-full max-w-md p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <StoneCorners color="#5EC8BE" />
            <div className="relative z-10 flex items-center justify-between border-b border-[#A67F38]/40 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#E2B354]" aria-hidden="true" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FBF2E1]">
                  {t.deckRemainingTitle} ({state.playerDrawPile.length})
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowDeckModal(false)}
                className="inline-flex h-7 w-7 items-center justify-center border border-[#7A6338]/70 bg-[#1B1722] text-[#EAD9BD] hover:border-[#FFE29A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative z-10 mt-3 max-h-[260px] overflow-y-auto">
              {remainingGrouped.length === 0 ? (
                <p className="font-body py-4 text-center text-xs text-[#C8B8A2]">{t.deckEmpty}</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {remainingGrouped.map(([id, count]) => {
                    const card = CARD_CATALOG[id];
                    if (!card) return null;
                    const eff = getCardEffectiveStats(id, state.forgedCards);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 border border-[#4E3E26] bg-[#16131D] px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <SchoolIcon school={card.school} />
                          <span className="truncate font-semibold text-[#F4ECE0]">
                            {t.cardNames[id] ?? id}
                            {eff.forgeTier > 0 && (
                              <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                            )}
                          </span>
                        </div>
                        <div className="font-num flex shrink-0 items-center gap-1.5 font-bold">
                          {count > 1 && <span className="text-[#E8BC5E]">×{count}</span>}
                          <span className="gem-socket flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-[#0B1C1B]">
                            {eff.cost}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Round Crest Banner */}
      {roundBanner && (
        <div
          key={roundBanner.key}
          className="round-crest-banner pointer-events-none absolute left-1/2 top-[10.5%] z-20 -translate-x-1/2"
        >
          <div className="stone-panel px-6 py-2 text-center shadow-[0_14px_34px_rgba(0,0,0,0.85)]">
            <StoneCorners color="#E2B354" />
            <div className="font-display relative z-10 text-xs font-extrabold uppercase tracking-[0.26em] text-[#FFE59F] sm:text-sm">
              {t.round} {roundBanner.round}
            </div>
            <div className="font-body relative z-10 mt-0.5 text-[11px] text-[#E6D9C5]">
              {anomalyInfo.name}
            </div>
          </div>
        </div>
      )}
      {/* Projected 3D ATK / HP Carved Stone Medallions (Interactive Stance & Active Abilities) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {resolvedBadges.map((b) => (
              <div
                key={b.uid}
                className="absolute flex -translate-x-1/2 -translate-y-full items-center gap-1"
                style={{ left: `${Math.round(b.x)}px`, top: `${Math.round(b.y)}px` }}
              >
                <div
                  className={`font-num flex items-center gap-1.5 border px-2 py-0.5 text-xs font-bold shadow-[0_6px_14px_rgba(0,0,0,0.85)] ${
                    b.exhausted ? 'opacity-65' : ''
                  }`}
                  style={{
                    background:
                      b.stance === 'guard'
                        ? 'linear-gradient(180deg, #1A3337 0%, #0E1B1F 100%)'
                        : 'linear-gradient(180deg, #27222D 0%, #141118 100%)',
                    borderColor:
                      b.side === 'player'
                        ? b.stance === 'guard'
                          ? '#7CECE2'
                          : '#63C9BF'
                        : '#B94738',
                    color: '#F7EFE1',
                    boxShadow: 'inset 0 1px 0 rgba(255,229,168,0.22), 0 6px 14px rgba(0,0,0,0.85)',
                  }}
                >
                  {b.side === 'player' && state.phase === 'player_main' ? (
                    <button
                      type="button"
                      data-stance-lane={b.lane}
                      title={b.stance === 'guard' ? t.stanceGuard : t.stanceAttack}
                      aria-label={b.stance === 'guard' ? t.stanceGuard : t.stanceAttack}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStance(b.lane);
                      }}
                      className="pointer-events-auto -ml-0.5 inline-flex h-5 w-5 items-center justify-center border border-[#7A6338]/70 bg-[#1B1722] transition-colors hover:border-[#FFE29A]"
                    >
                      {b.stance === 'guard' ? (
                        <Shield className="h-3 w-3 text-[#7BE6DB]" aria-hidden="true" />
                      ) : (
                        <Swords className="h-3 w-3 text-[#E8BC5E]" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    b.stance === 'guard' && <Shield className="h-3 w-3 text-[#7BE6DB]" aria-hidden="true" />
                  )}

                  {b.veteranCount > 0 && (
                    <Crown className="h-3 w-3 text-[#F5D06B]" aria-label={t.veteranTag} />
                  )}
                  {b.shielded && <Shield className="h-3 w-3 text-[#7BE3FF]" aria-hidden="true" />}
                  <span className="inline-flex items-center gap-0.5 text-[#E8BC5E]">
                    {b.side !== 'player' && <Swords className="h-2.5 w-2.5" aria-hidden="true" />}
                    {b.atk}
                  </span>
                  <span className="text-[#6E6359]">/</span>
                  <span className={b.side === 'player' ? 'text-[#7BE6DB]' : 'text-[#FF9482]'}>
                    {b.hp}
                  </span>
                </div>

                {b.side === 'player' &&
                  state.phase === 'player_main' &&
                  b.activeAbility &&
                  !b.abilityUsed &&
                  !b.exhausted &&
                  state.playerEther >= 1 && (
                    <button
                      type="button"
                      data-ability-lane={b.lane}
                      title={`${t.abilityNames[b.activeAbility] ?? ''}: ${t.abilityDescs[b.activeAbility] ?? ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerAbility(b.lane);
                      }}
                      className="pointer-events-auto gold-cta-btn font-num inline-flex h-6 items-center gap-0.5 px-1.5 text-[10px] font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
                    >
                      <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                      <span>1</span>
                    </button>
                  )}

                {b.side === 'player' && canFuseSelected && selectedHandIndex !== null && (
                  <button
                    type="button"
                    data-fuse-lane={b.lane}
                    title={t.ascendHint}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFuseCreature(selectedHandIndex, b.lane);
                    }}
                    className="pointer-events-auto stone-btn font-display inline-flex h-6 items-center gap-0.5 border-[#FFE29A] bg-[#2D2112] px-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-[#FFE8AE] shadow-[0_4px_12px_rgba(0,0,0,0.85)] hover:bg-[#493419]"
                  >
                    <Crown className="h-2.5 w-2.5 text-[#E8BC5E]" aria-hidden="true" />
                    <span>{t.ascendTag}</span>
                  </button>
                )}

                {b.side === 'player' && swapMode && (
                  <button
                    type="button"
                    data-swap-badge-lane={b.lane}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSwapLane(b.lane);
                    }}
                    className={`pointer-events-auto stone-btn font-display inline-flex h-6 items-center gap-0.5 px-1.5 text-[9.5px] font-bold uppercase shadow-[0_4px_12px_rgba(0,0,0,0.85)] ${
                      swapSourceLane === b.lane
                        ? 'border-[#FFE29A] bg-[#3B2C16] text-[#FFE8AE]'
                        : 'border-[#5EC8BE] bg-[#13262A] text-[#A8F3EC]'
                    }`}
                  >
                    <ArrowLeftRight className="h-2.5 w-2.5" aria-hidden="true" />
                    <span>{b.lane + 1}</span>
                  </button>
                )}

                {isTargetingSpell && isPlayerTurnReady && b.side === spellTargetSide && onTargetCreature && (
                  <button
                    type="button"
                    data-target-lane={b.lane}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTargetCreature(b.side, b.lane);
                    }}
                    className="pointer-events-auto gold-cta-btn font-display inline-flex h-6 items-center gap-1 px-2 text-[9.5px] font-extrabold uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                  >
                    <Swords className="h-2.5 w-2.5" aria-hidden="true" />
                    <span>{t.targetBtn}</span>
                  </button>
                )}
              </div>
        ))}
      </div>

      {/* Top Arena Perimeter HUD */}
      <header
        className={`flex items-start justify-between gap-2 ${
          isShortLandscape ? 'px-2 pt-1' : 'flex-wrap p-2 sm:px-4 sm:pt-3'
        }`}
      >
        {/* Unified Enemy Nameplate + Intent Plaque */}
        <div className="flex min-w-0 flex-col items-start gap-1">
          <div
            className={`stone-panel-crimson pointer-events-auto flex flex-col ${
              isShortLandscape
                ? 'gap-0.5 px-2 py-1'
                : isCompact
                  ? 'min-w-[170px] gap-1 px-2.5 py-1.5'
                  : 'min-w-[228px] max-w-[280px] gap-1 px-3 py-2'
            }`}
          >
            <StoneCorners color="#C95846" />
            <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                {!isShortLandscape && (
                  <div className="font-display text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#E89B8D]">
                    {t.enemyPrefix} · {t.stage} {state.stageIndex + 1}/7
                  </div>
                )}
                <div
                  className={`font-display truncate font-bold tracking-wide text-[#FBF2E1] ${
                    isShortLandscape ? 'max-w-[105px] text-[10.5px]' : 'text-[11px] sm:text-[13px]'
                  }`}
                >
                  {enemyName}
                </div>
              </div>
              <div className="font-num flex shrink-0 items-center gap-1.5 text-[11px] sm:gap-2.5 sm:text-xs">
                <span className="inline-flex items-center gap-0.5 sm:gap-1">
                  <Heart className="h-3 w-3 text-[#E86652]" aria-hidden="true" />
                  <strong className="text-[#FF9E8D]">
                    {state.enemyHp}/{state.enemyMaxHp}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-0.5 sm:gap-1">
                  <Sparkles className="h-3 w-3 text-[#E2B354]" aria-hidden="true" />
                  <strong className="text-[#F0C973]">{state.enemyEther}</strong>
                </span>
              </div>
            </div>
            <div className="relative z-10 h-1.5 w-full overflow-hidden border border-[#5D2A24] bg-[#120A0D] p-[1px]">
              <div className="relative h-full w-full">
                <div
                  className="absolute inset-y-0 left-0 bg-[#FFE7C4]/85 transition-all duration-700 ease-out"
                  style={{ width: `${enemyTrailPct}%` }}
                />
                <div
                  className="relative h-full transition-all duration-200"
                  style={{
                    width: `${enemyHpPct}%`,
                    background: 'linear-gradient(90deg, #8F251B 0%, #D94E3B 60%, #FF8E7A 100%)',
                  }}
                />
              </div>
            </div>
            {/* Integrated Enemy Intent Footer */}
            <div
              className="relative z-10 flex items-center justify-between gap-2 border-t border-[#A94334]/35 pt-1 text-[10px] sm:text-[10.5px]"
              aria-label={t.intentLabel}
            >
              <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                <Swords
                  className={`h-3 w-3 shrink-0 ${
                    intent.directDemiurgeDmg > 0 ? 'text-[#FF7862]' : 'text-[#E8BC5E]'
                  }`}
                  aria-hidden="true"
                />
                {!isShortLandscape && (
                  <span className="font-display text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#E89B8D]">
                    {t.intentLabel}:
                  </span>
                )}
                <span className="font-num font-bold text-[#FBF2E1]">
                  {intent.totalIncomingDmg > 0 ? (
                    <>
                      {intent.directDemiurgeDmg > 0 && (
                        <span className="text-[#FF9482]">
                          {intent.directDemiurgeDmg} {t.intentDirect}
                        </span>
                      )}
                      {intent.directDemiurgeDmg > 0 && intent.boardCreatureDmg > 0 && (
                        <span className="mx-1 text-[#7A5D57]">·</span>
                      )}
                      {intent.boardCreatureDmg > 0 && (
                        <span className="text-[#F0C973]">
                          {intent.boardCreatureDmg} {t.intentClash}
                        </span>
                      )}
                    </>
                  ) : state.round === 1 && state.lastAiSummary === null ? (
                    <span className="text-[#E6D9C5]">{t.intentWaitingTurn}</span>
                  ) : state.lastAiSummary?.passedReason === 'board_full' ? (
                    <span className="text-[#E8BC5E]">{t.intentBoardFull}</span>
                  ) : state.lastAiSummary?.passedReason === 'saving_ether' ? (
                    <span className="text-[#C8B8A2]">{t.intentSavedEther}</span>
                  ) : (
                    <span className="text-[#C8B8A2]">0</span>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {intent.playableCardsCount > 0 && (
                  <span className="font-num text-[9.5px] font-bold text-[#E5B85B]">
                    +{intent.playableCardsCount}
                    {!isShortLandscape ? ` ${t.intentReserve}` : ''}
                  </span>
                )}
                {intent.mayOverload && (
                  <Zap className="h-3 w-3 shrink-0 text-[#FF8A75]" aria-label={t.overloadBtn} />
                )}
              </div>
            </div>
          </div>

          {/* Enemy Enchantment / Ward / Boss Passive Micro-Tags */}
          {(state.enemyEnchantment || state.enemyTrap || bossPassiveId) && !isShortLandscape && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1">
              {bossPassiveId && (
                <span
                  data-boss-passive="true"
                  title={t.bossPassiveDescs[bossPassiveId] ?? ''}
                  className="inline-flex items-center gap-1 border border-[#D7A447]/65 bg-[#1B1216]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]"
                >
                  <Skull className="h-2.5 w-2.5 text-[#FF8E7A]" aria-hidden="true" />
                  <span>{t.bossPassiveNames[bossPassiveId] ?? bossPassiveId}</span>
                </span>
              )}
              {state.enemyEnchantment && (
                <span
                  title={t.cardRules[state.enemyEnchantment] ?? ''}
                  className="inline-flex items-center gap-1 border border-[#A94334]/65 bg-[#1B1216]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFD2CA]"
                >
                  <Sparkles className="h-2.5 w-2.5 text-[#FF8E7A]" aria-hidden="true" />
                  <span>{t.cardNames[state.enemyEnchantment] ?? state.enemyEnchantment}</span>
                </span>
              )}
              {state.enemyTrap && (
                <span className="inline-flex items-center gap-1 border border-[#A94334]/65 bg-[#1B1216]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]">
                  <Eye className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                  <span>? {t.trapSlot}</span>
                </span>
              )}
            </div>
          )}

          {/* Rival Turn Action Callout Banner */}
          {rivalCallout && !isShortLandscape && (
            <div
              data-rival-callout="true"
              className="stone-panel-crimson pointer-events-none px-2.5 py-1 text-[10.5px] font-semibold text-[#FFD7CF]"
            >
              {rivalCallout}
            </div>
          )}

          {/* Desktop 3D Hover Stat Inspector Docked in Top-Left Flank */}
          {!isCompact && renderHoverInspectorCard(true)}
        </div>

        {/* Quiet Floating Center Round & Anomaly Crest */}
        <div
          className={`pointer-events-auto text-center transition-colors ${
            isOverloaded
              ? 'border border-[#C94A38]/80 bg-[#241216]/85'
              : 'border border-[#A67F38]/45 bg-[#13101C]/78'
          } ${
            isNarrowPhone
              ? 'order-3 w-full px-2.5 py-0.5'
              : isShortLandscape
                ? 'shrink-0 whitespace-nowrap px-2.5 py-0.5'
                : 'order-3 w-full px-4 py-1 md:order-none md:w-auto md:px-4 md:py-1'
          }`}
        >
          <h2
            className={`font-display font-bold uppercase text-[#E6B85C] ${
              isShortLandscape
                ? 'text-[9.5px] tracking-[0.1em]'
                : 'text-[10px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.18em]'
            }`}
          >
            {t.round} {state.round} · {anomalyInfo.name}
          </h2>
          {(!isCompact || state.altarMode) && (
            <p className="font-body hidden text-[11px] text-[#DCD0BE] md:block">
              {state.altarMode ? t.altarActive : anomalyInfo.desc}
            </p>
          )}
        </div>

        {/* Compact Top-Right Utility Cluster */}
        <div className="relative flex flex-col items-end">
          <div className="stone-panel pointer-events-auto flex items-center gap-0.5 p-0.5">
            <button
              type="button"
              onClick={() => {
                setShowCombatLog(false);
                setShowCameraMenu((v) => !v);
              }}
              title={t.camCombat}
              aria-label={t.camCombat}
              aria-expanded={showCameraMenu}
              className={`inline-flex items-center gap-1 px-2 text-[#E2B354] hover:bg-[#E2B354]/10 hover:text-white ${
                showCameraMenu ? 'bg-[#E2B354]/15 text-[#FFE59F]' : ''
              } ${isCompact ? 'min-h-[34px]' : 'min-h-[36px] text-[11px] font-semibold'}`}
            >
              <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {!isCompact && (
                <span className="font-body whitespace-nowrap">
                  {preset === 'combat' ? t.camCombat : preset === 'closeup' ? t.camClose : t.camWide}
                </span>
              )}
            </button>

            <button
              type="button"
              data-help-btn="true"
              onClick={onOpenHelp}
              aria-label={t.helpBtn}
              title={t.helpBtn}
              className={`inline-flex items-center justify-center border-l border-[#A67F38]/35 px-2 text-[#E2B354] hover:bg-[#E2B354]/10 hover:text-white ${
                isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'
              }`}
            >
              <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              data-log-toggle="true"
              onClick={() => {
                setShowCameraMenu(false);
                setShowCombatLog((v) => !v);
              }}
              aria-label={t.combatLogTitle}
              title={t.combatLogTitle}
              className={`relative inline-flex items-center justify-center border-l border-[#A67F38]/35 px-2 hover:bg-[#E2B354]/10 hover:text-white ${
                showCombatLog ? 'text-[#7BE6DB]' : 'text-[#E2B354]'
              } ${isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'}`}
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              {state.combatLog.length > 0 && (
                <span className="font-num absolute right-0.5 top-0.5 rounded-full bg-[#2B2235] px-1 text-[8.5px] font-bold text-[#FFE29A]">
                  {state.combatLog.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={muted ? t.soundOff : t.soundOn}
              title={muted ? t.soundOff : t.soundOn}
              className={`inline-flex items-center justify-center border-l border-[#A67F38]/35 px-2 text-[#E2B354] hover:bg-[#E2B354]/10 hover:text-white ${
                isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'
              }`}
            >
              {muted ? <VolumeX className="h-4 w-4 text-[#FF8A75]" /> : <Volume2 className="h-4 w-4 text-[#66DDD2]" />}
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              aria-label={t.menu}
              className={`font-body inline-flex items-center gap-1.5 border-l border-[#A67F38]/35 font-bold text-[#F4ECE0] hover:bg-[#E2B354]/15 whitespace-nowrap ${
                isShortLandscape
                  ? 'min-h-[34px] px-2 py-1 text-[11px]'
                  : isCompact
                    ? 'min-h-[34px] px-2.5 py-1 text-[11px]'
                    : 'min-h-[36px] px-3 py-1 text-xs'
              }`}
            >
              <Menu className="h-4 w-4 text-[#E2B354]" aria-hidden="true" />
              <span className={isNarrowPhone || isShortLandscape ? 'hidden' : 'inline'}>{t.menu}</span>
            </button>
          </div>

          {showCameraMenu && (
            <div className="stone-panel pointer-events-auto mt-1.5 flex w-44 flex-col gap-1 p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.88)]">
              <StoneCorners color="#E2B354" />
              {(
                [
                  { id: 'combat', label: t.camCombat },
                  { id: 'closeup', label: t.camClose },
                  { id: 'wide', label: t.camWide },
                ] as const
              ).map((item) => {
                const active = preset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(item.id);
                      setShowCameraMenu(false);
                    }}
                    className={`font-body relative z-10 min-h-[34px] px-2.5 py-1 text-left text-xs transition-colors ${
                      active ? 'gold-cta-btn font-bold' : 'text-[#E7DFD3] hover:bg-[#E2B354]/12 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  onToggleFullscreen();
                  setShowCameraMenu(false);
                }}
                className="font-body relative z-10 mt-0.5 flex min-h-[34px] items-center justify-between border-t border-[#A67F38]/30 px-2.5 pt-1 text-xs text-[#E7DFD3] hover:bg-[#E2B354]/12 hover:text-white"
              >
                <span>{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-[#E2B354]" /> : <Maximize2 className="h-3.5 w-3.5 text-[#E2B354]" />}
              </button>
            </div>
          )}

          {showCombatLog && (
            <div
              data-combat-log="true"
              className="stone-panel pointer-events-auto mt-1.5 w-[270px] max-w-[85vw] p-2.5 text-left shadow-[0_14px_30px_rgba(0,0,0,0.9)] sm:w-[300px]"
            >
              <StoneCorners color="#E2B354" />
              <div className="relative z-10 flex items-center justify-between border-b border-[#A67F38]/35 pb-1">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#E8BC5E]">
                  {t.combatLogTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCombatLog(false)}
                  className="text-[#C8B8A2] hover:text-white"
                  aria-label="Close log"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative z-10 mt-1.5 flex max-h-[165px] flex-col gap-1 overflow-y-auto text-[10.5px]">
                {state.combatLog.length === 0 ? (
                  <span className="font-body italic text-[#B5A796]">{t.combatLogEmpty}</span>
                ) : (
                  [...state.combatLog].reverse().map((entry) => {
                    const actorColor =
                      entry.actor === 'player'
                        ? 'text-[#7BE6DB]'
                        : entry.actor === 'enemy'
                          ? 'text-[#FF9482]'
                          : 'text-[#FFE29A]';
                    const cardLabel = entry.cardId ? (t.cardNames[entry.cardId] ?? entry.cardId) : '';
                    const kindLabel = t.logKinds[entry.kind] ?? entry.kind;
                    const detailLabel =
                      entry.kind === 'boss'
                        ? (t.bossPassiveNames[entry.detail] ?? entry.detail)
                        : entry.kind === 'anomaly'
                          ? (t.anomalies[entry.detail]?.name ?? entry.detail)
                          : entry.detail;
                    return (
                      <div
                        key={entry.id}
                        className="font-body flex items-baseline justify-between gap-2 border-b border-[#3B3045]/50 pb-0.5 leading-snug text-[#E4D9C8]"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-num mr-1 text-[9.5px] text-[#9E8E7A]">R{entry.round}</span>
                          <span className={`font-semibold ${actorColor}`}>{kindLabel}</span>
                          {cardLabel ? `: ${cardLabel}` : ''}
                        </span>
                        <span className="font-num shrink-0 text-[9.5px] font-bold text-[#F0C86E]">
                          {detailLabel}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Perimeter Command Docks & Center Tarot Hand */}
      <footer
        className={`relative flex flex-col items-center ${
          isShortLandscape ? 'gap-0.5 px-2 pb-1' : isCompact ? 'gap-1.5 px-2 pb-2' : 'gap-1.5 px-4 pb-3'
        }`}
      >
        {/* Contextual Hints, Keyword Tooltips & Mode Prompts (shown only when needed) */}
        {boardHintText && !state.altarMode && !mulliganMode && !swapMode && !ascendMode && tooltipEntries.length === 0 && !inspectedCard?.activeAbility && (
          <div
            data-board-hint="true"
            className="pointer-events-none border border-[#5EC8BE]/45 bg-[#12161E]/82 px-3 py-0.5 text-center text-[10.5px] font-medium tracking-wide text-[#9EF3EB]"
          >
            {boardHintText}
          </div>
        )}

        {(tooltipEntries.length > 0 || inspectedCard?.activeAbility) &&
          !mulliganMode &&
          !swapMode &&
          (!isShortLandscape || selectedHandIndex !== null) && (
          <div className="stone-panel pointer-events-none max-w-xl px-3 py-1.5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.85)]">
            <StoneCorners color="#E2B354" />
            <div className="relative z-10 flex flex-col gap-0.5">
              {tooltipEntries.map((entry) => (
                <p key={entry.kw} className="font-body text-[10.5px] leading-snug text-[#EFE4D1] sm:text-[11px]">
                  <span className="font-display mr-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#E8BC5E]">
                    {entry.kw}
                  </span>
                  {entry.desc}
                </p>
              ))}
              {inspectedCard?.activeAbility && (
                <p className="font-body text-[10.5px] leading-snug text-[#A8F3EC] sm:text-[11px]">
                  <span className="font-display mr-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#66DDD2]">
                    {t.abilityNames[inspectedCard.activeAbility] ?? inspectedCard.activeAbility}
                  </span>
                  {t.abilityDescs[inspectedCard.activeAbility] ?? ''}
                </p>
              )}
            </div>
          </div>
        )}

        {mulliganMode && canMulligan && (
          <div
            data-mulligan-bar="true"
            className="stone-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3 py-1.5"
          >
            <span className="font-body text-xs text-[#9EF3EB]">{t.mulliganHint}</span>
            <button
              type="button"
              data-mulligan-confirm="true"
              disabled={mulliganSelected.length === 0}
              onClick={() => {
                onPerformMulligan(mulliganSelected);
                setMulliganMode(false);
                setMulliganSelected([]);
              }}
              className="gold-cta-btn font-display min-h-[32px] px-3 py-1 text-[11px] font-bold uppercase disabled:opacity-45"
            >
              {t.mulliganConfirm} ({mulliganSelected.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMulliganMode(false);
                setMulliganSelected([]);
              }}
              className="stone-btn font-body min-h-[32px] px-2.5 py-1 text-[11px] text-[#EAD9BD]"
            >
              {t.mulliganCancel}
            </button>
          </div>
        )}

        {swapMode && (
          <div
            data-swap-bar="true"
            className="stone-panel pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5"
          >
            <span className="font-body mr-1 text-[11px] text-[#FFE8AE]">
              {swapSourceLane === null ? t.swapPickSource : t.swapPickTarget}
            </span>
            {[0, 1, 2, 3].map((laneIdx) => {
              const unit = state.playerBoard[laneIdx];
              const isSrc = swapSourceLane === laneIdx;
              const disabled = swapSourceLane === null && !unit;
              return (
                <button
                  key={laneIdx}
                  type="button"
                  data-swap-lane={laneIdx}
                  disabled={disabled}
                  onClick={() => onSelectSwapLane(laneIdx)}
                  className={`stone-btn font-body min-h-[30px] px-2 py-0.5 text-[10.5px] font-bold disabled:opacity-35 ${
                    isSrc
                      ? 'border-[#FFE29A] bg-[#3E2E16] text-[#FFE8AE]'
                      : 'border-[#5EC8BE]/70 text-[#A8F3EC]'
                  }`}
                >
                  {t.swapLaneLabel} {laneIdx + 1}
                  {unit ? `: ${unit.atk}/${unit.hp}` : ''}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onToggleSwapMode}
              className="stone-btn font-body min-h-[30px] px-2 py-0.5 text-[10.5px] text-[#FFB4A8]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {ascendMode && selectedHandIndex === null && (
          <div
            data-ascend-bar="true"
            className="stone-panel pointer-events-auto flex items-center gap-2 px-3 py-1 text-[11px] text-[#FFE8AE]"
          >
            <Crown className="h-3.5 w-3.5 text-[#E8BC5E]" aria-hidden="true" />
            <span className="font-body">{t.ascendHint}</span>
          </div>
        )}

        {isTargetingSpell && selectedHandCard && !mulliganMode && !state.altarMode && (
          <div
            data-target-bar="true"
            className="stone-panel pointer-events-auto flex items-center gap-2 px-3 py-1 text-[11px] text-[#FFE8AE]"
          >
            <Swords className="h-3.5 w-3.5 text-[#66DDD2]" aria-hidden="true" />
            <span className="font-body">
              <strong className="text-[#FBF2E1]">{t.cardNames[selectedHandCard.id] ?? selectedHandCard.id}: </strong>
              {t.targetingPrompt}
            </span>
          </div>
        )}

        {state.altarMode && (
          <div
            data-altar-bar="true"
            className="stone-panel-crimson pointer-events-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 px-3 py-1.5 text-center text-[11px] text-[#FFD7CF]"
          >
            <Flame className="h-3.5 w-3.5 shrink-0 text-[#FF8775]" aria-hidden="true" />
            <span className="font-body font-medium">{t.altarBannerExplain}</span>
            <button
              type="button"
              data-altar-cancel="true"
              onClick={onToggleAltar}
              className="stone-btn font-display min-h-[28px] border-[#FF8775] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFE2DC]"
            >
              {t.altarBannerCancel}
            </button>
          </div>
        )}

        {/* Active Player Aura / Ward / Relics / Hero Status Chips (only shown when active) */}
        {(state.playerEnchantment ||
          state.playerTrap ||
          state.relics.length > 0 ||
          state.soulTetherActive ||
          activeBurnCount > 0) && (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1">
            {state.soulTetherActive && (
              <span
                data-tether-chip="true"
                title={t.soulTetherDesc}
                className="inline-flex items-center gap-1 border border-[#66DDD2]/70 bg-[#112024]/88 px-2 py-0.5 text-[10px] font-semibold text-[#A8F3EC]"
              >
                <Link2 className="h-2.5 w-2.5 text-[#66DDD2]" aria-hidden="true" />
                <span>{t.soulTetherActive}</span>
              </span>
            )}
            {activeBurnCount > 0 && (
              <span
                data-burn-chip="true"
                title={t.resonanceDescBySchool.chaos}
                className="inline-flex items-center gap-1 border border-[#C94A38]/75 bg-[#241315]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFB29F]"
              >
                <Flame className="h-2.5 w-2.5 text-[#FF7E5F]" aria-hidden="true" />
                <span>
                  {t.chaosBurnBadge} ×{activeBurnCount}
                </span>
              </span>
            )}
            {state.playerEnchantment && (
              <span
                title={t.cardRules[state.playerEnchantment] ?? ''}
                className="inline-flex items-center gap-1 border border-[#5EC8BE]/60 bg-[#131D22]/88 px-2 py-0.5 text-[10px] font-semibold text-[#A8F3EC]"
              >
                <Sparkles className="h-2.5 w-2.5 text-[#5EC8BE]" aria-hidden="true" />
                <span>{t.cardNames[state.playerEnchantment] ?? state.playerEnchantment}</span>
              </span>
            )}
            {state.playerTrap && (
              <span
                title={t.cardRules[state.playerTrap] ?? ''}
                className="inline-flex items-center gap-1 border border-[#D7A447]/65 bg-[#1D1812]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]"
              >
                <Eye className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                <span>{t.cardNames[state.playerTrap] ?? state.playerTrap}</span>
              </span>
            )}
            {state.relics.length > 0 && (
              <span
                title={state.relics
                  .map((r) => `${t.relicNames[r] ?? r}: ${t.relicDescs[r] ?? ''}`)
                  .join('\n')}
                className="inline-flex items-center gap-1 border border-[#D7A447]/65 bg-[#1D1812]/88 px-2 py-0.5 text-[10px] font-semibold text-[#FFE8AE]"
              >
                <Gem className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                <span>
                  {isShortLandscape ? `×${state.relics.length}` : `${t.relicsTitle}: ${state.relics.length}`}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Reusable Turn Tactics & Archon Powers */}
        {(() => {
          const turnTactics = (
            <>
              {canMulligan && (
                <button
                  type="button"
                  data-mulligan-btn="true"
                  onClick={() => {
                    setMulliganMode((v) => !v);
                    setMulliganSelected([]);
                  }}
                  title={t.mulliganHint}
                  className={`stone-btn font-body inline-flex items-center gap-1 font-bold whitespace-nowrap ${
                    isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                  }`}
                  style={{
                    borderColor: mulliganMode ? '#7BE6DB' : '#5EC8BE',
                    color: '#A9F2EA',
                    background: mulliganMode ? 'linear-gradient(180deg, #1A3A3D 0%, #0E2225 100%)' : undefined,
                  }}
                >
                  <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{t.mulliganBtn}</span>
                </button>
              )}

              <button
                type="button"
                disabled={!canOverload}
                onClick={onTriggerOverload}
                title={t.overloadBtn}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-45 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: state.overloadUsedThisTurn ? '#C94A38' : '#4E9F97',
                  color: state.overloadUsedThisTurn ? '#FFB2A6' : '#A9F2EA',
                  background: state.overloadUsedThisTurn
                    ? 'linear-gradient(180deg, #4B1D1A 0%, #2B100E 100%)'
                    : undefined,
                }}
              >
                <Zap className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{state.overloadUsedThisTurn ? t.overloadActive : t.overloadShort}</span>
              </button>

              <button
                type="button"
                disabled={!isPlayerTurnReady || state.playerHand.length === 0}
                onClick={onToggleAltar}
                title={t.altarBtn}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-45 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: state.altarMode ? '#FFE29A' : '#8C6C36',
                  color: state.altarMode ? '#FFE7AE' : '#EAD9BD',
                  background: state.altarMode
                    ? 'linear-gradient(180deg, #4C381C 0%, #2A1F10 100%)'
                    : undefined,
                }}
              >
                <Flame className="h-3 w-3 shrink-0 text-[#E2B354]" aria-hidden="true" />
                <span>{t.altarShort}</span>
              </button>

              <button
                type="button"
                disabled={!isPlayerTurnReady || state.leapUsedThisTurn}
                onClick={onTriggerLeap}
                title={t.leapPulseBtn}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-45 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: state.leapUsedThisTurn ? '#4A4352' : '#4E9F97',
                  color: '#BFF6F0',
                }}
              >
                <Sparkles className="h-3 w-3 shrink-0 text-[#66DDD2]" aria-hidden="true" />
                <span>{t.leapShort}</span>
              </button>

              <button
                type="button"
                data-swap-btn="true"
                disabled={!canSwap}
                onClick={onToggleSwapMode}
                title={t.swapBtn}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-40 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: swapMode ? '#FFE29A' : '#8C6C36',
                  color: swapMode ? '#FFE8AE' : '#EAD9BD',
                  background: swapMode ? 'linear-gradient(180deg, #4C381C 0%, #2A1F10 100%)' : undefined,
                }}
              >
                <ArrowLeftRight className="h-3 w-3 shrink-0 text-[#E2B354]" aria-hidden="true" />
                <span>{t.swapBtn}</span>
              </button>

              {hasAnyPlayerCreature && hasAffordableCreature && (
                <button
                  type="button"
                  data-ascend-btn="true"
                  disabled={!isPlayerTurnReady}
                  onClick={onToggleAscendMode}
                  title={t.ascendHint}
                  className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-40 whitespace-nowrap ${
                    isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                  }`}
                  style={{
                    borderColor: ascendMode ? '#FFE29A' : '#9E7835',
                    color: ascendMode ? '#FFE8AE' : '#F0C86E',
                    background: ascendMode ? 'linear-gradient(180deg, #4C381C 0%, #2A1F10 100%)' : undefined,
                  }}
                >
                  <Crown className="h-3 w-3 shrink-0 text-[#E8BC5E]" aria-hidden="true" />
                  <span>{t.ascendTag}</span>
                </button>
              )}
            </>
          );

          const archonPowers = (
            <>
              <button
                type="button"
                data-chrono-btn="true"
                disabled={!canChronoRewind}
                onClick={onTriggerChronoRewind}
                title={t.chronoRewindDesc}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-45 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: state.chronoRewindUsed
                    ? '#4A4352'
                    : state.lastLostAlly
                      ? '#FFE29A'
                      : '#5EC8BE',
                  color: state.chronoRewindUsed
                    ? '#988EA3'
                    : state.lastLostAlly
                      ? '#FFE8AE'
                      : '#A9F2EA',
                  background:
                    !state.chronoRewindUsed && state.lastLostAlly
                      ? 'linear-gradient(180deg, #3C2F18 0%, #21190D 100%)'
                      : undefined,
                }}
              >
                <RotateCcw className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{state.chronoRewindUsed ? t.chronoRewindSpent : t.chronoRewindShort}</span>
                {!state.chronoRewindUsed && state.lastLostAlly && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFE29A]" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                data-tether-btn="true"
                disabled={!canSoulTether}
                onClick={onTriggerSoulTether}
                title={t.soulTetherDesc}
                className={`stone-btn font-body inline-flex items-center gap-1 font-bold disabled:opacity-45 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2 py-1 text-[11px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={{
                  borderColor: state.soulTetherActive
                    ? '#7BE6DB'
                    : state.soulTetherCooldown > 0
                      ? '#4A4352'
                      : '#5EC8BE',
                  color: state.soulTetherActive ? '#BFFBF5' : '#A9F2EA',
                  background: state.soulTetherActive
                    ? 'linear-gradient(180deg, #17393E 0%, #0D2226 100%)'
                    : undefined,
                }}
              >
                <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>
                  {state.soulTetherActive
                    ? t.soulTetherActive
                    : state.soulTetherCooldown > 0
                      ? `${t.soulTetherShort} (${t.soulTetherCooldownTag} ${state.soulTetherCooldown})`
                      : t.soulTetherShort}
                </span>
              </button>

              <button
                type="button"
                data-resonance-btn="true"
                disabled={!canResonance}
                onClick={onTriggerResonance}
                title={t.resonanceDescBySchool[state.playerSchool]}
                className={`${
                  canResonance ? 'gold-cta-btn gold-cta-ready font-display uppercase tracking-wider' : 'stone-btn font-body'
                } inline-flex items-center gap-1.5 font-bold disabled:opacity-60 whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2 py-1 text-[10.5px]' : 'min-h-[30px] px-2 py-0.5 text-[10.5px]'
                }`}
                style={
                  canResonance
                    ? undefined
                    : {
                        borderColor: state.playerResonance >= 5 ? '#FFE29A' : '#6A5B82',
                        color: '#E6D9F5',
                      }
                }
              >
                <Orbit className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>
                  {state.playerResonance >= 5
                    ? t.resonanceReadyBySchool[state.playerSchool]
                    : t.resonanceShort}
                </span>
                {state.playerResonance < 5 && (
                  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((pip) => (
                      <span
                        key={pip}
                        className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                          pip < state.playerResonance
                            ? 'bg-[#7BE6DB] shadow-[0_0_5px_rgba(123,230,219,0.9)]'
                            : 'bg-[#3A3244]'
                        }`}
                      />
                    ))}
                  </span>
                )}
              </button>

              {canUltimatum && (
                <button
                  type="button"
                  onClick={onTriggerUltimatum}
                  title={t.ultimatumBySchool[state.playerSchool]}
                  className={`stone-btn font-display inline-flex items-center gap-1 border-[#FF7E6B] font-bold uppercase tracking-wider text-[#FFD2CA] whitespace-nowrap ${
                    isCompact ? 'min-h-[34px] px-2.5 py-1 text-[10.5px]' : 'min-h-[30px] px-2 py-0.5 text-[10px]'
                  }`}
                  style={{
                    background: 'linear-gradient(180deg, #5C1D1B 0%, #340F10 100%)',
                  }}
                >
                  <Crown className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{t.ultimatumBtn}</span>
                </button>
              )}
            </>
          );

          const vitalsCluster = (
            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className={`${
                  isOverloaded ? 'stone-panel-overload' : 'stone-panel'
                } font-num flex items-center gap-2 px-2.5 py-1.5 text-xs ${
                  isCompact ? 'min-h-[34px]' : 'min-h-[44px] gap-2.5 px-3'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-[9.5px] font-semibold uppercase tracking-wider text-[#C8A35E]">
                      {t.hp}
                    </span>
                    <strong className="text-[11px] text-[#FBF2E1] lg:text-[13px]">
                      {state.playerHp}/{state.playerMaxHp}
                    </strong>
                  </div>
                  {!isShortLandscape && (
                    <div className="h-1.5 w-14 overflow-hidden border border-[#3B5956] bg-[#0F1718] p-[1px] sm:w-20">
                      <div className="relative h-full w-full">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#FFF0D1]/85 transition-all duration-700 ease-out"
                          style={{ width: `${playerTrailPct}%` }}
                        />
                        <div
                          className="relative h-full transition-all duration-200"
                          style={{
                            width: `${playerHpPct}%`,
                            background: 'linear-gradient(90deg, #2D7D75 0%, #5EC8BE 65%, #9BF7EE 100%)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-5 w-[1px] bg-[#A67F38]/40 sm:h-6" aria-hidden="true" />

                <div className="flex flex-col gap-0.5 leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-[#C8A35E]">
                      {t.ether}
                    </span>
                    <strong
                      className="text-[11px] sm:text-xs"
                      style={{ color: isOverloaded ? '#FF9482' : '#7EE6DC' }}
                    >
                      {state.playerEther}/{state.playerChannel}
                    </strong>
                  </div>
                  {!isShortLandscape && (
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {Array.from({ length: totalSockets }, (_, i) => {
                        const filled = i < state.playerEther;
                        const overloadGem = filled && i >= state.playerChannel;
                        return (
                          <span
                            key={i}
                            className={`inline-block h-2 w-2 rounded-full transition-all duration-200 ${
                              overloadGem
                                ? 'gem-socket-overload'
                                : filled
                                  ? 'gem-socket'
                                  : 'gem-socket-empty'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                data-deck-btn="true"
                onClick={() => setShowDeckModal((v) => !v)}
                title={t.deckRemainingTitle}
                className={`stone-btn font-num inline-flex items-center gap-1 font-bold text-[#EAD9BD] whitespace-nowrap ${
                  isCompact ? 'min-h-[34px] px-2 py-1 text-[11px]' : 'min-h-[44px] px-2.5 py-1 text-xs'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#E2B354]" aria-hidden="true" />
                <span>{state.playerDrawPile.length}</span>
              </button>
            </div>
          );

          const endTurnBtn = (
            <button
              type="button"
              disabled={!isPlayerTurnReady}
              onClick={onEndTurn}
              className={`gold-cta-btn shrink-0 ${
                isPlayerTurnReady && !hasAffordableCard ? 'gold-cta-ready' : ''
              } font-display inline-flex items-center justify-center gap-1.5 font-extrabold uppercase tracking-[0.1em] disabled:opacity-50 whitespace-nowrap ${
                isCompact ? 'min-h-[34px] px-2.5 py-1 text-[11px]' : 'min-h-[44px] w-full px-4 py-1 text-xs'
              }`}
            >
              <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {resolvingTurn
                  ? t.combatResolvingLabel
                  : state.phase === 'player_main'
                    ? isCompact
                      ? t.endTurnShort
                      : t.endTurn
                    : t.enemyTurn}
              </span>
            </button>
          );

          const desktopHandCount = state.playerHand.length;
          const desktopCardW = viewport.w >= 1380 ? 148 : viewport.w >= 1200 ? 138 : 118;
          const desktopSideReservedW = viewport.w >= 1280 ? 596 : 536;
          const desktopAvailHandW = Math.max(300, viewport.w - desktopSideReservedW);
          const desktopRawHandW = desktopHandCount * desktopCardW + Math.max(0, desktopHandCount - 1) * 8;
          const desktopOverlapPx =
            !isCompact && desktopHandCount > 1 && desktopRawHandW > desktopAvailHandW
              ? Math.min(44, Math.ceil((desktopRawHandW - desktopAvailHandW) / (desktopHandCount - 1)) + 8)
              : 0;

          const tarotHand = (
            <div
              className={`no-scrollbar pointer-events-auto flex w-full px-1 ${
                isCompact
                  ? 'max-w-5xl items-stretch gap-1.5 overflow-x-auto sm:gap-2'
                  : 'items-end justify-center gap-2 overflow-visible pt-2 pb-0.5'
              } ${
                isCompact && (isNarrowPhone ? state.playerHand.length <= 3 : state.playerHand.length <= 4)
                  ? 'justify-center'
                  : isCompact
                    ? 'justify-start'
                    : ''
              } ${
                isShortLandscape ? 'pt-0.5 pb-0' : isCompact ? 'pt-1 pb-0.5' : ''
              }`}
              onMouseLeave={() => {
                setHoveredIdx(null);
                setCardTilt(null);
                onHoverCard(null);
              }}
            >
              {state.playerHand.map((cardId, idx) => {
                const card = CARD_CATALOG[cardId];
                if (!card) return null;
                const eff = getCardEffectiveStats(card.id, state.forgedCards);
                const affordable = mulliganMode || state.altarMode || state.playerEther >= eff.cost;
                const isSelected = mulliganMode ? mulliganSelected.includes(idx) : selectedHandIndex === idx;
                const name = t.cardNames[card.id] ?? card.id;
                const rule = t.cardRules[card.id] ?? '';

                const count = state.playerHand.length;
                const offset = count > 1 ? idx - (count - 1) / 2 : 0;
                const fanRot = isCompact ? '0deg' : `${(offset * 1.7).toFixed(2)}deg`;
                const fanY = isCompact ? '0px' : `${(Math.abs(offset) * Math.abs(offset) * 1.9).toFixed(1)}px`;
                const activeTilt = cardTilt?.idx === idx ? cardTilt : null;
                const isFocusedOrHovered = hoveredIdx === idx || isSelected;

                return (
                  <button
                    key={`${card.id}-${idx}`}
                    type="button"
                    data-selected={isSelected ? 'true' : 'false'}
                    disabled={!isPlayerTurnReady || !affordable}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredIdx(idx);
                      onHoverCard(idx, { x: rect.left + rect.width * 0.5, y: rect.top + 8 });
                    }}
                    onMouseMove={(e) => {
                      if (isCompact || graphicsLevel < GRAPHICS_LEVEL.ultra) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
                      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
                      setCardTilt({
                        idx,
                        rx: Number((-ny * 7.5).toFixed(2)),
                        ry: Number((nx * 9.5).toFixed(2)),
                        gx: Math.round(nx * 55),
                      });
                    }}
                    onMouseLeave={() => {
                      setCardTilt((prev) => (prev?.idx === idx ? null : prev));
                    }}
                    onFocus={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredIdx(idx);
                      onHoverCard(idx, { x: rect.left + rect.width * 0.5, y: rect.top + 8 });
                    }}
                    onBlur={() => {
                      setHoveredIdx((prev) => (prev === idx ? null : prev));
                      setCardTilt((prev) => (prev?.idx === idx ? null : prev));
                      onHoverCard(null);
                    }}
                    onClick={(e) => {
                      if (mulliganMode) {
                        setMulliganSelected((prev) =>
                          prev.includes(idx)
                            ? prev.filter((i) => i !== idx)
                            : prev.length < 3
                              ? [...prev, idx]
                              : prev
                        );
                        return;
                      }
                      const rect = e.currentTarget.getBoundingClientRect();
                      const launchPt = { x: rect.left + rect.width * 0.5, y: rect.top + 14 };
                      setHoveredIdx(null);
                      setCardTilt(null);
                      onHoverCard(null);
                      e.currentTarget.blur();
                      onSelectCard(idx, launchPt);
                    }}
                    className={`${
                      state.altarMode ? 'tarot-card-altar' : 'tarot-card'
                    } tarot-fan-item group relative flex shrink-0 flex-col justify-between text-left transition-transform duration-150 disabled:opacity-45 ${
                      isFocusedOrHovered ? 'z-30' : 'z-10'
                    } ${
                      isShortLandscape
                        ? 'min-h-[70px] w-[116px] px-1.5 py-[3px]'
                        : isNarrowPhone
                          ? 'min-h-[104px] w-[114px] p-1.5'
                          : isCompact
                            ? 'min-h-[108px] w-[124px] p-2'
                            : 'h-[126px] p-2 xl:h-[132px] xl:p-2.5'
                    }`}
                    style={
                      {
                        width: isCompact ? undefined : `${desktopCardW}px`,
                        marginLeft: !isCompact && idx > 0 && desktopOverlapPx > 0 ? `-${desktopOverlapPx}px` : undefined,
                        '--fan-rot': fanRot,
                        '--fan-y': fanY,
                        '--tilt-x': activeTilt ? `${activeTilt.rx}deg` : '0deg',
                        '--tilt-y': activeTilt ? `${activeTilt.ry}deg` : '0deg',
                        '--glare-x': activeTilt ? `${activeTilt.gx}%` : undefined,
                        borderColor: isSelected
                          ? '#7BE6DB'
                          : state.altarMode
                            ? '#D95843'
                            : eff.forgeTier > 0 && affordable
                              ? '#FFE29A'
                              : affordable
                                ? '#B88D44'
                                : '#47404E',
                      } as CSSProperties
                    }
                  >
                    <StoneCorners
                      color={isSelected ? '#7BE6DB' : state.altarMode ? '#FF8E7A' : affordable ? '#E2B354' : '#5E5566'}
                    />
                    {mulliganMode && isSelected && (
                      <span className="font-display absolute -top-2 left-1/2 z-20 -translate-x-1/2 border border-[#7BE6DB] bg-[#0F2C30] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-[#A9F2EA]">
                        {t.mulliganReplaceTag}
                      </span>
                    )}

                    <div className="relative z-10">
                      <div
                        className={`flex items-center justify-between gap-1 border-b border-[#A67F38]/35 ${
                          isShortLandscape ? 'pb-[2px]' : 'pb-0.5 sm:pb-1'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <SchoolIcon school={card.school} />
                          <span className="font-display truncate text-[8px] font-semibold uppercase tracking-[0.06em] text-[#C8A35E] sm:text-[9px] sm:tracking-[0.1em]">
                            {cardTypeTag(card, t)}
                          </span>
                        </div>
                        <span
                          className={`font-num flex shrink-0 items-center justify-center rounded-full font-extrabold ${
                            isShortLandscape ? 'h-3.5 w-3.5 text-[9.5px]' : 'h-5 w-5 text-[11px]'
                          } ${
                            affordable ? 'gem-socket text-[#0B1C1B]' : 'border border-[#555] bg-[#1A181F] text-[#888]'
                          } ${eff.cost < card.cost ? 'ring-1 ring-[#FFE29A]' : ''}`}
                        >
                          {eff.cost}
                        </span>
                      </div>

                      <h3
                        className={`font-display truncate font-bold text-[#FBF2E1] ${
                          isShortLandscape ? 'mt-[2px] text-[10.5px] leading-tight' : 'mt-1 text-xs sm:text-[12.5px]'
                        }`}
                      >
                        {name}
                        {eff.forgeTier > 0 && (
                          <span className="ml-1 text-[#FFE29A]">{'★'.repeat(eff.forgeTier)}</span>
                        )}
                      </h3>

                      <p
                        className={`font-body text-[#D6C9B5] ${
                          isShortLandscape
                            ? 'mt-[1px] line-clamp-1 text-[8.5px] leading-[11px]'
                            : isCompact
                              ? 'mt-0.5 line-clamp-2 text-[9.5px] leading-snug'
                              : 'mt-0.5 line-clamp-2 text-[10px] leading-snug'
                        }`}
                      >
                        {rule}
                      </p>
                    </div>

                    <div
                      className={`font-num relative z-10 flex items-center justify-between border-t border-[#A67F38]/35 font-bold ${
                        isShortLandscape ? 'mt-[2px] pt-[2px] text-[9.5px] leading-none' : 'pt-1 text-[10.5px]'
                      }`}
                    >
                      {card.atk !== undefined && card.hp !== undefined ? (
                        <>
                          <span
                            className={`inline-flex items-center gap-1 border border-[#9E7835] bg-[#16131B] text-[#F0C86E] ${
                              isShortLandscape ? 'px-1 py-[1px]' : 'px-1.5 py-0.5'
                            }`}
                          >
                            <Swords className="h-2.5 w-2.5" aria-hidden="true" />
                            {eff.atk}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 border border-[#448D85] bg-[#121D1E] text-[#85EDE3] ${
                              isShortLandscape ? 'px-1 py-[1px]' : 'px-1.5 py-0.5'
                            }`}
                          >
                            <Heart className="h-2.5 w-2.5" aria-hidden="true" />
                            {eff.hp}
                          </span>
                        </>
                      ) : (
                        <span
                          className={`font-display ml-auto font-semibold uppercase tracking-[0.12em] text-[#C8A35E] ${
                            isShortLandscape ? 'text-[8.5px] leading-tight' : 'text-[9.5px]'
                          }`}
                        >
                          {eff.forgeTier > 0 && card.spellEffect && eff.spellAmount > card.spellEffect.amount
                            ? `${cardTypeTag(card, t)} +${eff.spellAmount - card.spellEffect.amount}`
                            : cardTypeTag(card, t)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );

          if (isCompact) {
            return (
              <>
                <div
                  data-tactical-bar="true"
                  className="pointer-events-auto flex w-full flex-nowrap items-center justify-between gap-1"
                >
                  {vitalsCluster}
                  <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                    {turnTactics}
                    {archonPowers}
                  </div>
                  {endTurnBtn}
                </div>
                {tarotHand}
              </>
            );
          }

          return (
            <div
              data-tactical-bar="true"
              className="pointer-events-none flex w-full items-end justify-between gap-3"
            >
              {/* Bottom-Left Corner: Turn Tactics + Player Vitals & Deck */}
              <div className="pointer-events-auto flex w-[250px] shrink-0 flex-col items-start gap-1.5 xl:w-[276px]">
                <div className="flex flex-wrap items-center gap-1">{turnTactics}</div>
                {vitalsCluster}
              </div>

              {/* Bottom-Center: Tarot Hand Hugging Bottom Edge */}
              <div className="flex min-w-0 flex-1 justify-center overflow-visible">{tarotHand}</div>

              {/* Bottom-Right Corner: Archon Powers + Strike & End Turn */}
              <div className="pointer-events-auto flex w-[236px] shrink-0 flex-col items-end gap-1.5 xl:w-[262px]">
                <div className="flex flex-wrap items-center justify-end gap-1">{archonPowers}</div>
                {endTurnBtn}
              </div>
            </div>
          );
        })()}
      </footer>
    </div>
  );
}

