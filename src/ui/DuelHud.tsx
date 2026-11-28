import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeftRight,
  Camera,
  Circle,
  Contrast,
  Crown,
  Disc3,
  Droplet,
  Eye,
  EyeOff,
  Flame,
  Gauge,
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
  SlidersHorizontal,
  Sparkles,
  Swords,
  Triangle,
  UserCheck,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { GRAPHICS_LEVEL, type GraphicsQuality } from '../core/graphicsSettings';
import { CARD_CATALOG, type CardDef } from '../game/cards';
import {
  computeBoardCombatPreview,
  computeEnemyIntent,
  getCardEffectiveStats,
  getOpponentForStage,
  type DuelState,
} from '../game/duelEngine';
import { computeNetThreatDelta, evaluateCardPlayAffordance } from '../game/tacticalPreview';
import { useAutoHide } from '../hooks/useAutoHide';
import type { TranslationPack } from '../i18n/translations';
import type { MagicSchool } from '../view/assets/creatureTotems';
import type {
  ArchonPowerHoverKind,
  CameraPreset,
  HoverTargetInfo,
  ProjectedBadge,
  ProjectedLaneRune,
  WorldPromptInfo,
} from '../view/duelScene';
import { ArenaMinimap } from './ArenaMinimap';
import { HUD } from './HUD';
import {
  ARCANE_PATTERNS,
  computeArcStroke,
  computeComposureDrops,
  pickRadialSector,
  type ArcanePatternId,
} from './hudLogic';
import { useHudSettings } from './HudSettingsContext';
import type { RadialArcanaAction } from './MobileControls';
import { MusicCarousel } from './MusicCarousel';
import { QuestTracker } from './QuestTracker';
import { RadialMenu } from './RadialMenu';
import { SilkBar } from './SilkBar';
import { StoneCorners } from './StoneOrnament';
import { WorldPrompt } from './WorldPrompt';

export interface CardAnchorPoint {
  x: number;
  y: number;
}

