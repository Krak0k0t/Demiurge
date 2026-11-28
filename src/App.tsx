import { useCallback, useEffect, useRef, useState } from 'react';
import { etherAudio } from './audio/etherAudio';
import {
  getFastCombat,
  getGraphicsQuality,
  getHoverInspector,
  GRAPHICS_LEVEL,
  setFastCombat,
  setGraphicsQuality,
  setHoverInspector,
  type GraphicsQuality,
} from './core/graphicsSettings';
import { readLaunchParams } from './core/rng';
import { createInitialHelloState, type HelloState } from './systems/etherChannel';
import { mountHelloArenaScene, type HelloSceneBridge } from './view/helloArenaScene';
import { HelloHud } from './ui/HelloHud';
import {
  mountLookDevScene,
  type LookDevBridge,
  type LookDevPreset,
  type LookDevUiState,
} from './view/lookdevScene';
import { LookDevHud } from './ui/LookDevHud';
import { CARD_CATALOG, type Difficulty, type RelicId } from './game/cards';
import {
  applyDraftReplacement,
  applySanctuaryPurge,
  calculateDuelXp,
  createDuelState,
  fuseCreatureFromHand,
  generateDraftChoices,
  generateRelicChoices,
  getArchonRank,
  getCardEffectiveStats,
  getOpponentForStage,
  performMulligan,
  playCardFromHand,
  resolvePlayerEndTurn,
  swapPlayerLanes,
  toggleAltarMode,
  toggleCreatureStance,
  triggerChronoRewind,
  triggerCreatureAbility,
  triggerOverload,
  triggerResonanceApotheosis,
  triggerRightClickLeap,
  triggerSoulTether,
  triggerUltimatum,
  type CombatEvent,
  type DuelState,
} from './game/duelEngine';
import { getTranslations, isRtlLanguage, type LanguageCode } from './i18n/translations';
import type { MagicSchool } from './view/assets/creatureTotems';
import {
  mountDuelScene,
  type ArchonPowerHoverKind,
  type CameraPreset,
  type DuelSceneBridge,
  type HoverTargetInfo,
  type ProjectedBadge,
  type ProjectedLaneRune,
  type WorldPromptInfo,
} from './view/duelScene';
import { useDeviceType } from './hooks/useDeviceType';
import {
  applyCrossroadsChoice,
  getCrossroadsOptions,
  getDailyTrialConfig,
  loadCodexSave,
  pickRivalCombatQuipKey,
  recordCardsDiscovered,
  recordContractCompleted,
  recordForgeCompleted,
  recordOrderVictory,
  recordRelicsDiscovered,
  recordStageCleared,
  recordTrialRun,
  saveCodexSave,
  STAGE_SIGNATURE_CARDS,
  type CodexSaveData,
  type CrossroadsEventDef,
  type CrossroadsEventId,
  type DailyTrialConfig,
  type TrialModifierId,
} from './game/cathedralMeta';
import { TitleScreen } from './ui/TitleScreen';
import { DuelHud, type CardAnchorPoint } from './ui/DuelHud';
import { HudSettingsProvider, useHudSettings } from './ui/HudSettingsContext';
import { BriefingModal, DraftModal, GameOverModal, PauseModal, type SanctuaryAction } from './ui/Modals';
import { HelpModal } from './ui/HelpModal';
import { CodexModal } from './ui/CodexModal';
import { CrossroadsModal } from './ui/CrossroadsModal';

type ShellMode = 'title' | 'briefing' | 'playing' | 'paused' | 'draft' | 'crossroads' | 'gameover';

const INITIAL_LOOKDEV_STATE: LookDevUiState = {
  preset: 'combat',
  overloadActive: false,
  playerHp: 25,
  playerEther: 4,
  playerMaxEther: 4,
  enemyHp: 22,
  enemyEther: 4,
  badges: [],
};

function mapBodyDatasetState(mode: ShellMode): 'title' | 'playing' | 'paused' | 'gameover' {
  if (mode === 'title') return 'title';
  if (mode === 'paused' || mode === 'briefing' || mode === 'draft' || mode === 'crossroads') return 'paused';
  if (mode === 'gameover') return 'gameover';
  return 'playing';
}

function playCombatAudio(events: CombatEvent[], state: DuelState): void {
  let playedHit = false;
  let playedHeavy = false;
  for (const ev of events) {
    if (ev.type === 'summon') etherAudio.playSummon();
    else if (ev.type === 'spell') etherAudio.playSpell();
    else if (ev.type === 'leap_pulse') etherAudio.playLeapPulse();
    else if (ev.type === 'veteran') etherAudio.playVeteran();
    else if (ev.type === 'overload') etherAudio.playOverloadToggle(true);
    else if (ev.type === 'enchant') etherAudio.playEnchant();
    else if (ev.type === 'trap') etherAudio.playTrap();
    else if (ev.type === 'stance') etherAudio.playStance(ev.label === 'GUARD');
    else if (ev.type === 'intercept') etherAudio.playIntercept();
    else if (ev.type === 'ability') etherAudio.playAbility();
    else if (ev.type === 'chrono_rewind') etherAudio.playChronoRewind();
    else if (ev.type === 'soul_tether' || ev.type === 'tether_reflect') etherAudio.playSoulTether();
    else if (ev.type === 'resonance') etherAudio.playResonanceApotheosis(ev.school);
    else if (ev.type === 'hit_demiurge' && (ev.amount ?? 0) > 0) playedHeavy = true;
    else if (ev.type === 'hit_creature') playedHit = true;
  }
  if (playedHeavy) etherAudio.playHit(true);
  else if (playedHit) etherAudio.playHit(false);

  if (state.phase === 'victory') etherAudio.playVictory();
  else if (state.phase === 'defeat') etherAudio.playDefeat();
}

const RUN_STORAGE_KEY = 'obsidian_arcanum_run_v1';
const BEST_STORAGE_KEY = 'obsidian_arcanum_best_v1';

interface SavedCampaignRun {
  stageIndex: number;
  difficulty: Difficulty;
  playerSchool: MagicSchool;
  deck: string[];
  relics: RelicId[];
  forgedCards: Record<string, number>;
  archonXp: number;
  maxHpBonus: number;
  startingResonanceBonus: number;
  trialModifier?: TrialModifierId | null;
}

function loadSavedRun(): SavedCampaignRun | null {
  try {
    const raw = window.localStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCampaignRun;
    if (
      typeof parsed?.stageIndex === 'number' &&
      Array.isArray(parsed?.deck) &&
      parsed.deck.length >= 8
    ) {
      return parsed;
    }
  } catch {
    // ignore storage failures
  }
  return null;
}

function saveCampaignRun(run: SavedCampaignRun | null): void {
  try {
    if (!run) {
      window.localStorage.removeItem(RUN_STORAGE_KEY);
    } else {
      window.localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
    }
  } catch {
    // ignore storage failures
  }
}

function loadBestStage(): number {
  try {
    const raw = window.localStorage.getItem(BEST_STORAGE_KEY);
    const num = raw ? Number(raw) : 0;
    return Number.isFinite(num) ? Math.max(0, Math.min(7, num)) : 0;
  } catch {
    return 0;
  }
}

function saveBestStage(stageReached: number): void {
  try {
    const prev = loadBestStage();
    if (stageReached > prev) {
      window.localStorage.setItem(BEST_STORAGE_KEY, String(stageReached));
    }
  } catch {
    // ignore storage failures
  }
}

function isTargetedSpellCard(cardId: string, state: DuelState): boolean {
  const card = CARD_CATALOG[cardId];
  if (!card || card.type !== 'spell' || !card.spellEffect) return false;
  if (card.spellEffect.kind === 'double_hp_armor') {
    return state.playerBoard.filter((c) => c !== null).length >= 2;
  }
  if (
    card.spellEffect.kind === 'damage_target' ||
    card.spellEffect.kind === 'drain_channel' ||
    card.spellEffect.kind === 'execute_or_burn' ||
    card.spellEffect.kind === 'pulse_draw'
  ) {
    return state.enemyBoard.filter((c) => c !== null).length >= 2;
  }
  return false;
}