interface DuelHudProps {
  t: TranslationPack;
  state: DuelState;
  badges: ProjectedBadge[];
  laneRunes?: ProjectedLaneRune[];
  worldPrompts?: WorldPromptInfo[];
  hoverTarget: HoverTargetInfo | null;
  preset: CameraPreset;
  selectedHandIndex: number | null;
  swapMode: boolean;
  swapSourceLane: number | null;
  ascendMode: boolean;
  isTargetingSpell?: boolean;
  resolvingTurn?: boolean;
  rivalCallout?: string | null;
  rivalCombatQuip?: string | null;
  graphicsLevel: number;
  graphics?: GraphicsQuality;
  fastCombat?: boolean;
  hoverInspector?: boolean;
  muted: boolean;
  isFullscreen: boolean;
  isMobile?: boolean;
  onSelectPreset: (p: CameraPreset) => void;
  onSelectGraphics?: (q: GraphicsQuality) => void;
  onToggleFastCombat?: () => void;
  onToggleHoverInspector?: () => void;
  onTriggerPattern?: (pattern: ArcanePatternId) => void;
  onSelectCard: (handIndex: number, anchor?: CardAnchorPoint) => void;
  onHoverCard: (handIndex: number | null, anchor?: CardAnchorPoint) => void;
  onHoverPower?: (kind: ArchonPowerHoverKind | null) => void;
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
  laneRunes = [],
  worldPrompts = [],
  hoverTarget,
  preset,
  selectedHandIndex,
  swapMode,
  swapSourceLane,
  ascendMode,
  isTargetingSpell = false,
  resolvingTurn = false,
  rivalCallout = null,
  rivalCombatQuip = null,
  graphicsLevel,
  graphics,
  fastCombat,
  hoverInspector,
  muted,
  isFullscreen,
  isMobile,
  onSelectPreset,
  onSelectGraphics,
  onToggleFastCombat,
  onToggleHoverInspector,
  onTriggerPattern,
  onSelectCard,
  onHoverCard,
  onHoverPower,
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
  const {
    uiScale,
    setUiScale,
    isHighContrast,
    toggleHighContrast,
    selectedPattern,
    selectPattern,
  } = useHudSettings();
  const patternAutoHide = useAutoHide(1500);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [cardTilt, setCardTilt] = useState<{ idx: number; rx: number; ry: number; gx: number } | null>(null);
  const [mulliganMode, setMulliganMode] = useState(false);
  const [mulliganSelected, setMulliganSelected] = useState<number[]>([]);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showMusicDrawer, setShowMusicDrawer] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [radialMenu, setRadialMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    activeSector: ArcanePatternId | null;
  }>({ open: false, x: 420, y: 320, activeSector: null });

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const onHoverCardRef = { current: onHoverCard };
  const lastMouseRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.48 : 360,
  });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isShortLandscape = viewport.h <= 540;
  const isCompact = Boolean(isMobile) || viewport.w < 1024 || isShortLandscape;
  const isNarrowPhone = viewport.w < 640;
  const composureDrops = computeComposureDrops(state.playerHp, state.playerMaxHp);
  const playerSilkValue = Math.round((state.playerHp / Math.max(1, state.playerMaxHp)) * 160);

  // Desktop Radial Menu (Hold Q or Tab) & Auto-Hiding Pattern Bar (Keys 1-4)
  useEffect(() => {
    if (isCompact) return;

    const triggerQuickPattern = (pattern: ArcanePatternId) => {
      selectPattern(pattern);
      onTriggerPattern?.(pattern);
      patternAutoHide.trigger();
    };

    const onMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setRadialMenu((prev) => {
        if (!prev.open) return prev;
        const sector = pickRadialSector(e.clientX - prev.x, e.clientY - prev.y);
        if (sector === prev.activeSector) return prev;
        return { ...prev, activeSector: sector };
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT')) return;
      if (showDeckModal) return;

      const lower = e.key.toLowerCase();
      if ((lower === 'q' || e.key === 'Tab') && !e.repeat) {
        e.preventDefault();
        const cx = Math.max(124, Math.min(window.innerWidth - 124, lastMouseRef.current.x));
        const cy = Math.max(124, Math.min(window.innerHeight - 124, lastMouseRef.current.y));
        setRadialMenu({ open: true, x: cx, y: cy, activeSector: null });
        return;
      }

      if (e.key === '1') triggerQuickPattern('triangle');
      else if (e.key === '2') triggerQuickPattern('star');
      else if (e.key === '3') triggerQuickPattern('circle');
      else if (e.key === '4') triggerQuickPattern('decoy');
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase();
      if (lower !== 'q' && e.key !== 'Tab') return;
      setRadialMenu((prev) => {
        if (!prev.open) return prev;
        const chosen = prev.activeSector ?? selectedPattern;
        selectPattern(chosen);
        onTriggerPattern?.(chosen);
        patternAutoHide.trigger();
        return { ...prev, open: false, activeSector: null };
      });
    };

    const onWindowBlur = () => {
      setRadialMenu((prev) => (prev.open ? { ...prev, open: false, activeSector: null } : prev));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [isCompact, showDeckModal, selectedPattern, selectPattern, onTriggerPattern, patternAutoHide]);

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
  const strikePreview = computeBoardCombatPreview(state);

  const isPlayerTurnReady = state.phase === 'player_main' && !resolvingTurn;
  const isOverloaded = state.overloadUsedThisTurn || state.ultimatumActive;
  const hasAffordableCard = state.playerHand.some((id) => {
    const c = CARD_CATALOG[id];
    if (!c) return false;
    const effCost = getCardEffectiveStats(id, state.forgedCards, state.trialModifier).cost;
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
    const effCost = getCardEffectiveStats(id, state.forgedCards, state.trialModifier).cost;
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
    ? getCardEffectiveStats(selectedHandCard.id, state.forgedCards, state.trialModifier)
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
      getCardEffectiveStats(a[0], state.forgedCards, state.trialModifier).cost -
      getCardEffectiveStats(b[0], state.forgedCards, state.trialModifier).cost
  );

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
    <div
      data-hud-root="true"
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between"
      style={{ '--ui-scale': uiScale } as CSSProperties}
    >
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

      {/* Desktop Hold Q / Tab Radial Pattern Wheel */}
      {!isCompact && (
        <RadialMenu
          open={radialMenu.open}
          centerX={radialMenu.x}
          centerY={radialMenu.y}
          activeSector={radialMenu.activeSector}
          selectedPattern={selectedPattern}
          labels={t.patterns}
          onHoverSector={(sector) => setRadialMenu((prev) => ({ ...prev, activeSector: sector }))}
          onSelectSector={(sector) => {
            selectPattern(sector);
            onTriggerPattern?.(sector);
            patternAutoHide.trigger();
            setRadialMenu((prev) => ({ ...prev, open: false, activeSector: null }));
          }}
        />
      )}

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
                    const eff = getCardEffectiveStats(id, state.forgedCards, state.trialModifier);
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
          <div className="round-scroll-ribbon px-7 py-2 text-center">
            <div className="font-display relative z-10 text-xs font-extrabold uppercase tracking-[0.26em] text-[#FFE59F] sm:text-sm">
              ✧ {t.round} {roundBanner.round} ✧
            </div>
            <div className="font-body relative z-10 mt-0.5 text-[11px] text-[#E6D9C5]">
              {anomalyInfo.name}
            </div>
          </div>
        </div>
      )}
      {/* Projected 3D ATK / HP Medallions + World-Anchored Lane Runes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {(() => {
          const minRx = isCompact ? 54 : 72;
          const maxRx = Math.max(minRx + 10, viewport.w - (isCompact ? 54 : 72));
          const minRy = isShortLandscape ? 64 : isCompact ? 118 : 96;
          const stepRx = isCompact ? 116 : 138;
          const stepRy = 22;
          const placedRunes = laneRunes
            .map((r) => ({
              ...r,
              x: Math.max(minRx, Math.min(maxRx, r.x)),
              y: Math.max(minRy, r.y),
            }))
            .sort((a, b) => a.x - b.x);
          for (let i = 0; i < placedRunes.length; i++) {
            for (let pass = 0; pass < 3; pass++) {
              const clash = placedRunes
                .slice(0, i)
                .some(
                  (prev) =>
                    Math.abs(prev.x - placedRunes[i].x) < stepRx &&
                    Math.abs(prev.y - placedRunes[i].y) < stepRy
                );
              if (!clash) break;
              placedRunes[i].y = Math.max(minRy, placedRunes[i].y - stepRy);
            }
          }
          return placedRunes.map((r) => {
            const toneClass =
              r.kind === 'aegis'
                ? 'border-[#5EC8BE]/55 text-[#9AF3EA]'
                : r.kind === 'surge'
                  ? 'border-[#E2B354]/55 text-[#FFE59F]'
                  : 'border-[#E58458]/55 text-[#FFC5AA]';
            return (
              <div
                key={`world-rune-${r.side}-${r.lane}`}
                data-world-rune={`${r.side}:${r.lane}:${r.kind}`}
                title={t.laneRuneDescs[r.kind]}
                className={`frosted-obsidian font-display pointer-events-none flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider shadow-[0_8px_20px_rgba(0,0,0,0.72)] whitespace-nowrap ${toneClass}`}
                style={{ position: 'absolute', left: `${Math.round(r.x)}px`, top: `${Math.round(r.y)}px` }}
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  <span>{t.laneRuneNames[r.kind]}</span>
                </div>
                <span className="font-body text-[8.5px] font-normal normal-case tracking-normal text-[#DFD3C1]">
                  {t.laneRuneDescs[r.kind]}
                </span>
              </div>
            );
          });
        })()}
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
        {worldPrompts.map((wp) => (
          <WorldPrompt
            key={wp.id}
            id={wp.id}
            x={wp.x}
            y={wp.y}
            text={wp.kind === 'leap' ? t.worldPromptLeap : t.worldPromptPlay}
            viewportW={viewport.w}
            viewportH={viewport.h}
          />
        ))}
      </div>

      {/* Top Arena Perimeter HUD */}
      <header
        className={`flex items-start justify-between gap-2 ${
          isShortLandscape ? 'px-2 pt-1' : 'flex-wrap p-2 sm:px-4 sm:pt-3'
        }`}
      >
        {/* Top-Left (Stats & Quest): Silk Bar, 3 Composure Droplets, Typewriter Quest Tracker + Enemy Medallion */}
        <div
          className="flex min-w-0 flex-col items-start gap-1.5"
          style={
            !isCompact
              ? { transform: 'scale(var(--ui-scale, 1))', transformOrigin: 'top left' }
              : undefined
          }
        >
          {/* Archon Silk, Composure & Quest Card */}
          <div
            data-player-status-hud="true"
            className={`frosted-obsidian pointer-events-auto flex flex-col gap-1.5 rounded-xl border-[#D6A856]/40 ${
              isShortLandscape
                ? 'w-[144px] px-2 py-1'
                : isCompact
                  ? 'w-[172px] px-2.5 py-1.5'
                  : 'w-[244px] px-3 py-2'
            }`}
          >
            <SilkBar
              silk={playerSilkValue}
              maxSilk={160}
              label={isShortLandscape ? undefined : t.silkLabel}
              compact={isShortLandscape}
            />
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-[#C8A35E] drop-shadow-md"
                style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.92)' }}
              >
                {t.composureLabel}
              </span>
              <div className="flex items-center gap-1" data-composure-drops={composureDrops}>
                {[1, 2, 3].map((slot) => {
                  const active = slot <= composureDrops;
                  return (
                    <Droplet
                      key={slot}
                      className={`h-3.5 w-3.5 transition-all duration-300 ${
                        active
                          ? 'fill-cyan-300/80 text-cyan-200 drop-shadow-[0_0_6px_rgba(34,211,238,0.85)]'
                          : 'text-white/25'
                      }`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            </div>
            {state.activeQuest && !isShortLandscape && (
              <QuestTracker
                questId={state.activeQuest.id}
                title={t.questTitles[state.activeQuest.id]}
                description={t.questDescs[state.activeQuest.id] ?? ''}
                progress={state.activeQuest.progress}
                target={state.activeQuest.target}
                completed={state.activeQuest.completed}
                bonusXp={state.activeQuest.bonusXp}
                completedTag={t.questCompletedTag}
                compact={isCompact}
              />
            )}
          </div>

          {/* Borderless Compact Rival Crest with Integrated Arc HP & Ether */}
          {(() => {
            const hpArc = computeArcStroke(state.enemyHp, state.enemyMaxHp, 163.36, 0.78);
            const etherArc = computeArcStroke(
              state.enemyEther,
              Math.max(1, state.enemyChannel),
              125.66,
              0.78
            );
            return (
              <div
                data-enemy-crest="true"
                className={`pointer-events-auto flex items-center bg-transparent border-0 shadow-none ${
                  isShortLandscape
                    ? 'max-w-[154px] gap-1.5 px-0.5 py-0'
                    : isCompact
                      ? 'max-w-[168px] gap-1.5 px-0.5 py-0'
                      : 'max-w-[190px] gap-2 px-0.5 py-0'
                }`}
                style={{
                  textShadow: '0 1px 6px rgba(0, 0, 0, 0.98), 0 0 10px rgba(0, 0, 0, 0.85)',
                }}
              >
                {/* Left: Hexagonal Emblem + Arc HP & Ether Ring + 2-Line Name Underneath */}
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className={`relative flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                      isShortLandscape ? 'h-9 w-9' : isCompact ? 'h-10 w-10' : 'h-11 w-11'
                    }`}
                  >
                    <svg
                      viewBox="0 0 64 64"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <g transform="rotate(130 32 32)">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          fill="none"
                          stroke="rgba(226, 179, 84, 0.24)"
                          strokeWidth="3.8"
                          strokeDasharray={hpArc.dasharray}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          fill="none"
                          stroke="url(#rivalHpGrad)"
                          strokeWidth="3.8"
                          strokeDasharray={hpArc.dasharray}
                          strokeDashoffset={hpArc.dashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 240ms ease' }}
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="20"
                          fill="none"
                          stroke="rgba(102, 221, 210, 0.22)"
                          strokeWidth="2.8"
                          strokeDasharray={etherArc.dasharray}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="20"
                          fill="none"
                          stroke="#66DDD2"
                          strokeWidth="2.8"
                          strokeDasharray={etherArc.dasharray}
                          strokeDashoffset={etherArc.dashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 240ms ease' }}
                        />
                      </g>
                      <defs>
                        <linearGradient id="rivalHpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#D89844" />
                          <stop offset="100%" stopColor="#FFE599" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      className={`hex-crest-emblem relative z-10 flex items-center justify-center border border-[#E5B85B]/45 ${
                        isShortLandscape ? 'h-5.5 w-5.5' : 'h-6.5 w-6.5'
                      }`}
                    >
                      <SchoolIcon school={opponentDef.school} />
                    </div>
                  </div>
                  <div
                    className={`font-display mt-0.5 line-clamp-2 break-words text-center font-bold leading-[1.1] tracking-wide text-[#FBF2E1] ${
                      isShortLandscape ? 'max-w-[54px] text-[8.5px]' : 'max-w-[64px] text-[9.5px]'
                    }`}
                    title={enemyName}
                  >
                    {enemyName}
                  </div>
                </div>

                {/* Right: Compact Stage, Numerics, and Intent */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {!isShortLandscape && (
                    <div className="font-display text-[8px] font-semibold uppercase tracking-[0.12em] text-[#E6C27A]">
                      {t.enemyPrefix} · {state.stageIndex + 1}/7
                    </div>
                  )}

                  <div className="font-num flex items-center gap-1.5 text-[10.5px] sm:text-[11px]">
                    <span className="inline-flex items-center gap-0.5 text-[#FFE59F]">
                      <Heart className="h-2.5 w-2.5 text-[#E5B85B]" aria-hidden="true" />
                      <strong>
                        {state.enemyHp}/{state.enemyMaxHp}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[#85EDE3]">
                      <Sparkles className="h-2.5 w-2.5 text-[#66DDD2]" aria-hidden="true" />
                      <strong>{state.enemyEther}</strong>
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between gap-1 text-[9.5px]"
                    aria-label={t.intentLabel}
                  >
                    <div className="flex min-w-0 items-center gap-1 truncate">
                      <Swords
                        className={`h-2.5 w-2.5 shrink-0 ${
                          intent.directDemiurgeDmg > 0 ? 'text-[#FF9E8D]' : 'text-[#E8BC5E]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-num truncate font-bold text-[#FBF2E1]">
                        {intent.totalIncomingDmg > 0 ? (
                          <>
                            {intent.directDemiurgeDmg > 0 && (
                              <span className="text-[#FFAC9C]">
                                {intent.directDemiurgeDmg} {t.intentDirect}
                              </span>
                            )}
                            {intent.directDemiurgeDmg > 0 && intent.boardCreatureDmg > 0 && (
                              <span className="mx-0.5 text-[#7D7588]">·</span>
                            )}
                            {intent.boardCreatureDmg > 0 && (
                              <span className="text-[#F0C973]">
                                {intent.boardCreatureDmg} {t.intentClash}
                              </span>
                            )}
                          </>
                        ) : state.round === 1 && state.lastAiSummary === null ? (
                          <span className="text-[#E6DFD3]">{t.intentWaitingTurn}</span>
                        ) : state.lastAiSummary?.passedReason === 'board_full' ? (
                          <span className="text-[#E8BC5E]">{t.intentBoardFull}</span>
                        ) : state.lastAiSummary?.passedReason === 'saving_ether' ? (
                          <span className="text-[#D4C7B4]">{t.intentSavedEther}</span>
                        ) : (
                          <span className="text-[#D4C7B4]">0</span>
                        )}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {intent.playableCardsCount > 0 && (
                        <span className="font-num text-[9px] font-bold text-[#E5B85B]">
                          +{intent.playableCardsCount}
                        </span>
                      )}
                      {intent.mayOverload && (
                        <Zap className="h-2.5 w-2.5 shrink-0 text-[#FF9E8D]" aria-label={t.overloadBtn} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Enemy Enchantment / Ward / Boss Passive / Trial Micro-Tags */}
          {(state.enemyEnchantment || state.enemyTrap || bossPassiveId || state.trialModifier) && !isShortLandscape && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1">
              {state.trialModifier && (
                <span
                  data-trial-modifier={state.trialModifier}
                  title={t.dailyTrial.modifiers[state.trialModifier].desc}
                  className="frosted-obsidian inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#9BF3EA]"
                >
                  <Sparkles className="h-2.5 w-2.5 text-[#7BE6DB]" aria-hidden="true" />
                  <span>{t.dailyTrial.modifiers[state.trialModifier].name}</span>
                </span>
              )}
              {bossPassiveId && (
                <span
                  data-boss-passive="true"
                  title={t.bossPassiveDescs[bossPassiveId] ?? ''}
                  className="frosted-obsidian inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]"
                >
                  <Skull className="h-2.5 w-2.5 text-[#E5B85B]" aria-hidden="true" />
                  <span>{t.bossPassiveNames[bossPassiveId] ?? bossPassiveId}</span>
                </span>
              )}
              {state.enemyEnchantment && (
                <span
                  title={t.cardRules[state.enemyEnchantment] ?? ''}
                  className="frosted-obsidian inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#EAD9BD]"
                >
                  <Sparkles className="h-2.5 w-2.5 text-[#E5B85B]" aria-hidden="true" />
                  <span>{t.cardNames[state.enemyEnchantment] ?? state.enemyEnchantment}</span>
                </span>
              )}
              {state.enemyTrap && (
                <span className="frosted-obsidian inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#FFE29A]">
                  <Eye className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                  <span>? {t.trapSlot}</span>
                </span>
              )}
            </div>
          )}

          {/* Desktop 3D Hover Stat Inspector Docked in Top-Left Flank */}
          {!isCompact && renderHoverInspectorCard(true)}
        </div>

        {/* Floating Frosted Scroll / Arcane Barrier Round & Anomaly Crest */}
        <div
          className={`pointer-events-auto text-center transition-colors ${
            isOverloaded
              ? 'round-scroll-ribbon round-scroll-ribbon-overload'
              : 'round-scroll-ribbon'
          } ${
            isNarrowPhone
              ? 'order-3 w-full px-3 py-1'
              : isShortLandscape
                ? 'shrink-0 whitespace-nowrap px-4 py-0.5'
                : 'order-3 w-full px-6 py-1.5 md:order-none md:w-auto md:px-8 md:py-1.5'
          }`}
        >
          <h2
            className={`font-display font-bold uppercase text-[#FFE8B0] ${
              isShortLandscape
                ? 'text-[9.5px] tracking-[0.12em]'
                : 'text-[10.5px] tracking-[0.16em] sm:text-xs sm:tracking-[0.2em]'
            }`}
          >
            ✧ {t.round} {state.round} · {anomalyInfo.name} ✧
          </h2>
          {(!isCompact || state.altarMode) && (
            <p className="font-body hidden text-[11px] text-[#DED4C6] md:block">
              {state.altarMode ? t.altarActive : anomalyInfo.desc}
            </p>
          )}
        </div>

        {/* Top-Right System Menu + In-Game Music Mini-Player */}
        <div
          className="relative flex flex-col items-end gap-1"
          style={
            !isCompact
              ? { transform: 'scale(var(--ui-scale, 1))', transformOrigin: 'top right' }
              : undefined
          }
        >
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {!isCompact && <MusicCarousel t={t} variant="mini" />}

            <div className="hud-surface pointer-events-auto flex items-center gap-0.5 rounded-xl bg-black/70 p-0.5 shadow-[0_8px_22px_rgba(0,0,0,0.75)]">
              <button
                type="button"
                onClick={() => {
                  setShowCombatLog(false);
                  setShowMusicDrawer(false);
                  setShowSettingsMenu(false);
                  setShowCameraMenu((v) => !v);
                }}
                title={t.camCombat}
                aria-label={t.camCombat}
                aria-expanded={showCameraMenu}
                className={`inline-flex items-center gap-1 rounded-lg px-2 text-[#E2B354] transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white hover:shadow-[0_0_10px_rgba(226,179,84,0.35)] active:scale-95 ${
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

              {isCompact && (
                <button
                  type="button"
                  data-music-drawer-toggle="true"
                  onClick={() => {
                    setShowCameraMenu(false);
                    setShowCombatLog(false);
                    setShowSettingsMenu(false);
                    setShowMusicDrawer((v) => !v);
                  }}
                  title={t.musicCarouselTitle}
                  aria-label={t.musicCarouselTitle}
                  aria-expanded={showMusicDrawer}
                  className={`inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white active:scale-95 ${
                    showMusicDrawer ? 'text-[#7BE6DB]' : 'text-[#E2B354]'
                  }`}
                >
                  <Disc3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                data-hud-settings-toggle="true"
                onClick={() => {
                  setShowCameraMenu(false);
                  setShowCombatLog(false);
                  setShowMusicDrawer(false);
                  setShowSettingsMenu((v) => !v);
                }}
                aria-label={t.settingsBtn}
                title={t.settingsBtn}
                aria-expanded={showSettingsMenu}
                className={`inline-flex items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white hover:shadow-[0_0_10px_rgba(123,230,219,0.35)] active:scale-95 ${
                  showSettingsMenu ? 'bg-[#E2B354]/15 text-[#7BE6DB]' : 'text-[#E2B354]'
                } ${isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'}`}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                data-help-btn="true"
                onClick={onOpenHelp}
                aria-label={t.helpBtn}
                title={t.helpBtn}
                className={`inline-flex items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 text-[#E2B354] transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white active:scale-95 ${
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
                  setShowMusicDrawer(false);
                  setShowSettingsMenu(false);
                  setShowCombatLog((v) => !v);
                }}
                aria-label={t.combatLogTitle}
                title={t.combatLogTitle}
                className={`relative inline-flex items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white active:scale-95 ${
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
                className={`inline-flex items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 text-[#E2B354] transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white active:scale-95 ${
                  isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'
                }`}
              >
                {muted ? <VolumeX className="h-4 w-4 text-[#FF8A75]" /> : <Volume2 className="h-4 w-4 text-[#66DDD2]" />}
              </button>

              <button
                type="button"
                data-fullscreen-btn="true"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
                title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                className={`inline-flex items-center justify-center rounded-lg border-l border-[#A67F38]/30 px-2 text-[#E2B354] transition-transform duration-150 hover:scale-110 hover:bg-[#E2B354]/12 hover:text-white active:scale-95 ${
                  isCompact ? 'min-h-[34px] min-w-[34px]' : 'min-h-[36px] min-w-[36px]'
                }`}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 shrink-0" /> : <Maximize2 className="h-4 w-4 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={onOpenMenu}
                aria-label={t.menu}
                className={`font-body inline-flex items-center gap-1.5 rounded-lg border-l border-[#A67F38]/30 font-bold text-[#F4ECE0] transition-transform duration-150 hover:scale-105 hover:bg-[#E2B354]/15 active:scale-95 whitespace-nowrap ${
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
          </div>

          {showSettingsMenu && (
            <div
              data-hud-settings-popover="true"
              className="hud-surface pointer-events-auto mt-1 flex w-[268px] max-w-[88vw] flex-col gap-2.5 rounded-xl bg-black/80 p-3 text-left shadow-[0_14px_32px_rgba(0,0,0,0.92)]"
            >
              <div className="flex items-center justify-between border-b border-[#A67F38]/35 pb-1">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#FFE29A]">
                  {t.settingsTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSettingsMenu(false)}
                  className="text-[#C8B8A2] hover:text-white"
                  aria-label="Close settings"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <label className="flex flex-col gap-1 text-[11px] text-[#E7DFD3]">
                <span className="font-display flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#C8A66A]">
                  <span>{t.uiScaleLabel}</span>
                  <span className="font-num text-[#FFE29A]">{uiScale.toFixed(2)}×</span>
                </span>
                <input
                  type="range"
                  data-ui-scale-slider="true"
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
                data-high-contrast-toggle="true"
                onClick={toggleHighContrast}
                className="stone-btn font-body inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]"
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

              {graphics && onSelectGraphics && (
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[9.5px] font-bold uppercase tracking-wider text-[#C8A66A]">
                    {t.graphicsLabel}
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'ultra', label: t.gfxUltra },
                        { id: 'high', label: t.gfxHigh },
                        { id: 'medium', label: t.gfxMedium },
                        { id: 'low', label: t.gfxLow },
                      ] as const
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onSelectGraphics(g.id)}
                        className={`font-body min-h-[28px] rounded px-1 text-[10px] ${
                          graphics === g.id ? 'gold-cta-btn font-bold' : 'stone-btn text-[#DFD3C1]'
                        }`}
                      >
                        {g.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(onToggleFastCombat || onToggleHoverInspector) && (
                <div className="grid grid-cols-2 gap-1.5">
                  {onToggleFastCombat && (
                    <button
                      type="button"
                      onClick={onToggleFastCombat}
                      className="stone-btn font-body inline-flex min-h-[30px] items-center justify-center gap-1 rounded-lg px-2 text-[10px]"
                      style={{ color: fastCombat ? '#A8F3EC' : '#DFD3C1' }}
                    >
                      <Gauge className="h-3 w-3 text-[#5EC8BE]" aria-hidden="true" />
                      <span className="truncate">
                        {fastCombat ? t.fastCombatOn : t.fastCombatOff}
                      </span>
                    </button>
                  )}
                  {onToggleHoverInspector && (
                    <button
                      type="button"
                      onClick={onToggleHoverInspector}
                      className="stone-btn font-body inline-flex min-h-[30px] items-center justify-center gap-1 rounded-lg px-2 text-[10px]"
                      style={{ color: hoverInspector ? '#A8F3EC' : '#DFD3C1' }}
                    >
                      {hoverInspector ? (
                        <Eye className="h-3 w-3 text-[#5EC8BE]" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-[#8D8170]" aria-hidden="true" />
                      )}
                      <span className="truncate">
                        {hoverInspector ? t.hoverInspectorOn : t.hoverInspectorOff}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isCompact && showMusicDrawer && (
            <div
              data-music-mobile-drawer="true"
              className="stone-panel pointer-events-auto w-[284px] max-w-[90vw] p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.9)]"
            >
              <MusicCarousel t={t} variant="compact" short={isShortLandscape} />
            </div>
          )}

          {showCameraMenu && (
            <div className="stone-panel pointer-events-auto mt-1 flex w-44 flex-col gap-1 p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.88)]">
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
                          : entry.kind === 'cross'
                            ? (t.crossSchoolSynergies[entry.detail as MagicSchool]?.tag ?? entry.detail)
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

      {/* Bottom-Left Circular Minimap (Desktop) / Right-Flank Radar (Mobile) & Responsive Rival Dialogue Box */}
      {!isShortLandscape && (
        <div
          className={`pointer-events-none fixed z-20 flex items-end gap-2.5 ${
            isCompact ? 'right-2 top-[252px]' : 'bottom-[124px] left-4'
          }`}
          style={
            !isCompact
              ? { transform: 'scale(var(--ui-scale, 1))', transformOrigin: 'bottom left' }
              : undefined
          }
        >
          <div className="pointer-events-auto">
            <ArenaMinimap state={state} title={t.minimapTitle} compact={isCompact} />
          </div>
          {!isCompact && (rivalCallout || rivalCombatQuip) && (
            <div
              data-dialogue-box="true"
              className="hud-surface pointer-events-none max-w-[248px] rounded-xl border border-[#B94738]/65 bg-black/75 px-3 py-2 text-left shadow-[0_10px_24px_rgba(0,0,0,0.88)]"
            >
              {rivalCallout && (
                <div
                  data-rival-callout="true"
                  className="font-display text-[10px] font-bold uppercase tracking-wider text-[#FFAA9B]"
                >
                  {rivalCallout}
                </div>
              )}
              {rivalCombatQuip && (
                <p
                  data-rival-quip="true"
                  className="font-body mt-0.5 text-[11px] italic leading-snug text-[#FFE6CA]"
                >
                  {rivalCombatQuip}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Responsive Dialogue Box (fixed top-20 centered, leaving thumb zone open) */}
      {isCompact && !isShortLandscape && (rivalCallout || rivalCombatQuip) && (
        <div
          data-dialogue-box="true"
          className="hud-surface pointer-events-none fixed left-1/2 top-20 z-30 w-[86vw] max-w-[310px] -translate-x-1/2 rounded-xl border border-[#B94738]/65 bg-black/78 px-3 py-1.5 text-center shadow-[0_10px_24px_rgba(0,0,0,0.9)]"
        >
          {rivalCallout && (
            <div
              data-rival-callout="true"
              className="font-display text-[10px] font-bold uppercase tracking-wider text-[#FFAA9B]"
            >
              {rivalCallout}
            </div>
          )}
          {rivalCombatQuip && (
            <p
              data-rival-quip="true"
              className="font-body mt-0.5 text-[10.5px] italic leading-snug text-[#FFE6CA]"
            >
              {rivalCombatQuip}
            </p>
          )}
        </div>
      )}

      {/* Subtle Bottom Transparent-to-Dark Gradient Scrim under Floating Hand (never a solid bar) */}
      <div
        aria-hidden="true"
        className="hand-scrim-gradient pointer-events-none fixed inset-x-0 bottom-0 z-0 h-32 sm:h-40"
      />

      {/* Bottom Perimeter Command Docks & Center Tarot Hand */}
      <footer
        className={`relative z-10 flex flex-col items-center ${
          isShortLandscape ? 'gap-0.5 px-2 pb-1' : isCompact ? 'gap-1 px-2 pb-1.5' : 'gap-1.5 px-4 pb-2.5'
        }`}
        style={
          !isCompact
            ? { transform: 'scale(var(--ui-scale, 1))', transformOrigin: 'bottom center' }
            : undefined
        }
      >
        {/* Desktop Auto-Hiding Horizontal Arcane Pattern Bar (1-4 Quick Cast, fades after 1.5s) */}
        {!isCompact && (
          <div
            data-pattern-bar="true"
            aria-hidden={!patternAutoHide.isVisible}
            className={`hud-surface flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 transition-opacity duration-500 ${
              patternAutoHide.isVisible
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0'
            }`}
          >
            {ARCANE_PATTERNS.map((patternId, idx) => {
              const active = selectedPattern === patternId;
              const info = t.patterns[patternId];
              return (
                <button
                  key={patternId}
                  type="button"
                  data-pattern-slot={patternId}
                  onClick={() => {
                    selectPattern(patternId);
                    onTriggerPattern?.(patternId);
                    patternAutoHide.trigger();
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 ${
                    active
                      ? 'border-[#FFE29A] bg-[#2D2214]/90 text-[#FFE8AE]'
                      : 'border-[#6E5C3E]/55 bg-[#12101A]/80 text-[#DFD3C1]'
                  }`}
                >
                  <span className="font-num text-[#7BE6DB]">[{idx + 1}]</span>
                  {patternId === 'triangle' ? (
                    <Triangle className="h-3 w-3 text-[#62F2E4]" aria-hidden="true" />
                  ) : patternId === 'star' ? (
                    <Sparkles className="h-3 w-3 text-[#F4CC68]" aria-hidden="true" />
                  ) : patternId === 'circle' ? (
                    <Circle className="h-3 w-3 text-[#79EA74]" aria-hidden="true" />
                  ) : (
                    <UserCheck className="h-3 w-3 text-[#C59BFF]" aria-hidden="true" />
                  )}
                  <span className="font-display uppercase tracking-wider">{info.name}</span>
                </button>
              );
            })}
            <span className="font-body ml-1 text-[9.5px] text-[#B8AEA0]">{t.patternHoldHint}</span>
          </div>
        )}
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
              {inspectedCard &&
                inspectedCard.school !== state.playerSchool &&
                !state.crossSchoolTriggeredThisTurn &&
                !state.altarMode && (
                  <p className="font-body text-[10px] leading-snug text-[#FFE29A]">
                    {t.crossSchoolSynergies[inspectedCard.school].hint}
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

        {/* Active Player Aura / Ward / Relics / Hero Status Chips (Lane Runes projected directly on 3D floor) */}
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

        {/* Unified Resource Belt, Dominant End Turn Seal & Floating Turn-Aware Tarot Hand */}
        {(() => {
          const hpRing = computeArcStroke(state.playerHp, state.playerMaxHp, 100.53, 1);
          const etherRing = computeArcStroke(
            state.playerEther,
            Math.max(1, state.playerChannel),
            100.53,
            1
          );
          const medSize = isShortLandscape ? 'h-8 w-8' : isNarrowPhone ? 'h-9 w-9' : isCompact ? 'h-10 w-10' : 'h-11 w-11';

          const vitalsCluster = (
            <div data-resource-belt="true" className="flex shrink-0 items-center gap-1.5">
              {/* Circular HP Medallion */}
              <div
                data-vitals-hp="true"
                title={`${t.hp}: ${state.playerHp}/${state.playerMaxHp}`}
                className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-full bg-[#131524]/90 ${medSize}`}
              >
                <svg viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(94, 200, 190, 0.2)" strokeWidth="2.8" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={isOverloaded ? '#FF8775' : '#66DDD2'}
                    strokeWidth="2.8"
                    strokeDasharray={hpRing.dasharray}
                    strokeDashoffset={hpRing.dashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 220ms ease' }}
                  />
                </svg>
                <Heart className="h-2.5 w-2.5 text-[#7BE6DB]" aria-hidden="true" />
                <span className="font-num text-[9.5px] font-extrabold leading-none text-[#FBF2E1] sm:text-[10.5px]">
                  {isNarrowPhone ? state.playerHp : `${state.playerHp}/${state.playerMaxHp}`}
                </span>
              </div>

              {/* Circular Ether Medallion */}
              <div
                data-vitals-ether="true"
                title={`${t.ether}: ${state.playerEther}/${state.playerChannel}`}
                className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-full bg-[#131524]/90 ${medSize}`}
              >
                <svg viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(226, 179, 84, 0.2)" strokeWidth="2.8" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={isOverloaded ? '#FF8775' : '#FFE29A'}
                    strokeWidth="2.8"
                    strokeDasharray={etherRing.dasharray}
                    strokeDashoffset={etherRing.dashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 220ms ease' }}
                  />
                </svg>
                <Sparkles className="h-2.5 w-2.5 text-[#E5B85B]" aria-hidden="true" />
                <span
                  className="font-num text-[9.5px] font-extrabold leading-none sm:text-[10.5px]"
                  style={{ color: isOverloaded ? '#FF9482' : '#FFE8AE' }}
                >
                  {state.playerEther}/{state.playerChannel}
                </span>
              </div>

              {/* Circular Deck Medallion */}
              <button
                type="button"
                data-deck-btn="true"
                onClick={() => setShowDeckModal((v) => !v)}
                title={t.deckRemainingTitle}
                aria-label={`${t.deckRemainingTitle}: ${state.playerDrawPile.length}`}
                className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-full border border-[#D6A856]/55 bg-[#171828]/90 text-[#EAD9BD] transition-transform hover:scale-105 hover:border-[#FFE29A] active:scale-95 ${medSize}`}
              >
                <Layers className="h-2.5 w-2.5 text-[#E2B354]" aria-hidden="true" />
                <span className="font-num text-[9.5px] font-extrabold leading-none sm:text-[10.5px]">
                  {state.playerDrawPile.length}
                </span>
              </button>
            </div>
          );

          const hasOutgoingStrike =
            state.phase === 'player_main' &&
            !resolvingTurn &&
            (strikePreview.directToEnemyArchon > 0 || strikePreview.enemyUnitsSlain > 0);
          const threat = computeNetThreatDelta(
            strikePreview.directToEnemyArchon,
            intent.directDemiurgeDmg,
            state.playerHp
          );

          const endTurnBtn = (
            <button
              type="button"
              disabled={!isPlayerTurnReady}
              onClick={onEndTurn}
              className={`gold-cta-btn gold-cta-hero end-turn-seal shrink-0 ${
                isPlayerTurnReady && !hasAffordableCard ? 'gold-cta-ready' : ''
              } font-display inline-flex items-center justify-center gap-1.5 font-extrabold uppercase tracking-[0.1em] disabled:opacity-50 whitespace-nowrap ${
                isNarrowPhone
                  ? 'min-h-[38px] min-w-0 max-w-[126px] px-2.5 py-1 text-[10px]'
                  : isCompact
                    ? 'min-h-[42px] min-w-0 max-w-[175px] px-3.5 py-1 text-[11px]'
                    : 'min-h-[54px] min-w-[178px] px-6 py-2 text-[13px]'
              }`}
            >
              <Swords className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={isCompact ? 'truncate' : undefined}>
                {resolvingTurn
                  ? t.combatResolvingLabel
                  : state.phase === 'player_main'
                    ? isCompact
                      ? t.endTurnShort
                      : t.endTurn
                    : t.enemyTurn}
              </span>
              {hasOutgoingStrike && (
                <span
                  data-strike-preview={strikePreview.isLethal ? 'lethal' : 'strike'}
                  className={`font-num ml-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black leading-none tracking-wide ${
                    strikePreview.isLethal
                      ? 'border border-[#381B17] bg-[#9E2B25] text-[#FFF1DE]'
                      : 'border border-[#4D3816]/45 bg-[#1B1308]/25 text-[#281A06]'
                  }`}
                >
                  {strikePreview.isLethal
                    ? t.lethalTag
                    : strikePreview.directToEnemyArchon > 0
                      ? `+${strikePreview.directToEnemyArchon}`
                      : `×${strikePreview.enemyUnitsSlain}`}
                </span>
              )}
              {state.phase === 'player_main' && threat.isDanger && !strikePreview.isLethal && (
                <span
                  data-threat-warning="true"
                  title={`${intent.directDemiurgeDmg} ${t.intentDirect}`}
                  className="font-num ml-0.5 inline-flex items-center rounded border border-[#471612] bg-[#8E1F19] px-1 py-0.5 text-[9.5px] font-black leading-none text-[#FFE8D6]"
                >
                  !-{intent.directDemiurgeDmg}
                </span>
              )}
            </button>
          );

          const desktopHandCount = state.playerHand.length;
          const desktopCardW = viewport.w >= 1380 ? 148 : viewport.w >= 1200 ? 138 : 118;
          const desktopSideReservedW = viewport.w >= 1280 ? 500 : 450;
          const desktopAvailHandW = Math.max(320, viewport.w - desktopSideReservedW);
          const desktopRawHandW = desktopHandCount * desktopCardW + Math.max(0, desktopHandCount - 1) * 8;
          const desktopOverlapPx =
            !isCompact && desktopHandCount > 1
              ? desktopRawHandW > desktopAvailHandW
                ? Math.min(44, Math.ceil((desktopRawHandW - desktopAvailHandW) / (desktopHandCount - 1)) + 8)
                : desktopHandCount >= 5
                  ? Math.min(10, (desktopHandCount - 4) * 5)
                  : 0
              : 0;

          const tarotHand = (
            <div
              data-altar-desk="true"
              data-hand-active={isPlayerTurnReady ? 'true' : 'false'}
              className={`no-scrollbar flex w-full transition-all duration-300 ease-out ${
                isPlayerTurnReady
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-[135%] opacity-0'
              } ${
                isCompact
                  ? 'max-w-5xl items-stretch gap-2 overflow-x-auto px-2 sm:gap-2.5'
                  : `items-end justify-center overflow-visible px-4 pt-4 pb-1 ${desktopOverlapPx > 0 ? 'gap-0' : 'gap-2'}`
              } ${
                isCompact && (isNarrowPhone ? state.playerHand.length <= 3 : state.playerHand.length <= 4)
                  ? 'justify-center'
                  : isCompact
                    ? 'justify-start'
                    : ''
              } ${
                isShortLandscape ? 'pt-1 pb-0.5' : isCompact ? 'pt-1.5 pb-1' : ''
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
                const eff = getCardEffectiveStats(card.id, state.forgedCards, state.trialModifier);
                const affordance = evaluateCardPlayAffordance(card, eff.cost, state, mulliganMode);
                const affordable = affordance.affordable;
                const isSelected = mulliganMode ? mulliganSelected.includes(idx) : selectedHandIndex === idx;
                const isCrossSpark = affordance.isCrossOrderSynergy;
                const name = t.cardNames[card.id] ?? card.id;
                const rule = t.cardRules[card.id] ?? '';

                const count = state.playerHand.length;
                const offset = count > 1 ? idx - (count - 1) / 2 : 0;
                const fanRot = isCompact ? '0deg' : `${(offset * 2.5).toFixed(2)}deg`;
                const fanY = isCompact ? '0px' : `${(Math.abs(offset) * Math.abs(offset) * 2.6).toFixed(1)}px`;
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
                      state.altarMode ? 'tarot-card-altar' : 'tarot-card-floating'
                    } tarot-fan-item group relative flex shrink-0 flex-col justify-between text-left transition-all duration-150 disabled:opacity-45 ${
                      isFocusedOrHovered ? 'z-30 opacity-100' : 'z-10 opacity-92 hover:opacity-100'
                    } ${
                      isShortLandscape
                        ? 'min-h-[70px] w-[116px] px-1.5 py-[3px]'
                        : isNarrowPhone
                          ? 'min-h-[104px] w-[114px] p-1.5'
                          : isCompact
                            ? 'min-h-[108px] w-[124px] p-2'
                            : 'h-[128px] p-2 xl:h-[136px] xl:p-2.5'
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
                          : eff.forgeTier > 0 && affordable && !state.altarMode
                            ? 'rgba(240, 210, 130, 0.78)'
                            : affordable
                              ? 'rgba(206, 164, 88, 0.52)'
                              : 'rgba(90, 84, 110, 0.38)',
                        boxShadow:
                          graphicsLevel >= GRAPHICS_LEVEL.high && affordable
                            ? `inset 0 1px 0 rgba(255, 235, 185, 0.24), 0 18px 34px rgba(0, 0, 0, 0.84), 0 0 ${
                                isSelected
                                  ? '20px rgba(123, 230, 219, 0.55)'
                                  : isFocusedOrHovered
                                    ? '18px rgba(226, 179, 84, 0.35)'
                                    : '10px rgba(0, 0, 0, 0.4)'
                              }`
                            : undefined,
                      } as CSSProperties
                    }
                  >
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
                          {isCrossSpark && (
                            <span
                              data-cross-spark="true"
                              title={t.crossSchoolSynergies[card.school].hint}
                              className="shrink-0 text-[9px] font-bold text-[#7BE6DB]"
                            >
                              ✦
                            </span>
                          )}
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

          const radialActions: RadialArcanaAction[] = [
            ...(canMulligan
              ? [
                  {
                    id: 'mulligan',
                    label: t.mulliganBtn,
                    title: t.mulliganHint,
                    icon: <RefreshCw className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />,
                    active: mulliganMode,
                    dataAttr: { 'data-mulligan-btn': 'true' },
                    onClick: () => {
                      setMulliganMode((v) => !v);
                      setMulliganSelected([]);
                    },
                  },
                ]
              : []),
            {
              id: 'overload',
              label: state.overloadUsedThisTurn ? t.overloadActive : t.overloadShort,
              title: t.overloadBtn,
              icon: <Zap className="h-3.5 w-3.5 text-[#FF9E8D]" aria-hidden="true" />,
              disabled: !canOverload,
              active: state.overloadUsedThisTurn,
              onClick: onTriggerOverload,
            },
            {
              id: 'altar',
              label: t.altarShort,
              title: t.altarBtn,
              icon: <Flame className="h-3.5 w-3.5 text-[#FFA58C]" aria-hidden="true" />,
              disabled: !isPlayerTurnReady || state.playerHand.length === 0,
              active: state.altarMode,
              onClick: onToggleAltar,
            },
            {
              id: 'leap',
              label: t.leapShort,
              title: t.leapPulseBtn,
              icon: <Sparkles className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />,
              disabled: !isPlayerTurnReady || state.leapUsedThisTurn,
              onClick: onTriggerLeap,
            },
            ...(hasAnyPlayerCreature
              ? [
                  {
                    id: 'swap',
                    label: t.swapBtn,
                    title: t.swapBtn,
                    icon: <ArrowLeftRight className="h-3.5 w-3.5 text-[#E2B354]" aria-hidden="true" />,
                    disabled: !canSwap,
                    active: swapMode,
                    dataAttr: { 'data-swap-btn': 'true' },
                    onClick: onToggleSwapMode,
                  },
                ]
              : []),
            ...(hasAnyPlayerCreature && hasAffordableCreature
              ? [
                  {
                    id: 'ascend',
                    label: t.ascendTag,
                    title: t.ascendHint,
                    icon: <Crown className="h-3.5 w-3.5 text-[#E8BC5E]" aria-hidden="true" />,
                    disabled: !isPlayerTurnReady,
                    active: ascendMode,
                    dataAttr: { 'data-ascend-btn': 'true' },
                    onClick: onToggleAscendMode,
                  },
                ]
              : []),
            {
              id: 'chrono',
              label: state.chronoRewindUsed ? t.chronoRewindSpent : t.chronoRewindShort,
              title: t.chronoRewindDesc,
              icon: <RotateCcw className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />,
              disabled: !canChronoRewind,
              active: Boolean(!state.chronoRewindUsed && state.lastLostAlly),
              dataAttr: { 'data-chrono-btn': 'true' },
              onHoverStart: () => canChronoRewind && onHoverPower?.('chrono_rewind'),
              onHoverEnd: () => onHoverPower?.(null),
              onClick: onTriggerChronoRewind,
            },
            {
              id: 'tether',
              label: state.soulTetherActive ? t.soulTetherActive : t.soulTetherShort,
              title: t.soulTetherDesc,
              icon: <Link2 className="h-3.5 w-3.5 text-[#7BE6DB]" aria-hidden="true" />,
              disabled: !canSoulTether,
              active: state.soulTetherActive,
              dataAttr: { 'data-tether-btn': 'true' },
              onHoverStart: () => canSoulTether && onHoverPower?.('soul_tether'),
              onHoverEnd: () => onHoverPower?.(null),
              onClick: onTriggerSoulTether,
            },
            {
              id: 'resonance',
              label:
                state.playerResonance >= 5
                  ? t.resonanceReadyBySchool[state.playerSchool]
                  : `${t.resonanceShort} ${state.playerResonance}/5`,
              title: t.resonanceDescBySchool[state.playerSchool],
              icon: <Orbit className="h-3.5 w-3.5 text-[#FFE29A]" aria-hidden="true" />,
              disabled: !canResonance,
              active: canResonance,
              dataAttr: { 'data-resonance-btn': 'true' },
              onHoverStart: () => canResonance && onHoverPower?.('resonance'),
              onHoverEnd: () => onHoverPower?.(null),
              onClick: onTriggerResonance,
            },
            ...(canUltimatum
              ? [
                  {
                    id: 'ultimatum',
                    label: t.ultimatumBtn,
                    title: t.ultimatumBySchool[state.playerSchool],
                    icon: <Crown className="h-3.5 w-3.5 text-[#FFE29A]" aria-hidden="true" />,
                    active: true,
                    onClick: onTriggerUltimatum,
                  },
                ]
              : []),
          ];

          return (
            <HUD
              isMobile={isCompact}
              isShortLandscape={isShortLandscape}
              t={t}
              vitalsCluster={vitalsCluster}
              endTurnBtn={endTurnBtn}
              tarotHand={tarotHand}
              radialActions={radialActions}
              selectedPattern={selectedPattern}
              onSelectPattern={(pattern) => {
                selectPattern(pattern);
                onTriggerPattern?.(pattern);
              }}
            />
          );
        })()}
      </footer>
    </div>
  );
}