function AppContent() {
  const launch = readLaunchParams(window.location.search);
  const mode = launch.scene;
  const isHelloMode = mode === 'hello';
  const isLookDevMode = mode === 'lookdev';
  const { bindEngineBridge, selectPattern } = useHudSettings();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const helloBridgeRef = useRef<HelloSceneBridge | null>(null);
  const lookdevBridgeRef = useRef<LookDevBridge | null>(null);
  const duelBridgeRef = useRef<DuelSceneBridge | null>(null);

  // Legacy debug modes preserved under ?scene=hello / ?scene=lookdev
  const [helloState, setHelloState] = useState<HelloState>(createInitialHelloState);
  const [lookdevState, setLookdevState] = useState<LookDevUiState>(INITIAL_LOOKDEV_STATE);

  // Full Duel of Demiurges state
  const [initialSavedRun] = useState<SavedCampaignRun | null>(() => loadSavedRun());
  const [savedRun, setSavedRun] = useState<SavedCampaignRun | null>(initialSavedRun);
  const [bestStage, setBestStage] = useState<number>(() => loadBestStage());
  const [lang, setLang] = useState<LanguageCode>('en');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => initialSavedRun?.difficulty ?? 'archmage'
  );
  const [playerSchool, setPlayerSchool] = useState<MagicSchool>(
    () => initialSavedRun?.playerSchool ?? 'synth'
  );
  const [shellMode, setShellMode] = useState<ShellMode>(launch.autostart ? 'playing' : 'title');
  const [duelState, setDuelState] = useState<DuelState | null>(() =>
    launch.autostart
      ? createDuelState({
          stageIndex: 0,
          difficulty: 'archmage',
          playerSchool: 'synth',
          enableLaneRunes: true,
          enableQuests: true,
          seed: launch.seed,
        })
      : null
  );
  const { isMobile, hasTouch } = useDeviceType();
  const [badges, setBadges] = useState<ProjectedBadge[]>([]);
  const [laneRunes, setLaneRunes] = useState<ProjectedLaneRune[]>([]);
  const [worldPrompts, setWorldPrompts] = useState<WorldPromptInfo[]>([]);
  const [preset, setPreset] = useState<CameraPreset>('combat');
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [swapMode, setSwapMode] = useState<boolean>(false);
  const [swapSourceLane, setSwapSourceLane] = useState<number | null>(null);
  const [ascendMode, setAscendMode] = useState<boolean>(false);
  const [resolvingTurn, setResolvingTurn] = useState<boolean>(false);
  const [rivalCallout, setRivalCallout] = useState<string | null>(null);
  const [draftChoices, setDraftChoices] = useState<string[]>([]);
  const [relicChoices, setRelicChoices] = useState<RelicId[]>([]);
  const [campaignRelics, setCampaignRelics] = useState<RelicId[]>(
    () => initialSavedRun?.relics ?? []
  );
  const [forgedCards, setForgedCards] = useState<Record<string, number>>(
    () => initialSavedRun?.forgedCards ?? {}
  );
  const [archonXp, setArchonXp] = useState<number>(() => initialSavedRun?.archonXp ?? 0);
  const [lastXpGained, setLastXpGained] = useState<number>(0);
  const [maxHpBonus, setMaxHpBonus] = useState<number>(() => initialSavedRun?.maxHpBonus ?? 0);
  const [startingResonanceBonus, setStartingResonanceBonus] = useState<number>(
    () => initialSavedRun?.startingResonanceBonus ?? 0
  );
  const [muted, setMuted] = useState<boolean>(etherAudio.isMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [graphics, setGraphics] = useState<GraphicsQuality>(() => getGraphicsQuality());
  const [fastCombat, setFastCombatState] = useState<boolean>(() => getFastCombat());
  const [hoverInspector, setHoverInspectorState] = useState<boolean>(() => getHoverInspector());
  const [hoverTarget, setHoverTarget] = useState<HoverTargetInfo | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showCodex, setShowCodex] = useState<boolean>(false);
  const [dailyTrial] = useState<DailyTrialConfig>(() => getDailyTrialConfig());
  const [activeTrial, setActiveTrial] = useState<DailyTrialConfig | null>(null);
  const [codexSave, setCodexSave] = useState<CodexSaveData>(() => loadCodexSave());
  const [rivalCombatQuip, setRivalCombatQuip] = useState<string | null>(null);
  const [crossroadsOptions, setCrossroadsOptions] = useState<CrossroadsEventDef[]>([]);
  const [pendingCrossroadsPayload, setPendingCrossroadsPayload] = useState<{
    nextStage: number;
    deck: string[];
    relics: RelicId[];
    forgedCards: Record<string, number>;
    archonXp: number;
    maxHpBonus: number;
    startingResonanceBonus: number;
  } | null>(null);

  const t = getTranslations(lang);
  const rtl = isRtlLanguage(lang);

  // Refs so Three.js scene mount callbacks never stale-close and never remount WebGL
  const shellModeRef = useRef(shellMode);
  const duelStateRef = useRef(duelState);
  const selectedHandRef = useRef(selectedHandIndex);
  const swapModeRef = useRef(swapMode);
  const swapSourceRef = useRef(swapSourceLane);
  const ascendModeRef = useRef(ascendMode);
  const resolvingTurnRef = useRef(resolvingTurn);
  const fastCombatRef = useRef(fastCombat);
  const showHelpRef = useRef(showHelp);
  const showCodexRef = useRef(showCodex);
  const activeTrialRef = useRef(activeTrial);
  const langRef = useRef(lang);
  const isMobileRef = useRef(isMobile);
  const hasTouchRef = useRef(hasTouch);
  const pendingAfterQueueRef = useRef<(() => void) | null>(null);
  const quipTimerRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  shellModeRef.current = shellMode;
  duelStateRef.current = duelState;
  selectedHandRef.current = selectedHandIndex;
  swapModeRef.current = swapMode;
  swapSourceRef.current = swapSourceLane;
  ascendModeRef.current = ascendMode;
  resolvingTurnRef.current = resolvingTurn;
  fastCombatRef.current = fastCombat;
  showHelpRef.current = showHelp;
  showCodexRef.current = showCodex;
  activeTrialRef.current = activeTrial;
  langRef.current = lang;
  isMobileRef.current = isMobile;
  hasTouchRef.current = hasTouch;

  const updateCodex = useCallback((updater: (prev: CodexSaveData) => CodexSaveData) => {
    setCodexSave((prev) => {
      const next = updater(prev);
      if (next !== prev) saveCodexSave(next);
      return next;
    });
  }, []);

  const triggerRivalQuip = useCallback((text: string | undefined) => {
    if (!text) return;
    if (quipTimerRef.current !== null) {
      window.clearTimeout(quipTimerRef.current);
    }
    setRivalCombatQuip(text);
    quipTimerRef.current = window.setTimeout(() => {
      setRivalCombatQuip(null);
      quipTimerRef.current = null;
    }, 3800);
  }, []);

  const clearPendingTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (quipTimerRef.current !== null) {
      window.clearTimeout(quipTimerRef.current);
      quipTimerRef.current = null;
    }
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((tId) => tId !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const commitDuelState = useCallback(
    (next: DuelState, forcedMode?: ShellMode): number => {
      const prevHp = duelStateRef.current?.playerHp ?? next.playerHp;
      const events = next.pendingEvents;
      if (events.length > 0) {
        if (!duelBridgeRef.current) {
          playCombatAudio(events, next);
        }
        const sigSet = STAGE_SIGNATURE_CARDS[next.stageIndex] ?? [];
        const hasHeavyHit = events.some(
          (ev) =>
            (ev.type === 'hit_demiurge' && ev.side === 'enemy' && (ev.amount ?? 0) >= 4) ||
            ev.type === 'ultimatum' ||
            ev.type === 'resonance'
        );
        const hasEnemySig = events.some(
          (ev) => ev.type === 'summon' && ev.side === 'enemy' && ev.cardId && sigSet.includes(ev.cardId)
        );
        const hasPlayerOverload = events.some((ev) => ev.type === 'overload' && ev.side === 'player');
        const quipTrigger = hasHeavyHit
          ? 'heavy_hit'
          : hasEnemySig
            ? 'summon_sig'
            : hasPlayerOverload
              ? 'overload_react'
              : null;
        if (quipTrigger) {
          const qKey = pickRivalCombatQuipKey(next.stageIndex, quipTrigger);
          triggerRivalQuip(getTranslations(langRef.current).bossCombatQuips[qKey]);
        }
      }
      if (next.playerHp > 0 && next.playerHp <= 7 && next.playerHp < prevHp) {
        etherAudio.playHeartbeat();
      }

      updateCodex((prev) => {
        let updated = recordCardsDiscovered(prev, next.playerDeck);
        updated = recordRelicsDiscovered(updated, next.relics);
        return updated;
      });

      let nextMode: ShellMode = forcedMode ?? 'playing';
      if (!forcedMode) {
        if (next.phase === 'victory') {
          const gained = calculateDuelXp(next);
          setLastXpGained(gained);
          setArchonXp((prev) => prev + gained);
          const stageCleared = next.stageIndex + 1;
          saveBestStage(stageCleared);
          setBestStage((prev) => Math.max(prev, stageCleared));

          updateCodex((prev) => {
            let updated = recordStageCleared(prev);
            if (next.activeQuest?.completed) {
              updated = recordContractCompleted(updated);
            }
            if (next.stageIndex >= 6) {
              updated = recordOrderVictory(updated, next.playerSchool);
              if (activeTrialRef.current) {
                updated = recordTrialRun(updated, {
                  dateKey: activeTrialRef.current.dateKey,
                  stageReached: 7,
                  score: next.damageDealtTotal,
                  completed: true,
                });
              }
            }
            return updated;
          });

          if (next.stageIndex < 6) {
            const defeatedSchool = getOpponentForStage(next.stageIndex).school;
            setDraftChoices(
              generateDraftChoices(next.playerDeck, next.seed + next.round * 19, defeatedSchool)
            );
            if (next.stageIndex === 0 || next.stageIndex === 2 || next.stageIndex === 4) {
              setRelicChoices(generateRelicChoices(next.relics, next.seed + next.round * 37));
            } else {
              setRelicChoices([]);
            }
            nextMode = 'draft';
          } else {
            saveCampaignRun(null);
            setSavedRun(null);
            nextMode = 'gameover';
          }
        } else if (next.phase === 'defeat') {
          const gained = Math.round(calculateDuelXp(next) * 0.25);
          setLastXpGained(gained);
          setArchonXp((prev) => prev + gained);
          const stageReached = next.stageIndex + 1;
          saveBestStage(stageReached);
          setBestStage((prev) => Math.max(prev, stageReached));
          if (activeTrialRef.current) {
            const trialSnap = activeTrialRef.current;
            updateCodex((prev) =>
              recordTrialRun(prev, {
                dateKey: trialSnap.dateKey,
                stageReached,
                score: next.damageDealtTotal,
                completed: false,
              })
            );
          }
          saveCampaignRun(null);
          setSavedRun(null);
          nextMode = 'gameover';
        }
      }

      const isOutcomeTransition =
        !forcedMode && (next.phase === 'victory' || next.phase === 'defeat') && Boolean(duelBridgeRef.current);
      const immediateMode: ShellMode = isOutcomeTransition ? 'playing' : nextMode;
      const durationSec =
        duelBridgeRef.current?.syncDuelState(next, mapBodyDatasetState(immediateMode)) ?? 0;
      duelBridgeRef.current?.setPowerHoverPreview(null, null);

      const cleanNext = { ...next, pendingEvents: [] };
      setShellMode(immediateMode);
      setDuelState(cleanNext);
      setSelectedHandIndex(null);
      setSwapMode(false);
      setSwapSourceLane(null);
      setAscendMode(false);

      if (isOutcomeTransition) {
        setResolvingTurn(true);
        const revealOutcome = () => {
          scheduleTimer(
            () => {
              setResolvingTurn(false);
              setShellMode(nextMode);
              duelBridgeRef.current?.syncDuelState(cleanNext, mapBodyDatasetState(nextMode));
            },
            fastCombatRef.current ? 180 : 520
          );
        };
        if (durationSec > 0.05) {
          pendingAfterQueueRef.current = revealOutcome;
        } else {
          revealOutcome();
        }
      }

      return durationSec;
    },
    [scheduleTimer, triggerRivalQuip, updateCodex]
  );

  const commitRef = useRef(commitDuelState);
  commitRef.current = commitDuelState;

  // Mount Three.js scene exactly once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    if (isHelloMode) {
      const bridge = mountHelloArenaScene(container, setHelloState);
      helloBridgeRef.current = bridge;
      return () => {
        bridge.dispose();
        helloBridgeRef.current = null;
      };
    }

    if (isLookDevMode) {
      const bridge = mountLookDevScene(container, setLookdevState);
      lookdevBridgeRef.current = bridge;
      return () => {
        bridge.dispose();
        lookdevBridgeRef.current = null;
      };
    }

    const bridge = mountDuelScene(container, {
      onBadgesUpdate: (nextBadges) => setBadges(nextBadges),
      onLaneRunesUpdate: (nextRunes) => setLaneRunes(nextRunes),
      onWorldPromptUpdate: (nextPrompts) => setWorldPrompts(nextPrompts),
      onHoverTargetChange: (target) => setHoverTarget(target),
      onQueueBusyChange: (busy) => {
        resolvingTurnRef.current = busy;
        setResolvingTurn(busy);
        if (!busy) {
          const after = pendingAfterQueueRef.current;
          if (after) {
            pendingAfterQueueRef.current = null;
            after();
          }
        }
      },
      onQueuedStep: (ev) => {
        if (ev.side !== 'enemy') return;
        const tr = getTranslations(langRef.current);
        let actionText: string | null = null;
        if (ev.type === 'overload') {
          actionText = tr.rivalActionOverload;
        } else if (ev.cardId) {
          actionText = tr.cardNames[ev.cardId] ?? ev.cardId;
        }
        if (actionText) {
          setRivalCallout(`${tr.enemyPrefix}: ${actionText}`);
        }
      },
      onRightClickLane: (lane) => {
        const cur = duelStateRef.current;
        if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
        const next = triggerRightClickLeap(cur, lane);
        if (next !== cur) {
          commitRef.current(next);
        } else {
          duelBridgeRef.current?.triggerVisualPulse(lane);
          etherAudio.playLeapPulse();
        }
      },
      onLeftClickLane: (side, lane) => {
        const cur = duelStateRef.current;
        if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;

        if (swapModeRef.current && side === 'player') {
          const src = swapSourceRef.current;
          if (src === null) {
            if (cur.playerBoard[lane]) {
              etherAudio.playUiSelect();
              setSwapSourceLane(lane);
            }
          } else if (src === lane) {
            setSwapSourceLane(null);
          } else {
            const next = swapPlayerLanes(cur, src, lane);
            if (next !== cur) {
              commitRef.current(next);
            } else {
              setSwapSourceLane(null);
              setSwapMode(false);
            }
          }
          return;
        }

        const handIdx = selectedHandRef.current;
        if (handIdx !== null) {
          if (side === 'player' && cur.playerBoard[lane]) {
            const fused = fuseCreatureFromHand(cur, handIdx, lane);
            if (fused !== cur) {
              commitRef.current(fused);
              return;
            }
          }
          const next = playCardFromHand(cur, handIdx, lane);
          if (next !== cur) {
            commitRef.current(next);
            return;
          }
        }
        if (side === 'player') {
          duelBridgeRef.current?.triggerVisualPulse(lane);
        }
      },
    });
    duelBridgeRef.current = bridge;
    bindEngineBridge({
      setPattern: (pattern) => bridge.setPattern(pattern),
      triggerPattern: (pattern) => bridge.triggerPattern(pattern),
    });
    bridge.syncExternalState({
      isMobile: isMobileRef.current,
      inputMode: hasTouchRef.current ? 'touch' : 'keyboard',
    });

    if (duelStateRef.current) {
      bridge.syncDuelState(duelStateRef.current, mapBodyDatasetState(shellModeRef.current));
      if (shellModeRef.current === 'playing') {
        bridge.triggerBattleStartVfx(duelStateRef.current.playerSchool);
      }
    } else {
      bridge.syncDuelState(null, 'title');
    }

    return () => {
      bindEngineBridge(null);
      bridge.dispose();
      duelBridgeRef.current = null;
    };
  }, [isHelloMode, isLookDevMode, bindEngineBridge]);

  // Sync document.body.dataset.state, RTL dir, and optional Dynamic music mode
  useEffect(() => {
    if (isHelloMode || isLookDevMode) return;
    document.body.dataset.state = mapBodyDatasetState(shellMode);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    const stIdx = duelState?.stageIndex ?? 0;
    const isBoss = duelState ? getOpponentForStage(stIdx).isBoss : false;
    etherAudio.syncDynamicContext(stIdx, isBoss, shellMode);
    duelBridgeRef.current?.setBriefingCamera(shellMode === 'briefing');
  }, [shellMode, rtl, lang, duelState?.stageIndex, isHelloMode, isLookDevMode]);

  useEffect(() => {
    duelBridgeRef.current?.syncExternalState({
      isMobile,
      inputMode: hasTouch ? 'touch' : 'keyboard',
    });
  }, [isMobile, hasTouch]);

  useEffect(() => {
    duelBridgeRef.current?.setCardSelected(selectedHandIndex !== null);
  }, [selectedHandIndex]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleToggleAudio = useCallback(() => {
    const nextMuted = !muted;
    etherAudio.setMuted(nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  const handleSelectGraphics = useCallback((q: GraphicsQuality) => {
    setGraphicsQuality(q);
    setGraphics(q);
  }, []);

  const handleToggleFastCombat = useCallback(() => {
    const next = !fastCombat;
    setFastCombat(next);
    setFastCombatState(next);
  }, [fastCombat]);

  const handleToggleHoverInspector = useCallback(() => {
    const next = !hoverInspector;
    setHoverInspector(next);
    setHoverInspectorState(next);
    if (!next) setHoverTarget(null);
  }, [hoverInspector]);

  const startStage = useCallback(
    (
      stageIndex: number,
      deck?: string[],
      showBriefing = true,
      overrides?: {
        relics?: RelicId[];
        forgedCards?: Record<string, number>;
        archonXp?: number;
        maxHpBonus?: number;
        startingResonanceBonus?: number;
        difficulty?: Difficulty;
        playerSchool?: MagicSchool;
        trialModifier?: TrialModifierId | null;
        seedOverride?: number;
      }
    ) => {
      clearPendingTimers();
      pendingAfterQueueRef.current = null;
      setResolvingTurn(false);
      setRivalCallout(null);
      setRivalCombatQuip(null);
      const effDiff = overrides?.difficulty ?? difficulty;
      const effSchool = overrides?.playerSchool ?? playerSchool;
      const effRelics = overrides?.relics ?? campaignRelics;
      const effForged = overrides?.forgedCards ?? forgedCards;
      const effXp = overrides?.archonXp ?? archonXp;
      const effHpBonus = overrides?.maxHpBonus ?? maxHpBonus;
      const effResBonus = overrides?.startingResonanceBonus ?? startingResonanceBonus;
      const effTrial =
        overrides?.trialModifier !== undefined
          ? overrides.trialModifier
          : (activeTrialRef.current?.modifier ?? null);
      const effSeed = overrides?.seedOverride ?? activeTrialRef.current?.seed ?? launch.seed;

      const fresh = createDuelState({
        stageIndex,
        difficulty: effDiff,
        playerSchool: effSchool,
        deck,
        relics: effRelics,
        forgedCards: effForged,
        archonRank: getArchonRank(effXp),
        maxHpBonus: effHpBonus,
        startingResonanceBonus: effResBonus,
        trialModifier: effTrial,
        enableLaneRunes: true,
        enableQuests: true,
        seed: effSeed + stageIndex * 101,
      });

      const runSnapshot: SavedCampaignRun = {
        stageIndex,
        difficulty: effDiff,
        playerSchool: effSchool,
        deck: fresh.playerDeck,
        relics: effRelics,
        forgedCards: effForged,
        archonXp: effXp,
        maxHpBonus: effHpBonus,
        startingResonanceBonus: effResBonus,
        trialModifier: effTrial,
      };
      saveCampaignRun(runSnapshot);
      setSavedRun(runSnapshot);

      const opp = getOpponentForStage(stageIndex);
      const nextMode: ShellMode = showBriefing && opp.hasCutscene ? 'briefing' : 'playing';
      etherAudio.playUiSelect();
      commitDuelState(fresh, nextMode);
      if (nextMode === 'playing') {
        duelBridgeRef.current?.triggerBattleStartVfx(fresh.playerSchool);
      }
    },
    [
      clearPendingTimers,
      difficulty,
      playerSchool,
      campaignRelics,
      forgedCards,
      archonXp,
      maxHpBonus,
      startingResonanceBonus,
      launch.seed,
      commitDuelState,
    ]
  );

  const handleStartCampaign = useCallback(() => {
    setActiveTrial(null);
    setCampaignRelics([]);
    setForgedCards({});
    setArchonXp(0);
    setLastXpGained(0);
    setMaxHpBonus(0);
    setStartingResonanceBonus(0);
    startStage(0, undefined, true, {
      relics: [],
      forgedCards: {},
      archonXp: 0,
      maxHpBonus: 0,
      startingResonanceBonus: 0,
      trialModifier: null,
      seedOverride: launch.seed,
    });
  }, [launch.seed, startStage]);

  const handleStartDailyTrial = useCallback(() => {
    setActiveTrial(dailyTrial);
    setDifficulty('archmage');
    setPlayerSchool(dailyTrial.school);
    setCampaignRelics([]);
    setForgedCards({});
    setArchonXp(0);
    setLastXpGained(0);
    setMaxHpBonus(0);
    setStartingResonanceBonus(0);
    startStage(0, undefined, true, {
      difficulty: 'archmage',
      playerSchool: dailyTrial.school,
      relics: [],
      forgedCards: {},
      archonXp: 0,
      maxHpBonus: 0,
      startingResonanceBonus: 0,
      trialModifier: dailyTrial.modifier,
      seedOverride: dailyTrial.seed,
    });
  }, [dailyTrial, startStage]);

  const handleHoverPower = useCallback((kind: ArchonPowerHoverKind | null) => {
    duelBridgeRef.current?.setPowerHoverPreview(kind, duelStateRef.current);
  }, []);

  const handlePlayCard = useCallback(
    (handIndex: number, anchor?: CardAnchorPoint) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const cardId = cur.playerHand[handIndex];
      const card = cardId ? CARD_CATALOG[cardId] : undefined;
      if (!card) return;
      const effCost = getCardEffectiveStats(card.id, cur.forgedCards).cost;

      duelBridgeRef.current?.setTargetingPreview(null);

      // In Ascend Mode, clicking an affordable creature selects it for board fusion instead of auto-summon
      if (ascendModeRef.current && card.type === 'creature' && !cur.altarMode && cur.playerEther >= effCost) {
        etherAudio.playUiSelect();
        setSelectedHandIndex(handIndex === selectedHandRef.current ? null : handIndex);
        return;
      }

      // Smart targeted spell selection when >= 2 targets exist on board
      if (
        !cur.altarMode &&
        cur.playerEther >= effCost &&
        isTargetedSpellCard(card.id, cur) &&
        selectedHandRef.current !== handIndex
      ) {
        etherAudio.playUiSelect();
        setSelectedHandIndex(handIndex);
        return;
      }

      const next = playCardFromHand(cur, handIndex);
      if (next !== cur) {
        if (anchor) {
          duelBridgeRef.current?.triggerCardCast(anchor.x, anchor.y, card.school);
        }
        commitDuelState(next);
      } else {
        setSelectedHandIndex(handIndex === selectedHandRef.current ? null : handIndex);
      }
    },
    [commitDuelState]
  );

  const handleTargetCreature = useCallback(
    (_side: 'player' | 'enemy', lane: number) => {
      const cur = duelStateRef.current;
      const handIdx = selectedHandRef.current;
      if (!cur || handIdx === null || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const next = playCardFromHand(cur, handIdx, lane);
      if (next !== cur) {
        commitDuelState(next);
      }
    },
    [commitDuelState]
  );

  const handlePerformMulligan = useCallback(
    (indices: number[]) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const next = performMulligan(cur, indices);
      if (next !== cur) commitDuelState(next);
    },
    [commitDuelState]
  );

  const handleFuseCreature = useCallback(
    (handIndex: number, lane: number) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const next = fuseCreatureFromHand(cur, handIndex, lane);
      if (next !== cur) commitDuelState(next);
    },
    [commitDuelState]
  );

  const handleToggleAscendMode = useCallback(() => {
    if (resolvingTurnRef.current) return;
    etherAudio.playUiSelect();
    setSwapMode(false);
    setSwapSourceLane(null);
    setAscendMode((v) => {
      if (v) setSelectedHandIndex(null);
      return !v;
    });
  }, []);

  const handleToggleSwapMode = useCallback(() => {
    if (resolvingTurnRef.current) return;
    etherAudio.playUiSelect();
    setAscendMode(false);
    setSelectedHandIndex(null);
    setSwapSourceLane(null);
    setSwapMode((v) => !v);
  }, []);

  const handleSelectSwapLane = useCallback(
    (lane: number) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const src = swapSourceRef.current;
      if (src === null) {
        if (cur.playerBoard[lane]) {
          etherAudio.playUiSelect();
          setSwapSourceLane(lane);
        }
        return;
      }
      if (src === lane) {
        setSwapSourceLane(null);
        return;
      }
      const next = swapPlayerLanes(cur, src, lane);
      if (next !== cur) {
        commitDuelState(next);
      } else {
        setSwapSourceLane(null);
        setSwapMode(false);
      }
    },
    [commitDuelState]
  );

  const handleToggleStance = useCallback(
    (lane: number) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const next = toggleCreatureStance(cur, lane);
      if (next !== cur) commitDuelState(next);
    },
    [commitDuelState]
  );

  const handleTriggerAbility = useCallback(
    (lane: number) => {
      const cur = duelStateRef.current;
      if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
      const next = triggerCreatureAbility(cur, lane);
      if (next !== cur) commitDuelState(next);
    },
    [commitDuelState]
  );

  const handleOverload = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerOverload(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleAltar = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    etherAudio.playUiSelect();
    setDuelState(toggleAltarMode(cur));
  }, []);

  const handleUltimatum = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerUltimatum(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleLeap = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerRightClickLeap(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleChronoRewind = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerChronoRewind(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleSoulTether = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerSoulTether(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleResonance = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    const next = triggerResonanceApotheosis(cur);
    if (next !== cur) commitDuelState(next);
  }, [commitDuelState]);

  const handleEndTurn = useCallback(() => {
    const cur = duelStateRef.current;
    if (!cur || shellModeRef.current !== 'playing' || resolvingTurnRef.current) return;
    setRivalCallout(null);
    const next = resolvePlayerEndTurn(cur);
    const summary = next.lastAiSummary;
    const showStaticRivalSummary = () => {
      if (next.phase === 'player_main' && summary && !summary.acted) {
        const reason =
          summary.passedReason === 'board_full' ? t.rivalActionBoardFull : t.rivalActionSaved;
        setRivalCallout(`${t.enemyPrefix}: ${reason}`);
      }
      scheduleTimer(() => setRivalCallout(null), 1600);
    };

    const durationSec = commitDuelState(next);
    if (next.phase === 'player_main' && duelBridgeRef.current && durationSec > 0.05) {
      pendingAfterQueueRef.current = () => {
        showStaticRivalSummary();
        etherAudio.playCardDraw();
        etherAudio.playTurnBell();
      };
    } else if (next.phase === 'player_main') {
      showStaticRivalSummary();
      etherAudio.playCardDraw();
      etherAudio.playTurnBell();
    }
  }, [commitDuelState, scheduleTimer, t]);

  const handleSelectPreset = useCallback((p: CameraPreset) => {
    setPreset(p);
    duelBridgeRef.current?.setPreset(p);
  }, []);

  // Keyboard shortcuts + window blur hygiene
  useEffect(() => {
    if (isHelloMode || isLookDevMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT')) return;

      if (e.key === '?' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleAudio();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        etherAudio.prevTrack();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        etherAudio.nextTrack();
        return;
      }

      if (showCodexRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCodex(false);
        }
        return;
      }

      if (showHelpRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowHelp(false);
        }
        return;
      }

      const curMode = shellModeRef.current;
      if (curMode === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartCampaign();
        return;
      }
      if (curMode === 'briefing' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        etherAudio.playUiSelect();
        setShellMode('playing');
        duelBridgeRef.current?.syncDuelState(duelStateRef.current, 'playing');
        duelBridgeRef.current?.triggerBattleStartVfx(duelStateRef.current?.playerSchool);
        return;
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (curMode === 'playing') {
          e.preventDefault();
          setShellMode('paused');
          duelBridgeRef.current?.syncDuelState(duelStateRef.current, 'paused');
        } else if (curMode === 'paused') {
          e.preventDefault();
          setShellMode('playing');
          duelBridgeRef.current?.syncDuelState(duelStateRef.current, 'playing');
        }
        return;
      }
      if (curMode === 'playing') {
        if (e.key === ' ') {
          e.preventDefault();
          handleOverload();
        } else if (e.key.toLowerCase() === 'e' && !resolvingTurnRef.current) {
          e.preventDefault();
          handleEndTurn();
        } else if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          setPreset((prev) => {
            const next: CameraPreset =
              prev === 'combat' ? 'closeup' : prev === 'closeup' ? 'wide' : 'combat';
            duelBridgeRef.current?.setPreset(next);
            return next;
          });
        }
      }
    };

    const onBlur = () => setSelectedHandIndex(null);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    isHelloMode,
    isLookDevMode,
    handleStartCampaign,
    handleOverload,
    handleEndTurn,
    handleToggleAudio,
  ]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#0C0A14]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={mountRef} className="h-full w-full" />

      {isHelloMode ? (
        <HelloHud
          state={helloState}
          onToggleOverload={() => helloBridgeRef.current?.toggleOverload()}
          onReset={() => helloBridgeRef.current?.reset()}
        />
      ) : isLookDevMode ? (
        <LookDevHud
          state={lookdevState}
          onSelectPreset={(p: LookDevPreset) => lookdevBridgeRef.current?.setPreset(p)}
          onToggleOverload={() => lookdevBridgeRef.current?.toggleOverload()}
        />
      ) : (
        <>
          {shellMode === 'title' && (
            <TitleScreen
              t={t}
              lang={lang}
              difficulty={difficulty}
              school={playerSchool}
              graphics={graphics}
              fastCombat={fastCombat}
              hoverInspector={hoverInspector}
              muted={muted}
              isFullscreen={isFullscreen}
              isMobile={isMobile}
              canContinue={Boolean(
                (duelState && duelState.phase === 'player_main') || savedRun
              )}
              savedStageIndex={
                duelState && duelState.phase === 'player_main'
                  ? duelState.stageIndex
                  : (savedRun?.stageIndex ?? null)
              }
              archonRank={getArchonRank(
                duelState && duelState.phase === 'player_main'
                  ? archonXp
                  : (savedRun?.archonXp ?? archonXp)
              )}
              bestStage={bestStage}
              dailyTrial={dailyTrial}
              codex={codexSave}
              onSelectLang={setLang}
              onSelectDifficulty={setDifficulty}
              onSelectSchool={setPlayerSchool}
              onSelectGraphics={handleSelectGraphics}
              onToggleFastCombat={handleToggleFastCombat}
              onToggleHoverInspector={handleToggleHoverInspector}
              onStart={handleStartCampaign}
              onStartDailyTrial={handleStartDailyTrial}
              onContinue={() => {
                etherAudio.playUiSelect();
                if (duelState && duelState.phase === 'player_main') {
                  setShellMode('playing');
                  duelBridgeRef.current?.syncDuelState(duelState, 'playing');
                } else if (savedRun) {
                  setDifficulty(savedRun.difficulty);
                  setPlayerSchool(savedRun.playerSchool);
                  setCampaignRelics(savedRun.relics);
                  setForgedCards(savedRun.forgedCards);
                  setArchonXp(savedRun.archonXp);
                  setMaxHpBonus(savedRun.maxHpBonus);
                  setStartingResonanceBonus(savedRun.startingResonanceBonus);
                  setActiveTrial(
                    savedRun.trialModifier ? { ...dailyTrial, modifier: savedRun.trialModifier } : null
                  );
                  startStage(savedRun.stageIndex, savedRun.deck, true, savedRun);
                }
              }}
              onOpenCodex={() => setShowCodex(true)}
              onOpenHelp={() => setShowHelp(true)}
              onToggleAudio={handleToggleAudio}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )}

          {shellMode !== 'title' && shellMode !== 'briefing' && duelState && (
            <DuelHud
              t={t}
              state={duelState}
              badges={badges}
              laneRunes={laneRunes}
              worldPrompts={worldPrompts}
              hoverTarget={shellMode === 'playing' && hoverInspector ? hoverTarget : null}
              preset={preset}
              isMobile={isMobile}
              selectedHandIndex={selectedHandIndex}
              swapMode={swapMode}
              swapSourceLane={swapSourceLane}
              ascendMode={ascendMode}
              isTargetingSpell={Boolean(
                selectedHandIndex !== null &&
                  duelState.playerHand[selectedHandIndex] &&
                  !duelState.altarMode &&
                  isTargetedSpellCard(duelState.playerHand[selectedHandIndex], duelState)
              )}
              resolvingTurn={resolvingTurn}
              rivalCallout={rivalCallout}
              rivalCombatQuip={rivalCombatQuip}
              graphicsLevel={GRAPHICS_LEVEL[graphics]}
              graphics={graphics}
              fastCombat={fastCombat}
              hoverInspector={hoverInspector}
              muted={muted}
              isFullscreen={isFullscreen}
              onSelectPreset={handleSelectPreset}
              onSelectGraphics={handleSelectGraphics}
              onToggleFastCombat={handleToggleFastCombat}
              onToggleHoverInspector={handleToggleHoverInspector}
              onTriggerPattern={(pattern) => {
                selectPattern(pattern);
                duelBridgeRef.current?.triggerPattern(pattern);
              }}
              onSelectCard={handlePlayCard}
              onHoverPower={handleHoverPower}
              onTargetCreature={handleTargetCreature}
              onHoverCard={(idx, anchor) => {
                if (idx !== null) etherAudio.playCardHover();
                duelBridgeRef.current?.setCardSelected(idx !== null || selectedHandRef.current !== null);
                if (idx !== null && anchor && duelState) {
                  const cardId = duelState.playerHand[idx];
                  const card = cardId ? CARD_CATALOG[cardId] : undefined;
                  if (card) {
                    const effKind = card.spellEffect?.kind;
                    const targetSide =
                      card.type === 'ritual' ||
                      card.type === 'creature' ||
                      card.type === 'enchantment' ||
                      card.type === 'trap' ||
                      effKind === 'buff_ally' ||
                      effKind === 'gain_ether' ||
                      effKind === 'heal_and_buff' ||
                      effKind === 'double_hp_armor'
                        ? 'player'
                        : 'enemy';
                    duelBridgeRef.current?.setTargetingPreview({
                      startX: anchor.x,
                      startY: anchor.y,
                      kind: card.type,
                      targetSide,
                      school: card.school,
                      altarMode: duelState.altarMode,
                    });
                    return;
                  }
                }
                duelBridgeRef.current?.setTargetingPreview(null);
              }}
              onPerformMulligan={handlePerformMulligan}
              onFuseCreature={handleFuseCreature}
              onToggleAscendMode={handleToggleAscendMode}
              onToggleSwapMode={handleToggleSwapMode}
              onSelectSwapLane={handleSelectSwapLane}
              onToggleStance={handleToggleStance}
              onTriggerAbility={handleTriggerAbility}
              onTriggerOverload={handleOverload}
              onToggleAltar={handleAltar}
              onTriggerUltimatum={handleUltimatum}
              onTriggerLeap={handleLeap}
              onTriggerChronoRewind={handleChronoRewind}
              onTriggerSoulTether={handleSoulTether}
              onTriggerResonance={handleResonance}
              onEndTurn={handleEndTurn}
              onOpenHelp={() => setShowHelp(true)}
              onOpenMenu={() => {
                setShellMode('paused');
                duelBridgeRef.current?.syncDuelState(duelState, 'paused');
              }}
              onToggleAudio={handleToggleAudio}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )}

          {shellMode === 'briefing' && duelState && (
            <BriefingModal
              t={t}
              stageIndex={duelState.stageIndex}
              opponentSchool={getOpponentForStage(duelState.stageIndex).school}
              playerSchool={duelState.playerSchool}
              archonRank={getArchonRank(archonXp)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onContinue={() => {
                etherAudio.playUiSelect();
                setShellMode('playing');
                duelBridgeRef.current?.syncDuelState(duelState, 'playing');
                duelBridgeRef.current?.triggerBattleStartVfx(duelState.playerSchool);
              }}
            />
          )}

          {shellMode === 'paused' && (
            <PauseModal
              t={t}
              lang={lang}
              difficulty={difficulty}
              graphics={graphics}
              fastCombat={fastCombat}
              hoverInspector={hoverInspector}
              isFullscreen={isFullscreen}
              onSelectLang={setLang}
              onSelectDifficulty={setDifficulty}
              onSelectGraphics={handleSelectGraphics}
              onToggleFastCombat={handleToggleFastCombat}
              onToggleHoverInspector={handleToggleHoverInspector}
              onToggleFullscreen={handleToggleFullscreen}
              onOpenCodex={() => setShowCodex(true)}
              onOpenHelp={() => setShowHelp(true)}
              onResume={() => {
                setShellMode('playing');
                duelBridgeRef.current?.syncDuelState(duelState, 'playing');
              }}
              onRestart={() => {
                const idx = duelState?.stageIndex ?? 0;
                startStage(idx, duelState?.playerDeck, false);
              }}
              onExitToMenu={() => {
                setShellMode('title');
                duelBridgeRef.current?.syncDuelState(null, 'title');
              }}
            />
          )}

          {shellMode === 'draft' && duelState && (
            <DraftModal
              t={t}
              choices={draftChoices}
              relicChoices={relicChoices}
              activeRelics={campaignRelics}
              deck={duelState.playerDeck}
              stageIndex={duelState.stageIndex}
              archonXp={archonXp}
              xpGained={lastXpGained}
              forgedCards={forgedCards}
              defeatedOpponentId={getOpponentForStage(duelState.stageIndex).id}
              defeatedSchool={getOpponentForStage(duelState.stageIndex).school}
              playerSchool={duelState.playerSchool}
              quest={duelState.activeQuest}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onConfirmDraft={(newCardId: string, sanctuary: SanctuaryAction, pickedRelic) => {
                const nextRelics = pickedRelic ? [...campaignRelics, pickedRelic] : campaignRelics;
                setCampaignRelics(nextRelics);

                let upgradedDeck = duelState.playerDeck;
                let nextForged = forgedCards;
                let nextHpBonus = maxHpBonus + (duelState.activeQuest?.completed ? 1 : 0);
                if (duelState.activeQuest?.completed) {
                  setMaxHpBonus(nextHpBonus);
                }
                let nextResBonus = startingResonanceBonus;

                if (sanctuary.kind === 'replace') {
                  upgradedDeck = applyDraftReplacement(
                    duelState.playerDeck,
                    newCardId,
                    sanctuary.replaceIndex
                  );
                } else if (sanctuary.kind === 'forge') {
                  etherAudio.playForge();
                  nextForged = {
                    ...forgedCards,
                    [sanctuary.targetCardId]: Math.min(
                      2,
                      (forgedCards[sanctuary.targetCardId] ?? 0) + 1
                    ),
                  };
                  setForgedCards(nextForged);
                  if (duelState.playerDeck.length < 16) {
                    upgradedDeck = applyDraftReplacement(duelState.playerDeck, newCardId, null);
                  }
                } else if (sanctuary.kind === 'shrine') {
                  etherAudio.playAscend();
                  nextHpBonus = maxHpBonus + 3;
                  nextResBonus = Math.min(5, startingResonanceBonus + 2);
                  setMaxHpBonus(nextHpBonus);
                  setStartingResonanceBonus(nextResBonus);
                  if (duelState.playerDeck.length < 16) {
                    upgradedDeck = applyDraftReplacement(duelState.playerDeck, newCardId, null);
                  }
                } else if (sanctuary.kind === 'purge') {
                  const purged = applySanctuaryPurge(duelState.playerDeck, sanctuary.removeIndex);
                  upgradedDeck = applyDraftReplacement(purged, newCardId, null);
                }

                updateCodex((prev) => {
                  let updated = recordCardsDiscovered(prev, [newCardId, ...upgradedDeck]);
                  updated = recordRelicsDiscovered(updated, nextRelics);
                  if (sanctuary.kind === 'forge') {
                    updated = recordForgeCompleted(updated);
                  }
                  return updated;
                });

                const nextStage = duelState.stageIndex + 1;
                if (nextStage === 2 || nextStage === 4) {
                  setCrossroadsOptions(getCrossroadsOptions(nextStage, duelState.seed));
                  setPendingCrossroadsPayload({
                    nextStage,
                    deck: upgradedDeck,
                    relics: nextRelics,
                    forgedCards: nextForged,
                    archonXp,
                    maxHpBonus: nextHpBonus,
                    startingResonanceBonus: nextResBonus,
                  });
                  setShellMode('crossroads');
                  duelBridgeRef.current?.syncDuelState(duelState, 'paused');
                  return;
                }

                startStage(nextStage, upgradedDeck, true, {
                  relics: nextRelics,
                  forgedCards: nextForged,
                  archonXp,
                  maxHpBonus: nextHpBonus,
                  startingResonanceBonus: nextResBonus,
                });
              }}
            />
          )}

          {shellMode === 'crossroads' && pendingCrossroadsPayload && (
            <CrossroadsModal
              t={t}
              stageIndex={pendingCrossroadsPayload.nextStage}
              options={crossroadsOptions}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onChoose={(eventId: CrossroadsEventId) => {
                etherAudio.playAscend();
                const res = applyCrossroadsChoice({
                  eventId,
                  deck: pendingCrossroadsPayload.deck,
                  forgedCards: pendingCrossroadsPayload.forgedCards,
                  relics: pendingCrossroadsPayload.relics,
                  maxHpBonus: pendingCrossroadsPayload.maxHpBonus,
                  startingResonanceBonus: pendingCrossroadsPayload.startingResonanceBonus,
                  seed: (duelState?.seed ?? launch.seed) + 55,
                });
                setCampaignRelics(res.relics);
                setForgedCards(res.forgedCards);
                setMaxHpBonus(res.maxHpBonus);
                setStartingResonanceBonus(res.startingResonanceBonus);
                updateCodex((prev) => {
                  let updated = recordRelicsDiscovered(prev, res.relics);
                  if (eventId === 'astral_anvil' && res.outcomeCardId) {
                    updated = recordForgeCompleted(updated);
                  }
                  return updated;
                });
                const nextStage = pendingCrossroadsPayload.nextStage;
                setPendingCrossroadsPayload(null);
                startStage(nextStage, res.deck, true, {
                  relics: res.relics,
                  forgedCards: res.forgedCards,
                  archonXp: pendingCrossroadsPayload.archonXp,
                  maxHpBonus: res.maxHpBonus,
                  startingResonanceBonus: res.startingResonanceBonus,
                });
              }}
            />
          )}

          {shellMode === 'gameover' && duelState && (
            <GameOverModal
              t={t}
              state={duelState}
              isVictory={duelState.phase === 'victory'}
              isCampaignComplete={duelState.phase === 'victory' && duelState.stageIndex >= 6}
              xpGained={lastXpGained}
              archonXp={archonXp}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onNextDuel={() => startStage(duelState.stageIndex + 1, duelState.playerDeck, true)}
              onPlayAgain={activeTrial ? handleStartDailyTrial : handleStartCampaign}
              onExitToMenu={() => {
                pendingAfterQueueRef.current = null;
                setResolvingTurn(false);
                setRivalCallout(null);
                setRivalCombatQuip(null);
                setDuelState(null);
                setShellMode('title');
                duelBridgeRef.current?.syncDuelState(null, 'title');
              }}
            />
          )}

          {showHelp && (
            <HelpModal
              t={t}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onClose={() => setShowHelp(false)}
            />
          )}
          {showCodex && (
            <CodexModal
              t={t}
              codex={codexSave}
              dailyTrial={dailyTrial}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onClose={() => setShowCodex(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HudSettingsProvider>
      <AppContent />
    </HudSettingsProvider>
  );
}
