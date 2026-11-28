import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { publishGameHandle, publishMetrics } from '../core/events';
import { createCathedralHdriEnvironment } from './materials/proceduralNoise';
import { createCinematicPipeline } from './postprocessing/cinematicPipeline';
import {
  getFastCombat,
  getGraphicsDetailTier,
  getGraphicsLevel,
  getHoverInspector,
  GRAPHICS_LEVEL,
  subscribeFastCombat,
  subscribeGraphicsQuality,
  subscribeHoverInspector,
  type DetailTier,
} from '../core/graphicsSettings';
import { readLaunchParams } from '../core/rng';
import { CARD_CATALOG } from '../game/cards';
import {
  getOpponentForStage,
  type BoardCreature,
  type CombatEvent,
  type DuelState,
  type LaneRuneKind,
} from '../game/duelEngine';
import { buildArenaEnvironment } from './assets/arenaEnv';
import { buildCombatVfx3d } from './assets/combatVfx3d';
import { buildCreatureTotem, type CreatureTotemHandle, type MagicSchool } from './assets/creatureTotems';
import { buildDemiurgeSculpt } from './assets/demiurgeSculpts';
import { buildEtherVfx } from './assets/etherVfx';
import { createTarotMaterialLibrary, TAROT_PALETTE } from './materials/tarotMaterials';
import { AnimationQueue, type AnimationStep } from './animationQueue';
import { VfxOverlay2D } from './vfxOverlay2d';
import { etherAudio } from '../audio/etherAudio';
import { filterHoveredLaneRunes, type LaneRuneTarget } from '../ui/hudLogic';

export type CameraPreset = 'combat' | 'closeup' | 'wide';

export type HoverTargetInfo =
  | { kind: 'creature'; uid: string; x: number; y: number }
  | { kind: 'archon'; side: 'player' | 'enemy'; x: number; y: number };

export interface ProjectedBadge {
  uid: string;
  cardId: string;
  school: MagicSchool;
  side: 'player' | 'enemy';
  lane: number;
  atk: number;
  hp: number;
  maxHp: number;
  veteranCount: number;
  shielded: boolean;
  stance: 'attack' | 'guard';
  exhausted: boolean;
  activeAbility?: string;
  abilityUsed: boolean;
  x: number;
  y: number;
  visible: boolean;
}

export interface ProjectedLaneRune {
  side: 'player' | 'enemy';
  lane: number;
  kind: LaneRuneKind;
  x: number;
  y: number;
}

export interface ExternalDeviceState {
  isMobile: boolean;
  inputMode: 'touch' | 'keyboard';
}

export interface TargetingPreview {
  startX: number;
  startY: number;
  kind: 'creature' | 'spell' | 'ritual' | 'enchantment' | 'trap';
  targetSide: 'player' | 'enemy';
  school: MagicSchool;
  altarMode?: boolean;
}

export type ArchonPowerHoverKind = 'chrono_rewind' | 'soul_tether' | 'resonance';

export type ArcanePatternId = 'triangle' | 'star' | 'circle' | 'decoy';

export interface WorldPromptInfo {
  id: string;
  x: number;
  y: number;
  kind: 'summon' | 'leap';
}

export interface DuelSceneBridge {
  syncDuelState: (state: DuelState | null, mode: 'title' | 'playing' | 'paused' | 'gameover') => number;
  syncExternalState: (ext: ExternalDeviceState) => void;
  setPreset: (preset: CameraPreset) => void;
  setBriefingCamera: (active: boolean) => void;
  setCardSelected: (selected: boolean) => void;
  setPattern: (pattern: ArcanePatternId) => void;
  triggerPattern: (pattern?: ArcanePatternId) => void;
  setTargetingPreview: (preview: TargetingPreview | null) => void;
  setPowerHoverPreview: (kind: ArchonPowerHoverKind | null, snapshot?: DuelState | null) => void;
  triggerCardCast: (x: number, y: number, school: MagicSchool) => void;
  triggerVisualPulse: (lane?: number) => void;
  triggerBattleStartVfx: (school?: MagicSchool) => void;
  dispose: () => void;
}

const PRESET_VIEWS: Record<CameraPreset, { pos: [number, number, number]; look: [number, number, number] }> = {
  combat: { pos: [-1.85, 6.7, 13.9], look: [0.05, 0.45, 0.65] },
  closeup: { pos: [3.25, 2.35, 7.6], look: [0.0, 1.32, 3.0] },
  wide: { pos: [8.6, 7.2, 12.2], look: [0, 1.1, -0.8] },
};

const PLAYER_LANE_X = [-3.0, -1.0, 1.0, 3.0];
const ENEMY_LANE_X = [-3.0, -1.0, 1.0, 3.0];

const _proj = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _arenaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _tmpPreviewTarget = new THREE.Vector3();
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) ?? '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function schoolColorIndex(school?: MagicSchool): number {
  if (school === 'chaos') return 2;
  if (school === 'vital') return 3;
  if (school === 'synth') return 1;
  return 0;
}

function schoolSlotHex(school?: MagicSchool): number {
  if (school === 'kinet') return 0x5ec8be;
  if (school === 'vital') return 0x5fd385;
  if (school === 'chaos') return 0xec5b44;
  if (school === 'synth') return 0x8bb6e0;
  return 0x9c7c3b;
}

function createSlotSigilTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 82, 0, Math.PI * 2);
  ctx.stroke();

  // 8-pointed arcane star
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62);
    ctx.lineTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const x = cx + Math.cos(a) * 74;
    const y = cy + Math.sin(a) * 74;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function mountDuelScene(
  container: HTMLElement,
  callbacks: {
    onBadgesUpdate: (badges: ProjectedBadge[]) => void;
    onLaneRunesUpdate?: (runes: ProjectedLaneRune[]) => void;
    onWorldPromptUpdate?: (prompts: WorldPromptInfo[]) => void;
    onRightClickLane: (lane: number) => void;
    onLeftClickLane: (side: 'player' | 'enemy', lane: number) => void;
    onHoverTargetChange?: (target: HoverTargetInfo | null) => void;
    onQueueBusyChange?: (busy: boolean) => void;
    onQueuedStep?: (ev: CombatEvent) => void;
  }
): DuelSceneBridge {
  const launch = readLaunchParams(window.location.search);
  const isSoftwareGl = detectSoftwareGl();

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1f1d33);
  scene.fog = new THREE.FogExp2(0x1f1d33, 0.0105);

  const computeResponsiveFov = (w: number, h: number): number => {
    const aspect = w / Math.max(1, h);
    return aspect < 1 ? Math.min(66, 42 / Math.max(0.64, aspect)) : 42;
  };

  const camera = new THREE.PerspectiveCamera(computeResponsiveFov(width, height), width / height, 0.1, 95);
  _camPos.set(...PRESET_VIEWS.combat.pos);
  _camLook.set(...PRESET_VIEWS.combat.look);
  camera.position.copy(_camPos);
  camera.lookAt(_camLook);

  let currentGraphicsLevel = getGraphicsLevel();
  let isMobileMode = false;
  let inputMode: 'touch' | 'keyboard' = 'keyboard';
  const computeTargetDpr = (level: number): number => {
    if (isSoftwareGl) return 1;
    const nativeDpr = window.devicePixelRatio || 1;
    if (level >= GRAPHICS_LEVEL.high) return Math.min(nativeDpr, isMobileMode ? 1.5 : 2);
    if (level >= GRAPHICS_LEVEL.medium) return Math.min(nativeDpr, 1.5);
    return Math.min(nativeDpr, 1.25);
  };

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && currentGraphicsLevel >= GRAPHICS_LEVEL.medium,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(computeTargetDpr(currentGraphicsLevel));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl && currentGraphicsLevel >= GRAPHICS_LEVEL.high;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  container.appendChild(renderer.domElement);

  const vfx2d = new VfxOverlay2D(container);

  const cathedralEnvTex = createCathedralHdriEnvironment(renderer);
  scene.environment = cathedralEnvTex;
  scene.environmentIntensity = 1.06;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const mats = createTarotMaterialLibrary(maxAniso, launch.seed);
  const contactTex = mats.contactTex;

  // Cathedral Lighting Rig: balanced twilight sky fill + warm key + camera-side fill + teal rim
  const hemi = new THREE.HemisphereLight(0x9ab5dc, 0x382d47, 1.32);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffe4b8, 1.75);
  keyLight.position.set(7.0, 12.0, 6.0);
  keyLight.castShadow = !isSoftwareGl && currentGraphicsLevel >= GRAPHICS_LEVEL.high;
  const initShadowRes = currentGraphicsLevel >= GRAPHICS_LEVEL.high ? 2048 : 1024;
  keyLight.shadow.mapSize.set(initShadowRes, initShadowRes);
  keyLight.shadow.camera.left = -8.8;
  keyLight.shadow.camera.right = 8.8;
  keyLight.shadow.camera.top = 8.8;
  keyLight.shadow.camera.bottom = -8.8;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 32;
  keyLight.shadow.camera.updateProjectionMatrix();
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Soft camera-side fill so player-side Demiurge & creature backs show clear bronze/cloth detail
  const frontFillLight = new THREE.DirectionalLight(0xc4d8f5, 0.94);
  frontFillLight.position.set(-6.5, 6.2, 11.5);
  scene.add(frontFillLight);

  const rimLight = new THREE.DirectionalLight(TAROT_PALETTE.ether, 1.08);
  rimLight.position.set(-7, 5, -8.5);
  scene.add(rimLight);

  const channelLight = new THREE.PointLight(TAROT_PALETTE.ether, 0.85, 18, 1.4);
  channelLight.position.set(0, 6.2, 1.0);
  scene.add(channelLight);

  // Subtle warm back-rim accent light separating the Archons & frontline totems on High+
  const heroRimAccentLight = new THREE.PointLight(0xffcb78, 0.9, 15, 1.45);
  heroRimAccentLight.position.set(0, 4.4, 3.1);
  heroRimAccentLight.visible = currentGraphicsLevel >= GRAPHICS_LEVEL.high;
  scene.add(heroRimAccentLight);

  // Clerestory Studio RectAreaLight Rim Panels (hardware WebGL2 only, High/Ultra tiers)
  let warmClerestoryLight: THREE.RectAreaLight | null = null;
  let coolClerestoryLight: THREE.RectAreaLight | null = null;
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    warmClerestoryLight = new THREE.RectAreaLight(0xffe1a8, 2.6, 6.5, 4.2);
    warmClerestoryLight.position.set(9.5, 6.2, 2.5);
    warmClerestoryLight.lookAt(0, 1.4, 0);
    warmClerestoryLight.visible = currentGraphicsLevel >= GRAPHICS_LEVEL.high;
    scene.add(warmClerestoryLight);

    coolClerestoryLight = new THREE.RectAreaLight(0x66ddd2, 2.2, 6.5, 4.2);
    coolClerestoryLight.position.set(-9.5, 5.8, -2.5);
    coolClerestoryLight.lookAt(0, 1.4, 0);
    coolClerestoryLight.visible = currentGraphicsLevel >= GRAPHICS_LEVEL.high;
    scene.add(coolClerestoryLight);
  }

  const arena = buildArenaEnvironment(mats);
  scene.add(arena.group);

  let currentStageIdx = 0;
  let enemyShattered = false;
  let cardSelected = false;
  let overloadVisualState = false;
  let resonanceVisualLevel = 0;
  let soulTetherVisualState = false;
  let currentDetailTier: DetailTier = getGraphicsDetailTier(currentGraphicsLevel);

  let playerDemiurge = buildDemiurgeSculpt('player', mats, contactTex, 0, currentDetailTier);
  playerDemiurge.group.position.set(0, 0.34, 4.8);
  playerDemiurge.group.rotation.y = Math.PI * 0.88;
  scene.add(playerDemiurge.group);

  let enemyDemiurge = buildDemiurgeSculpt('enemy', mats, contactTex, currentStageIdx, currentDetailTier);
  enemyDemiurge.group.position.set(0, 0.34, -4.8);
  enemyDemiurge.group.rotation.y = 0.08;
  scene.add(enemyDemiurge.group);

  const arenaVfx = buildEtherVfx(launch.seed);
  arenaVfx.setSchoolTheme(getOpponentForStage(0).school);
  scene.add(arenaVfx.group);

  const combatVfx3d = buildCombatVfx3d();
  combatVfx3d.setGraphicsLevel(currentGraphicsLevel);
  scene.add(combatVfx3d.group);

  // Reactive School Sigil Slots beneath all 8 lanes (4 Player + 4 Enemy)
  const slotSigilTex = createSlotSigilTexture(maxAniso);
  const slotSigilGeo = new THREE.PlaneGeometry(1.18, 1.18);
  slotSigilGeo.rotateX(-Math.PI / 2);
  const slotRingGeo = new THREE.RingGeometry(0.49, 0.55, 8);
  slotRingGeo.rotateX(-Math.PI / 2);

  interface SlotVisual {
    side: 'player' | 'enemy';
    lane: number;
    sigilMesh: THREE.Mesh;
    sigilMat: THREE.MeshStandardMaterial;
    curRingColor: THREE.Color;
    targetColor: THREE.Color;
    targetOpacity: number;
  }
  const slotRingInstMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x302512,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.32,
    transparent: true,
    opacity: 0.52,
  });
  const slotRingInstanced = new THREE.InstancedMesh(slotRingGeo, slotRingInstMat, 8);
  slotRingInstanced.frustumCulled = false;
  const _ringDummy = new THREE.Object3D();
  const _ringColorTmp = new THREE.Color();

  const slotVisuals: SlotVisual[] = [];
  (['player', 'enemy'] as const).forEach((side) => {
    for (let i = 0; i < 4; i++) {
      const lx = side === 'player' ? PLAYER_LANE_X[i] : ENEMY_LANE_X[i];
      const lz = side === 'player' ? 1.75 : -1.75;
      const instIdx = slotVisuals.length;

      const sigilMat = new THREE.MeshStandardMaterial({
        map: slotSigilTex,
        emissiveMap: slotSigilTex,
        color: 0x9c7c3b,
        emissive: 0x9c7c3b,
        emissiveIntensity: 1.3,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sigilMesh = new THREE.Mesh(slotSigilGeo, sigilMat);
      sigilMesh.position.set(lx, 0.014, lz);
      sigilMesh.renderOrder = 1;
      scene.add(sigilMesh);

      _ringDummy.position.set(lx, 0.02, lz);
      _ringDummy.updateMatrix();
      slotRingInstanced.setMatrixAt(instIdx, _ringDummy.matrix);
      _ringColorTmp.setHex(0xc49c48).multiplyScalar(0.45);
      slotRingInstanced.setColorAt(instIdx, _ringColorTmp);

      slotVisuals.push({
        side,
        lane: i,
        sigilMesh,
        sigilMat,
        curRingColor: _ringColorTmp.clone(),
        targetColor: new THREE.Color(0x9c7c3b),
        targetOpacity: 0.22,
      });
    }
  });
  slotRingInstanced.instanceMatrix.needsUpdate = true;
  if (slotRingInstanced.instanceColor) slotRingInstanced.instanceColor.needsUpdate = true;
  scene.add(slotRingInstanced);

  // Pooled 3D Target Beacon for Archon Power Hover Previews (Chrono-Rewind / Soul Tether / Resonance)
  const previewBeaconRingGeo = new THREE.RingGeometry(0.45, 0.56, 20);
  previewBeaconRingGeo.rotateX(-Math.PI / 2);
  const previewBeaconBeamGeo = new THREE.CylinderGeometry(0.18, 0.34, 1.5, 16, 1, true);
  const previewBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffe08a,
    emissiveIntensity: 1.45,
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const previewBeaconGroup = new THREE.Group();
  const previewBeaconRing = new THREE.Mesh(previewBeaconRingGeo, previewBeaconMat);
  previewBeaconRing.position.y = 0.04;
  const previewBeaconBeam = new THREE.Mesh(previewBeaconBeamGeo, previewBeaconMat);
  previewBeaconBeam.position.y = 0.78;
  previewBeaconGroup.add(previewBeaconRing, previewBeaconBeam);
  previewBeaconGroup.visible = false;
  scene.add(previewBeaconGroup);

  // Volumetric 3D Magical Hover Seal (Hexagonal outer torus + counter-rotating diamond ring + soft ward sheath)
  const hoverSealOuterGeo = new THREE.TorusGeometry(0.72, 0.032, 6, 6);
  hoverSealOuterGeo.rotateX(Math.PI / 2);
  const hoverSealInnerGeo = new THREE.TorusGeometry(0.49, 0.022, 6, 4);
  hoverSealInnerGeo.rotateX(Math.PI / 2);
  const hoverSealBeamGeo = new THREE.CylinderGeometry(0.56, 0.72, 0.92, 6, 1, true);
  const hoverSealOuterMat = new THREE.MeshStandardMaterial({
    color: 0xffe29a,
    emissive: 0xffe29a,
    emissiveIntensity: 1.85,
    roughness: 0.2,
    metalness: 0.45,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const hoverSealBeamMat = new THREE.MeshStandardMaterial({
    color: 0x66ddd2,
    emissive: 0x66ddd2,
    emissiveIntensity: 1.35,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const hoverSealGroup = new THREE.Group();
  const hoverSealOuter = new THREE.Mesh(hoverSealOuterGeo, hoverSealOuterMat);
  hoverSealOuter.position.y = 0.09;
  const hoverSealInner = new THREE.Mesh(hoverSealInnerGeo, hoverSealOuterMat);
  hoverSealInner.position.y = 0.13;
  const hoverSealBeam = new THREE.Mesh(hoverSealBeamGeo, hoverSealBeamMat);
  hoverSealBeam.position.y = 0.52;
  hoverSealGroup.add(hoverSealOuter, hoverSealInner, hoverSealBeam);
  hoverSealGroup.visible = false;
  scene.add(hoverSealGroup);

  const pipeline = createCinematicPipeline(
    renderer,
    scene,
    camera,
    width,
    height,
    currentGraphicsLevel,
    isSoftwareGl
  );
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Active 3D creature totems mapped by uid
  const activeTotems = new Map<string, CreatureTotemHandle>();
  const totemMeta = new Map<string, BoardCreature>();
  const finalUnitSnapshots = new Map<string, BoardCreature>();
  const totemTargets = new Map<string, { x: number; rotY: number }>();
  const dyingTotems: Array<{ handle: CreatureTotemHandle; timer: number }> = [];
  const animationQueue = new AnimationQueue();
  const unsubQueueBusy = animationQueue.onBusyChange((busy) => {
    callbacks.onQueueBusyChange?.(busy);
  });
  const deferredSummonUids = new Set<string>();
  const deferredDeathUids = new Set<string>();
  let pendingOutcomeAudio: 'victory' | 'defeat' | null = null;
  let outcomeAudioDelay = 0;
  const hoverColliders: THREE.Object3D[] = [];
  let activeHoverKey: string | null = null;
  let hoverEnabled = getHoverInspector();

  const wrapAngleRad = (a: number): number => {
    let x = a;
    while (x > Math.PI) x -= Math.PI * 2;
    while (x < -Math.PI) x += Math.PI * 2;
    return x;
  };

  const rebuildHoverColliders = () => {
    hoverColliders.length = 0;
    hoverColliders.push(playerDemiurge.hitCollider, enemyDemiurge.hitCollider);
    for (const h of activeTotems.values()) {
      hoverColliders.push(h.hitCollider);
    }
  };

  const clearHoverTarget = () => {
    hoverSealGroup.visible = false;
    if (activeHoverKey !== null) {
      activeHoverKey = null;
      callbacks.onHoverTargetChange?.(null);
    }
  };

  const unsubHover = subscribeHoverInspector((enabled) => {
    hoverEnabled = enabled;
    if (!enabled) clearHoverTarget();
  });

  const rebuildCharactersForDetailTier = (tier: DetailTier) => {
    scene.remove(playerDemiurge.group);
    playerDemiurge.dispose();
    playerDemiurge = buildDemiurgeSculpt('player', mats, contactTex, 0, tier);
    playerDemiurge.group.position.set(0, 0.34, 4.8);
    playerDemiurge.group.rotation.y = Math.PI * 0.88;
    playerDemiurge.setOverloadVisual(overloadVisualState);
    playerDemiurge.setResonanceLevel(resonanceVisualLevel);
    playerDemiurge.setSoulTetherVisual(soulTetherVisualState);
    scene.add(playerDemiurge.group);

    scene.remove(enemyDemiurge.group);
    enemyDemiurge.dispose();
    enemyDemiurge = buildDemiurgeSculpt('enemy', mats, contactTex, currentStageIdx, tier);
    enemyDemiurge.group.position.set(0, 0.34, -4.8);
    enemyDemiurge.group.rotation.y = 0.08;
    if (enemyShattered) enemyDemiurge.triggerDefeatShatter();
    scene.add(enemyDemiurge.group);

    const entries = Array.from(activeTotems.entries());
    entries.forEach(([uid, oldHandle]) => {
      const pos = oldHandle.group.position.clone();
      const rotY = oldHandle.group.rotation.y;
      const meta = totemMeta.get(uid);
      scene.remove(oldHandle.group);
      oldHandle.dispose();

      const fresh = buildCreatureTotem(
        oldHandle.id,
        oldHandle.name,
        oldHandle.school,
        oldHandle.side,
        oldHandle.atk,
        oldHandle.hp,
        mats,
        contactTex,
        tier
      );
      fresh.group.position.copy(pos);
      fresh.group.rotation.y = rotY;
      fresh.group.visible = !deferredSummonUids.has(uid);
      if (meta) {
        fresh.setVeteran(meta.veteranCount);
        fresh.setShielded(meta.shielded);
        fresh.setStance(meta.stance, Boolean(meta.exhausted));
      }
      scene.add(fresh.group);
      activeTotems.set(uid, fresh);
    });

    rebuildHoverColliders();
  };

  const applyGraphicsLevel = (level: number) => {
    currentGraphicsLevel = level;
    const nextTier = getGraphicsDetailTier(level);
    renderer.setPixelRatio(computeTargetDpr(level));
    renderer.setSize(width, height);
    pipeline.setGraphicsLevel(level);
    pipeline.setSize(width, height);

    const shadowsOn = !isSoftwareGl && level >= GRAPHICS_LEVEL.high;
    renderer.shadowMap.enabled = shadowsOn;
    renderer.shadowMap.autoUpdate = shadowsOn;
    keyLight.castShadow = shadowsOn;
    const targetShadowSize = level >= GRAPHICS_LEVEL.high ? 2048 : 1024;
    if (keyLight.shadow.mapSize.x !== targetShadowSize) {
      keyLight.shadow.mapSize.set(targetShadowSize, targetShadowSize);
      keyLight.shadow.map?.dispose();
      keyLight.shadow.map = null;
    }

    mats.setDetailLevel(nextTier);
    arena.setGraphicsLevel(level);
    arenaVfx.setGraphicsLevel(level);
    combatVfx3d.setGraphicsLevel(level);
    vfx2d.setGraphicsLevel(level);
    if (warmClerestoryLight) warmClerestoryLight.visible = level >= GRAPHICS_LEVEL.high;
    if (coolClerestoryLight) coolClerestoryLight.visible = level >= GRAPHICS_LEVEL.high;
    heroRimAccentLight.visible = level >= GRAPHICS_LEVEL.high;

    if (nextTier !== currentDetailTier) {
      currentDetailTier = nextTier;
      rebuildCharactersForDetailTier(nextTier);
    }

    if (level < GRAPHICS_LEVEL.high) {
      trauma = 0;
      hitstop = 0;
    }
    if (level < GRAPHICS_LEVEL.ultra) {
      vfx2d.setTargetingArc(null);
    }
    pipeline.render();
    vfx2d.updateAndRender(0, elapsed);
  };
  const unsubGraphics = subscribeGraphicsQuality((_q, lvl) => applyGraphicsLevel(lvl));
  let fastCombat = getFastCombat();
  const unsubFastCombat = subscribeFastCombat((fast) => {
    fastCombat = fast;
  });

  let latestBoardSnapshot: {
    playerBoard: Array<BoardCreature | null>;
    enemyBoard: Array<BoardCreature | null>;
    chaosBurnLanes?: number[];
    playerSchool?: MagicSchool;
    laneRunes?: DuelState['laneRunes'];
  } | null = null;
  let sceneMode: 'title' | 'playing' | 'paused' | 'gameover' = 'title';
  let briefingCameraActive = false;
  let hoveredLane: LaneRuneTarget | null = null;
  let currentPreset: CameraPreset = 'combat';
  let orbitYawOffset = 0;
  let orbitPitchOffset = 0;
  let orbitZoomScale = 1;
  let curOrbitYaw = 0;
  let curOrbitPitch = 0;
  let curOrbitZoom = 1;
  let trauma = 0;
  let hitstop = 0;
  let combatFocusX = 0;
  let combatFocusZ = 0;
  let pointerNdcX = 0;
  let pointerNdcY = 0;
  let elapsed = 0;
  let introSweepTimer = 0;
  let badgeAcc = 0;
  let prevBadgeSig = '';
  let prevRuneSig = '';
  let prevPromptSig = '';
  let activePattern: ArcanePatternId = 'triangle';
  let targetingPreview: TargetingPreview | null = null;
  let hoveredPowerKind: ArchonPowerHoverKind | null = null;
  let hoveredPowerSnapshot: DuelState | null = null;

  const targetBgColor = new THREE.Color(0x0e0c18);
  const targetFogColor = new THREE.Color(0x100e1c);
  const targetRimColor = new THREE.Color(TAROT_PALETTE.ether);
  let targetFogDensity = 0.0155;

  // Showcase creatures shown only during Title tour before first duel
  const showcaseIds = ['show-1', 'show-2', 'show-3', 'show-4'];
  const spawnShowcase = () => {
    const specs: Array<[string, string, MagicSchool, 'player' | 'enemy', number, number, number, number]> = [
      ['show-1', 'kinet_vortex', 'kinet', 'player', 5, 4, -2.95, 1.85],
      ['show-2', 'synth_golem', 'synth', 'player', 4, 5, 2.95, 1.85],
      ['show-3', 'chaos_hound', 'chaos', 'enemy', 4, 2, -2.95, -1.85],
      ['show-4', 'vital_stag', 'vital', 'enemy', 3, 5, 2.95, -1.85],
    ];
    specs.forEach(([uid, cardName, school, side, atk, hp, x, z]) => {
      const h = buildCreatureTotem(uid, cardName, school, side, atk, hp, mats, contactTex, currentDetailTier);
      h.group.position.set(x, 0, z);
      h.group.rotation.y = side === 'player' ? Math.PI * 0.88 : -0.15;
      scene.add(h.group);
      activeTotems.set(uid, h);
    });
    rebuildHoverColliders();
  };
  spawnShowcase();

  const clearShowcase = () => {
    let removed = false;
    showcaseIds.forEach((uid) => {
      const h = activeTotems.get(uid);
      if (h) {
        scene.remove(h.group);
        h.dispose();
        activeTotems.delete(uid);
        removed = true;
      }
    });
    if (removed) rebuildHoverColliders();
  };

  const projectWorldToScreen = (worldVec: THREE.Vector3): { x: number; y: number } => {
    _proj.copy(worldVec).project(camera);
    return {
      x: (_proj.x * 0.5 + 0.5) * width,
      y: (-_proj.y * 0.5 + 0.5) * height,
    };
  };

  const setLaneWorldPos = (side: 'player' | 'enemy', lane: number, out: THREE.Vector3): THREE.Vector3 => {
    const x = side === 'player' ? PLAYER_LANE_X[lane] ?? 0 : ENEMY_LANE_X[lane] ?? 0;
    const z = side === 'player' ? 1.75 : -1.75;
    return out.set(x, 0.9, z);
  };

  const setDemiurgeWorldPos = (side: 'player' | 'enemy', out: THREE.Vector3): THREE.Vector3 =>
    out.set(0, 1.6, side === 'player' ? 4.8 : -4.8);

  const applyOverloadColors = (active: boolean) => {
    overloadVisualState = active;
    vfx2d.setOverload(active);
    const runeHex = active ? TAROT_PALETTE.overload : 0x9c7c3b;
    const lightHex = active ? TAROT_PALETTE.overload : TAROT_PALETTE.ether;

    mats.runeEmissiveMat.color.setHex(runeHex);
    mats.runeEmissiveMat.emissive.setHex(active ? 0x7d2015 : 0x6b5220);
    mats.runeEmissiveMat.emissiveIntensity = active ? 0.9 : 0.55;

    channelLight.color.setHex(lightHex);
    channelLight.intensity = active ? 2.1 : 1.4;

    arena.setOverload(active);
    playerDemiurge.setOverloadVisual(active);
    arenaVfx.setOverload(active);
  };

  const refreshSlotVisuals = () => {
    const playerBoardEmpty =
      sceneMode === 'playing' &&
      Boolean(latestBoardSnapshot?.playerBoard.every((cell) => cell === null));
    let beaconPlaced = false;

    let tetherPreviewLane = -1;
    let chronoReviveLane = -1;
    if (hoveredPowerKind === 'soul_tether' && hoveredPowerSnapshot) {
      const pb = hoveredPowerSnapshot.playerBoard;
      tetherPreviewLane = pb.findIndex((c) => c !== null && c.stance === 'guard');
      if (tetherPreviewLane < 0) tetherPreviewLane = pb.findIndex((c) => c !== null);
    } else if (hoveredPowerKind === 'chrono_rewind' && hoveredPowerSnapshot?.lastLostAlly) {
      const pb = hoveredPowerSnapshot.playerBoard;
      const orig = hoveredPowerSnapshot.lastLostAlly.lane;
      chronoReviveLane = pb[orig] === null ? orig : pb.findIndex((c) => c === null);
    }

    slotVisuals.forEach((sv) => {
      const board = sv.side === 'player' ? latestBoardSnapshot?.playerBoard : latestBoardSnapshot?.enemyBoard;
      const occupant = board?.[sv.lane] ?? null;
      const isBurning = sv.side === 'enemy' && (latestBoardSnapshot?.chaosBurnLanes?.[sv.lane] ?? 0) > 0;

      if (hoveredPowerKind === 'chrono_rewind' && sv.side === 'player') {
        if (sv.lane === chronoReviveLane || occupant) {
          sv.targetColor.setHex(0xffd778);
          sv.targetOpacity = 0.92;
          if (sv.lane === chronoReviveLane) {
            previewBeaconGroup.position.set(PLAYER_LANE_X[sv.lane], 0, 1.75);
            previewBeaconMat.color.setHex(0xffd778);
            previewBeaconMat.emissive.setHex(0xffd778);
            beaconPlaced = true;
          }
          return;
        }
      } else if (hoveredPowerKind === 'soul_tether' && sv.side === 'player' && sv.lane === tetherPreviewLane) {
        sv.targetColor.setHex(0x69efe3);
        sv.targetOpacity = 0.94;
        previewBeaconGroup.position.set(PLAYER_LANE_X[sv.lane], 0, 1.75);
        previewBeaconMat.color.setHex(0x69efe3);
        previewBeaconMat.emissive.setHex(0x69efe3);
        beaconPlaced = true;
        return;
      } else if (hoveredPowerKind === 'resonance' && sv.side === 'enemy') {
        sv.targetColor.setHex(schoolSlotHex(hoveredPowerSnapshot?.playerSchool));
        sv.targetOpacity = 0.85;
        return;
      }

      if (isBurning && !occupant) {
        sv.targetColor.setHex(0xff6240);
        sv.targetOpacity = 0.56;
      } else if (occupant) {
        sv.targetColor.setHex(isBurning ? 0xff6240 : schoolSlotHex(occupant.school));
        sv.targetOpacity = occupant.shielded || isBurning ? 0.84 : 0.64;
      } else if (cardSelected && sv.side === 'player') {
        sv.targetColor.setHex(0x6ee7db);
        sv.targetOpacity = 0.58;
      } else if (playerBoardEmpty && sv.side === 'player') {
        sv.targetColor.setHex(0x5ec8be);
        sv.targetOpacity = 0.36;
      } else if (cardSelected && sv.side === 'enemy') {
        sv.targetColor.setHex(0xc95846);
        sv.targetOpacity = 0.34;
      } else {
        sv.targetColor.setHex(0x9c7c3b);
        sv.targetOpacity = 0.22;
      }
    });

    previewBeaconGroup.visible = beaconPlaced && sceneMode === 'playing';
  };

  const executeSingleEvent = (ev: CombatEvent) => {
    callbacks.onQueuedStep?.(ev);
    const highFx = currentGraphicsLevel >= GRAPHICS_LEVEL.high;
    const ultraFx = currentGraphicsLevel >= GRAPHICS_LEVEL.ultra;
    const school = ev.school ?? 'kinet';
    const attackSpeed = fastCombat ? 1.85 : 1.0;

    if (ev.type === 'summon' && ev.uid && ev.lane !== undefined) {
      if (deferredSummonUids.has(ev.uid)) {
        deferredSummonUids.delete(ev.uid);
        const h = activeTotems.get(ev.uid);
        if (h) {
          h.group.visible = true;
          h.triggerSpawn();
          rebuildHoverColliders();
          pushBadges();
        }
      } else if (!activeTotems.has(ev.uid) && ev.cardId) {
        const targetX = ev.side === 'player' ? PLAYER_LANE_X[ev.lane] : ENEMY_LANE_X[ev.lane];
        const targetZ = ev.side === 'player' ? 1.75 : -1.75;
        const targetRotY = ev.side === 'player' ? Math.PI - (ev.lane - 1.5) * 0.14 : (ev.lane - 1.5) * 0.14;
        const transientAtk = ev.atk ?? 2;
        const transientHp = ev.hp ?? 2;
        const transientUnit: BoardCreature = {
          uid: ev.uid,
          cardId: ev.cardId,
          school,
          side: ev.side,
          lane: ev.lane,
          atk: transientAtk,
          hp: transientHp,
          maxHp: transientHp,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        };
        totemMeta.set(ev.uid, transientUnit);
        totemTargets.set(ev.uid, { x: targetX, rotY: targetRotY });
        const h = buildCreatureTotem(
          ev.uid,
          ev.cardId,
          school,
          ev.side,
          transientAtk,
          transientHp,
          mats,
          contactTex,
          currentDetailTier
        );
        h.group.position.set(targetX, 0, targetZ);
        h.group.rotation.y = targetRotY;
        h.triggerSpawn();
        scene.add(h.group);
        activeTotems.set(ev.uid, h);
        rebuildHoverColliders();
        pushBadges();
      }
      etherAudio.playSummon(school);
      const worldPos = setLaneWorldPos(ev.side, ev.lane, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatFocusX = worldPos.x * 0.2;
      combatFocusZ = ev.side === 'player' ? 0.55 : -0.95;
      combatVfx3d.spawnSummonPillar(_tmpB.set(worldPos.x, 0.02, worldPos.z), school);
      combatVfx3d.spawnSpellNova3D(_tmpB.set(worldPos.x, 0.08, worldPos.z), school, 1.25);
      if (highFx) vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(ev.school), 16, 185);
    } else if (ev.type === 'attack' && ev.uid) {
      // Phase 1 (Wind-up 0.2s) & Phase 2 (Dash 0.1s) start here; Phase 3 (Impact at 0.3s) fires in hit_creature / hit_demiurge
      etherAudio.playAttackLunge();
      const totem = activeTotems.get(ev.uid);
      if (ev.lane !== undefined) {
        const lx = ev.side === 'player' ? PLAYER_LANE_X[ev.lane] ?? 0 : ENEMY_LANE_X[ev.lane] ?? 0;
        const srcWorld = setLaneWorldPos(ev.side, ev.lane, _tmpA);
        const src = projectWorldToScreen(srcWorld);
        const hasBlocker = ev.amount === undefined;
        if (hasBlocker) {
          totem?.triggerAttack('melee', 0, attackSpeed);
          combatFocusX = lx * 0.32;
          combatFocusZ = ev.side === 'player' ? -0.45 : 0.55;
        } else {
          const dstWorld = setDemiurgeWorldPos(ev.side === 'player' ? 'enemy' : 'player', _tmpB);
          const targetWorldYaw = Math.atan2(dstWorld.x - srcWorld.x, dstWorld.z - srcWorld.z);
          const baseYaw = totem ? totem.group.rotation.y : ev.side === 'player' ? Math.PI : 0;
          totem?.triggerAttack('direct', wrapAngleRad(targetWorldYaw - baseYaw), attackSpeed);
          combatFocusX = lx * 0.16;
          combatFocusZ = ev.side === 'player' ? -0.55 : 0.55;
          combatVfx3d.spawnGroundShockwave(_tmpC.set(srcWorld.x, 0.04, srcWorld.z), school, 0.95);
          combatVfx3d.spawnProjectileBeam(srcWorld, dstWorld, school, fastCombat);
          if (highFx) {
            const dst = projectWorldToScreen(dstWorld);
            vfx2d.spawnBolt(src.x, src.y, dst.x, dst.y, ev.side === 'player' ? 1 : 2);
          }
        }
      } else {
        totem?.triggerAttack('melee', 0, attackSpeed);
      }
    } else if (ev.type === 'intercept' && ev.uid && ev.lane !== undefined && ev.fromLane !== undefined) {
      etherAudio.playIntercept();
      const totem = activeTotems.get(ev.uid);
      totem?.triggerIntercept(Math.sign(ev.lane - ev.fromLane));
      const worldPos = setLaneWorldPos(ev.side, ev.fromLane, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatFocusX = worldPos.x * 0.28;
      combatVfx3d.spawnWeaponSlash3D(worldPos, school, 0, 1.15);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(worldPos.x, 0.04, worldPos.z), school, 1.8);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, 0, 18, 210);
        vfx2d.spawnSlash(pt.x, pt.y, -0.35, 0, 48);
      }
      vfx2d.spawnText(pt.x, pt.y - 54, ev.label ?? 'INTERCEPT!', '#6CE8DC', 1.15);
    } else if (ev.type === 'stance' && ev.lane !== undefined) {
      etherAudio.playStance(ev.label === 'GUARD');
      const worldPos = setLaneWorldPos(ev.side, ev.lane, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(worldPos.x, 0.04, worldPos.z), school, 1.25);
      if (highFx) vfx2d.spawnBurst(pt.x, pt.y, 0, 10, 140);
      if (ev.label) vfx2d.spawnText(pt.x, pt.y - 44, ev.label, '#7BE6DB', 0.95);
    } else if (ev.type === 'enchant') {
      etherAudio.playEnchant();
      const archonPos = setDemiurgeWorldPos(ev.side, _tmpA);
      const pt = projectWorldToScreen(archonPos);
      combatFocusZ = ev.side === 'player' ? 0.8 : -1.1;
      (ev.side === 'player' ? playerDemiurge : enemyDemiurge).triggerCastFlare();
      combatVfx3d.spawnSummonPillar(_tmpB.set(archonPos.x, 0.05, archonPos.z), school);
      combatVfx3d.spawnSpellNova3D(_tmpB.set(archonPos.x, 0.1, archonPos.z), school, 1.55);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(ev.school), 24, 240);
        vfx2d.triggerFlash('#5EC8BE', 0.16);
      }
      if (ev.label) vfx2d.spawnText(pt.x, pt.y - 44, ev.label, '#A8F3EC', 1.15);
    } else if (ev.type === 'trap') {
      etherAudio.playTrap();
      const trapPos = _tmpA.set(0, 0.7, ev.side === 'player' ? 3.2 : -3.2);
      const pt = projectWorldToScreen(trapPos);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(0, 0.05, trapPos.z), school, 2.35);
      combatVfx3d.spawnSpellNova3D(_tmpB.set(0, 0.08, trapPos.z), school, 1.65);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(ev.school), 24, 240);
        vfx2d.triggerFlash('#E2B354', 0.18);
      }
      if (ev.label) vfx2d.spawnText(pt.x, pt.y - 38, ev.label, '#FFE29A', 1.2);
    } else if (ev.type === 'ability' && ev.lane !== undefined) {
      etherAudio.playAbility();
      const isAllyBuff = ev.label?.includes('SHIELD');
      const targetSide = isAllyBuff ? ev.side : ev.side === 'player' ? 'enemy' : 'player';
      const targetWorld = setLaneWorldPos(targetSide, ev.lane, _tmpA);
      const pt = projectWorldToScreen(targetWorld);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(targetWorld.x, 0.04, targetWorld.z), school, 1.55);
      combatVfx3d.spawnSpellNova3D(_tmpB.set(targetWorld.x, 0.08, targetWorld.z), school, 1.25);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(ev.school), 16, 190);
        if (ultraFx) trauma = Math.min(1, trauma + 0.22);
      }
      if (ev.label) vfx2d.spawnText(pt.x, pt.y - 36, ev.label, '#FFE29A', 1.1);
    } else if (ev.type === 'hit_creature' && ev.lane !== undefined) {
      // Phase 3 (Impact): slash + hit recoil + burst + trauma + floating damage text
      etherAudio.playSlash();
      etherAudio.playHit(false);
      const totem = ev.uid ? activeTotems.get(ev.uid) : undefined;
      totem?.triggerHit();
      if (ev.uid && ev.amount !== undefined) {
        const meta = totemMeta.get(ev.uid);
        if (meta) {
          meta.hp = Math.max(0, meta.hp - ev.amount);
          meta.shielded = false;
          if (totem) {
            totem.hp = meta.hp;
            totem.setShielded(false);
          }
          pushBadges();
        }
      }
      const worldPos = setLaneWorldPos(ev.side, ev.lane, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatVfx3d.spawnWeaponSlash3D(
        _tmpB.set(worldPos.x, 0.95, worldPos.z * 0.45),
        school,
        ev.side === 'enemy' ? 0 : Math.PI,
        1.12
      );
      combatVfx3d.spawnGroundShockwave(_tmpB.set(worldPos.x, 0.04, worldPos.z), school, 1.55);
      if (highFx) {
        vfx2d.spawnSlash(pt.x, pt.y, ev.side === 'enemy' ? -0.55 : 2.55, schoolColorIndex(ev.school), 54);
        vfx2d.spawnBurst(pt.x, pt.y, 1, 16, 210);
        vfx2d.triggerFlash('#FFE7B5', 0.14);
        if (ultraFx) trauma = Math.min(1, trauma + 0.32);
      }
      vfx2d.spawnText(pt.x, pt.y - 18, ev.label ?? '-1', '#FFE4B5', 1.15);
    } else if (ev.type === 'creature_died' && ev.uid) {
      triggerDeferredDeath(ev.uid);
    } else if (ev.type === 'hit_demiurge') {
      const archonPos = setDemiurgeWorldPos(ev.side, _tmpA);
      const pt = projectWorldToScreen(archonPos);
      const isHeal = (ev.amount ?? 0) < 0;
      if (ev.cardId) {
        const casterSide = ev.side === 'player' ? 'enemy' : 'player';
        const caster = casterSide === 'player' ? playerDemiurge : enemyDemiurge;
        caster.triggerCastFlare();
        etherAudio.playSpell(school);
        combatVfx3d.spawnProjectileBeam(caster.staffOriginWorld, archonPos, school, fastCombat);
        if (highFx) {
          const src = projectWorldToScreen(caster.staffOriginWorld);
          vfx2d.spawnBolt(src.x, src.y, pt.x, pt.y, schoolColorIndex(ev.school));
        }
      }
      if (isHeal) {
        etherAudio.playEnchant();
      } else {
        etherAudio.playSlash();
        etherAudio.playHit(true);
      }
      combatFocusX = 0;
      combatFocusZ = ev.side === 'enemy' ? -1.15 : 0.95;
      combatVfx3d.spawnGroundShockwave(
        _tmpB.set(archonPos.x, 0.06, archonPos.z),
        isHeal ? 'vital' : school,
        isHeal ? 1.5 : 2.5
      );
      if (!isHeal) {
        (ev.side === 'player' ? playerDemiurge : enemyDemiurge).triggerHitRecoil();
        combatVfx3d.spawnWeaponSlash3D(
          _tmpB.set(archonPos.x, 1.35, archonPos.z),
          school,
          ev.side === 'enemy' ? 0.35 : Math.PI - 0.35,
          1.22
        );
        combatVfx3d.spawnShatterBurst(archonPos, school, 7);
      }
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, isHeal ? 0 : 2, isHeal ? 12 : 24, 260);
        if (!isHeal) vfx2d.spawnSlash(pt.x, pt.y, -0.45, 2, 62);
      }
      vfx2d.spawnText(
        pt.x,
        pt.y - 24,
        ev.label ?? '',
        isHeal ? '#7EE8C7' : '#FF725E',
        isHeal ? 1.0 : 1.35
      );
      if (!isHeal && highFx) {
        trauma = Math.min(1, trauma + (ultraFx ? 0.55 : 0.28));
        if (ultraFx) {
          hitstop = fastCombat ? 0.018 : 0.055;
        }
        vfx2d.triggerFlash('#D94432', 0.22);
      }
    } else if (ev.type === 'spell') {
      etherAudio.playSpell(school);
      const caster = ev.side === 'player' ? playerDemiurge : enemyDemiurge;
      caster.triggerCastFlare();
      combatFocusZ = ev.side === 'enemy' ? -1.15 : 0.65;
      const targetWorld =
        ev.lane !== undefined
          ? setLaneWorldPos(ev.side === 'player' ? 'enemy' : 'player', ev.lane, _tmpA)
          : setDemiurgeWorldPos(ev.side === 'player' ? 'enemy' : 'player', _tmpA);
      const pt = projectWorldToScreen(targetWorld);
      combatVfx3d.spawnProjectileBeam(caster.staffOriginWorld, targetWorld, school, fastCombat);
      combatVfx3d.spawnSpellNova3D(_tmpB.set(targetWorld.x, 0.1, targetWorld.z), school, 1.45);
      if (ev.uid && ev.amount !== undefined) {
        const meta = totemMeta.get(ev.uid);
        const targetTotem = activeTotems.get(ev.uid);
        targetTotem?.triggerHit();
        if (meta) {
          meta.hp = Math.max(0, meta.hp - ev.amount);
          if (targetTotem) targetTotem.hp = meta.hp;
          pushBadges();
        }
      }
      if (highFx) {
        const src = projectWorldToScreen(caster.staffOriginWorld);
        vfx2d.spawnBolt(src.x, src.y, pt.x, pt.y, schoolColorIndex(ev.school));
        if (ultraFx) trauma = Math.min(1, trauma + 0.3);
      }
      if (ev.label) vfx2d.spawnText(pt.x, pt.y - 20, ev.label, '#F5C45E', 1.2);
    } else if (ev.type === 'overload') {
      etherAudio.playOverloadToggle(true);
      const archonPos = setDemiurgeWorldPos(ev.side, _tmpA);
      const pt = projectWorldToScreen(archonPos);
      combatFocusZ = ev.side === 'enemy' ? -1.1 : 0.8;
      (ev.side === 'player' ? playerDemiurge : enemyDemiurge).triggerCastFlare();
      combatVfx3d.spawnSummonPillar(_tmpB.set(archonPos.x, 0.05, archonPos.z), 'chaos');
      combatVfx3d.spawnSpellNova3D(_tmpB.set(archonPos.x, 0.1, archonPos.z), 'chaos', 1.65);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, 2, 26, 260);
        vfx2d.triggerFlash('#B93826', 0.26);
        if (ultraFx) trauma = Math.min(1, trauma + 0.45);
      }
      vfx2d.spawnText(pt.x, pt.y - 36, ev.label ?? '+2', '#FF8E7A', 1.25);
    } else if (ev.type === 'leap_pulse') {
      etherAudio.playLeapPulse();
      if (ev.uid) activeTotems.get(ev.uid)?.triggerJump();
      const worldPos = setLaneWorldPos(ev.side, ev.lane ?? 1, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(worldPos.x, 0.04, worldPos.z), 'kinet', 1.65);
      if (highFx) vfx2d.spawnBurst(pt.x, pt.y, 0, 20, 220);
      vfx2d.spawnText(pt.x, pt.y - 26, ev.label ?? 'SURGE', '#5EC8BE', 1.1);
    } else if (ev.type === 'veteran' && ev.lane !== undefined) {
      etherAudio.playVeteran();
      if (ev.uid) {
        const totem = activeTotems.get(ev.uid);
        totem?.triggerJump();
        const meta = totemMeta.get(ev.uid);
        if (meta) {
          meta.atk += 1;
          meta.hp += 1;
          meta.maxHp += 1;
          meta.veteranCount += 1;
          if (totem) {
            totem.atk = meta.atk;
            totem.hp = meta.hp;
            totem.setVeteran(meta.veteranCount);
          }
          pushBadges();
        }
      }
      const worldPos = setLaneWorldPos(ev.side, ev.lane, _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatVfx3d.spawnGroundShockwave(_tmpB.set(worldPos.x, 0.04, worldPos.z), 'synth', 1.1);
      if (highFx) vfx2d.spawnBurst(pt.x, pt.y, 1, 14, 150);
      vfx2d.spawnText(pt.x, pt.y - 68, ev.label ?? '+1/+1', '#F5D06B', 0.95);
    } else if (ev.type === 'chrono_rewind') {
      etherAudio.playChronoRewind();
      playerDemiurge.triggerCastFlare();
      const worldPos =
        ev.lane !== undefined
          ? setLaneWorldPos('player', ev.lane, _tmpA)
          : setDemiurgeWorldPos('player', _tmpA);
      const pt = projectWorldToScreen(worldPos);
      combatFocusZ = 0.4;
      combatVfx3d.spawnChronoAstrolabe3D(_tmpB.set(worldPos.x, 0.08, worldPos.z));
      combatVfx3d.spawnSummonPillar(_tmpB.set(worldPos.x, 0.02, worldPos.z), 'synth');
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, 0, 18, 220);
        if (ev.label === 'CHRONO-REVIVE!') vfx2d.triggerFlash('#F4CC68', 0.16);
      }
      vfx2d.spawnText(pt.x, pt.y - 44, ev.label ?? 'REWIND', '#FFE29A', 1.2);
    } else if (ev.type === 'soul_tether') {
      etherAudio.playSoulTether();
      playerDemiurge.triggerCastFlare();
      const archonPos = setDemiurgeWorldPos('player', _tmpA);
      const targetPos =
        ev.lane !== undefined
          ? setLaneWorldPos('player', ev.lane, _tmpB)
          : _tmpB.set(0, 1.1, 2.2);
      const pt = projectWorldToScreen(targetPos);
      combatVfx3d.spawnSoulTetherArc3D(archonPos, targetPos, school);
      combatVfx3d.spawnGroundShockwave(_tmpC.set(targetPos.x, 0.05, targetPos.z), school, 1.85);
      if (highFx) vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(school), 18, 210);
      vfx2d.spawnText(pt.x, pt.y - 36, ev.label ?? 'TETHER 50%', '#7BE6DB', 1.15);
    } else if (ev.type === 'tether_reflect') {
      etherAudio.playSoulTether();
      const srcPos =
        ev.lane !== undefined
          ? setLaneWorldPos('player', ev.lane, _tmpA)
          : setDemiurgeWorldPos('player', _tmpA);
      const enemyPos = setDemiurgeWorldPos('enemy', _tmpB);
      const pt = projectWorldToScreen(enemyPos);
      enemyDemiurge.triggerHitRecoil();
      combatVfx3d.spawnSoulTetherArc3D(srcPos, enemyPos, school);
      combatVfx3d.spawnGroundShockwave(_tmpC.set(enemyPos.x, 0.06, enemyPos.z), school, 2.1);
      if (highFx) {
        const srcPt = projectWorldToScreen(srcPos);
        vfx2d.spawnBolt(srcPt.x, srcPt.y, pt.x, pt.y, schoolColorIndex(school));
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(school), 18, 220);
        if (ultraFx) trauma = Math.min(1, trauma + 0.32);
      }
      vfx2d.spawnText(pt.x, pt.y - 46, ev.label ?? '-1 ⛓', '#A8F3EC', 1.25);
    } else if (ev.type === 'resonance') {
      etherAudio.playResonanceApotheosis(school);
      arena.triggerRoseFlare(school, true);
      playerDemiurge.triggerCastFlare();
      const archonPos = setDemiurgeWorldPos('player', _tmpA);
      const enemyPos = setDemiurgeWorldPos('enemy', _tmpB);
      const centerPos = _tmpC.set(0, 0.8, 0);
      const pt = projectWorldToScreen(centerPos);
      combatFocusX = 0;
      combatFocusZ = 0;
      combatVfx3d.spawnResonanceApotheosis3D(archonPos, enemyPos, school);
      if (highFx) {
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(school), 30, 300);
        vfx2d.triggerFlash(school === 'chaos' ? '#FF7E66' : '#F4CC68', 0.24);
        if (ultraFx) trauma = Math.min(1, trauma + 0.52);
      }
      vfx2d.spawnText(pt.x, pt.y - 30, ev.label ?? 'APOTHEOSIS', '#FFE7AE', 1.4);
    } else if (ev.type === 'ultimatum') {
      arena.triggerRoseFlare(school, true);
    }
  };

  const applyFinalUnitSnapshots = () => {
    for (const [uid, unit] of finalUnitSnapshots.entries()) {
      const prevVeteran = totemMeta.get(uid)?.veteranCount ?? 0;
      totemMeta.set(uid, { ...unit, keywords: [...unit.keywords] });
      const handle = activeTotems.get(uid);
      if (handle) {
        handle.atk = unit.atk;
        handle.hp = unit.hp;
        handle.setVeteran(unit.veteranCount);
        handle.setShielded(unit.shielded);
        handle.setStance(unit.stance, Boolean(unit.exhausted));
        if (unit.veteranCount > prevVeteran && !animationQueue.isBusy()) {
          handle.triggerAscend();
        }
      }
    }
    finalUnitSnapshots.clear();
    pushBadges();
  };

  const playCombatEvents = (events: CombatEvent[]): number => {
    const attackImpactMs = fastCombat ? 160 : 300;
    const attackReturnMs = fastCombat ? 110 : 200;
    const betweenAttacksMs = fastCombat ? 140 : 500;
    const deathHoldMs = fastCombat ? 120 : 320;
    const spawnStepMs = fastCombat ? 200 : 520;
    const spellImpactMs = fastCombat ? 140 : 280;
    const spellPostMs = fastCombat ? 140 : 320;
    const enemyCardPauseMs = fastCombat ? 240 : 800;
    const phaseGapMs = fastCombat ? 260 : 1000;
    const enemyAttackPrePauseMs = fastCombat ? 140 : 450;

    const steps: AnimationStep[] = [];
    let sawPlayerAttack = false;
    let insertedEnemyTurnGap = false;
    let sawEnemyCardPlay = false;
    let insertedEnemyAttackGap = false;
    let totalMs = 0;

    const addStep = (step: AnimationStep) => {
      totalMs += (step.waitBeforeMs ?? 0) + step.durationMs;
      steps.push(step);
    };

    let idx = 0;
    while (idx < events.length) {
      const ev = events[idx];
      let waitBeforeMs = 0;

      const isAiProactiveAction =
        ev.side === 'enemy' &&
        (ev.type === 'overload' ||
          ev.type === 'summon' ||
          ev.type === 'enchant' ||
          (ev.type === 'trap' && Boolean(ev.cardId)) ||
          ev.type === 'spell' ||
          ev.type === 'veteran' ||
          ev.type === 'attack' ||
          (ev.type === 'hit_demiurge' && Boolean(ev.cardId)));

      if (sawPlayerAttack && !insertedEnemyTurnGap && isAiProactiveAction) {
        insertedEnemyTurnGap = true;
        waitBeforeMs += phaseGapMs;
      }

      const isAiCardAction =
        ev.side === 'enemy' &&
        (ev.type === 'overload' ||
          ev.type === 'summon' ||
          ev.type === 'enchant' ||
          (ev.type === 'trap' && Boolean(ev.cardId)) ||
          ev.type === 'spell' ||
          ev.type === 'veteran' ||
          (ev.type === 'hit_demiurge' && Boolean(ev.cardId)));

      if (isAiCardAction) {
        sawEnemyCardPlay = true;
      }
      if (sawEnemyCardPlay && !insertedEnemyAttackGap && ev.side === 'enemy' && ev.type === 'attack') {
        insertedEnemyAttackGap = true;
        waitBeforeMs += enemyAttackPrePauseMs;
      }

      if (ev.type === 'attack') {
        if (ev.side === 'player') sawPlayerAttack = true;
        const impactsAndDeaths: CombatEvent[] = [];
        let veteranEv: CombatEvent | null = null;
        let scan = idx + 1;
        while (scan < events.length) {
          const nxt = events[scan];
          if (
            nxt.type === 'hit_creature' ||
            (nxt.type === 'hit_demiurge' && !nxt.cardId) ||
            nxt.type === 'tether_reflect' ||
            nxt.type === 'creature_died'
          ) {
            impactsAndDeaths.push(nxt);
            scan++;
          } else if (nxt.type === 'veteran' && !veteranEv && nxt.side === ev.side) {
            veteranEv = nxt;
            scan++;
            break;
          } else {
            break;
          }
        }
        idx = scan;

        const hasDeath = impactsAndDeaths.some((x) => x.type === 'creature_died');
        // Phase 1 & 2: Wind-up (0.2s) + Dash (0.1s) -> Impact at 0.3s
        addStep({
          label: `attack:${ev.side}`,
          waitBeforeMs,
          durationMs: attackImpactMs,
          run: () => executeSingleEvent(ev),
        });

        // Phase 3 & 4: Impact at 0.3s, Return (0.2s), plus 0.5s pause between attacks
        if (veteranEv) {
          addStep({
            label: 'impact',
            durationMs: attackReturnMs,
            run: () => impactsAndDeaths.forEach(executeSingleEvent),
          });
          const vEv = veteranEv;
          addStep({
            label: 'veteran_and_gap',
            durationMs: betweenAttacksMs + (hasDeath ? deathHoldMs : 0),
            run: () => executeSingleEvent(vEv),
          });
        } else {
          addStep({
            label: 'impact_and_return',
            durationMs: attackReturnMs + betweenAttacksMs + (hasDeath ? deathHoldMs : 0),
            run: () => impactsAndDeaths.forEach(executeSingleEvent),
          });
        }
        continue;
      }

      if (ev.type === 'spell' || (ev.type === 'hit_demiurge' && Boolean(ev.cardId))) {
        const trailing: CombatEvent[] = [];
        let scan = idx + 1;
        while (scan < events.length) {
          const nxt = events[scan];
          if (nxt.type === 'tether_reflect' || nxt.type === 'creature_died' || nxt.type === 'veteran') {
            trailing.push(nxt);
            scan++;
          } else {
            break;
          }
        }
        idx = scan;
        const hasDeath = trailing.some((x) => x.type === 'creature_died');
        const baseHold = ev.side === 'enemy' ? enemyCardPauseMs : spellPostMs;

        if (trailing.length > 0) {
          addStep({
            label: ev.type,
            waitBeforeMs,
            durationMs: spellImpactMs,
            run: () => executeSingleEvent(ev),
          });
          addStep({
            label: 'spell_follow',
            durationMs: Math.max(120, baseHold - spellImpactMs) + (hasDeath ? deathHoldMs : 0),
            run: () => trailing.forEach(executeSingleEvent),
          });
        } else {
          addStep({
            label: ev.type,
            waitBeforeMs,
            durationMs: Math.max(spellImpactMs + spellPostMs, baseHold),
            run: () => executeSingleEvent(ev),
          });
        }
        continue;
      }

      idx++;
      let durationMs = fastCombat ? 180 : 420;
      if (ev.type === 'summon') {
        durationMs = ev.side === 'enemy' ? Math.max(spawnStepMs, enemyCardPauseMs) : spawnStepMs;
      } else if (ev.type === 'stance') {
        durationMs = fastCombat ? 80 : 200;
      } else if (ev.type === 'intercept') {
        durationMs = fastCombat ? 120 : 320;
      } else if (ev.type === 'anomaly') {
        durationMs = fastCombat ? 100 : 280;
      } else if (ev.type === 'creature_died') {
        durationMs = fastCombat ? 240 : 620;
      } else if (ev.side === 'enemy' && (ev.type === 'overload' || ev.type === 'enchant' || ev.type === 'trap' || ev.type === 'veteran')) {
        durationMs = enemyCardPauseMs;
      }

      addStep({
        label: ev.type,
        waitBeforeMs,
        durationMs,
        run: () => executeSingleEvent(ev),
      });
    }

    if (steps.length > 0) {
      animationQueue.enqueue(steps, () => {
        applyFinalUnitSnapshots();
      });
    }
    return totalMs / 1000;
  };

  const rebuildEnemyForStage = (stageIndex: number) => {
    currentStageIdx = stageIndex;
    enemyShattered = false;
    scene.remove(enemyDemiurge.group);
    enemyDemiurge.dispose();
    enemyDemiurge = buildDemiurgeSculpt('enemy', mats, contactTex, stageIndex, currentDetailTier);
    enemyDemiurge.group.position.set(0, 0.34, -4.8);
    enemyDemiurge.group.rotation.y = 0.08;
    scene.add(enemyDemiurge.group);
    rebuildHoverColliders();

    const atm = arena.setStageAtmosphere(stageIndex);
    arenaVfx.setSchoolTheme(getOpponentForStage(stageIndex).school);
    targetBgColor.setHex(atm.vaultHex);
    targetFogColor.setHex(atm.fogHex);
    targetFogDensity = atm.fogDensity;
    targetRimColor.setHex(atm.rimHex);
  };

  const pushBadges = (force = false) => {
    if (sceneMode === 'title') {
      if (prevBadgeSig !== '') {
        prevBadgeSig = '';
        callbacks.onBadgesUpdate([]);
      }
      if (prevRuneSig !== '') {
        prevRuneSig = '';
        callbacks.onLaneRunesUpdate?.([]);
      }
      if (prevPromptSig !== '') {
        prevPromptSig = '';
        callbacks.onWorldPromptUpdate?.([]);
      }
      return;
    }
    const list: ProjectedBadge[] = [];
    let sig = '';
    for (const [uid, handle] of activeTotems.entries()) {
      if (deferredSummonUids.has(uid)) continue;
      const meta = totemMeta.get(uid);
      if (!meta) continue;
      handle.badgeAnchor.getWorldPosition(_proj);
      _proj.project(camera);
      if (_proj.z < -1 || _proj.z > 1) continue;
      const sx = (_proj.x * 0.5 + 0.5) * width;
      const sy = (-_proj.y * 0.5 + 0.5) * height;
      sig += `${uid}:${Math.round(sx)},${Math.round(sy)},${meta.atk}/${meta.hp},${meta.veteranCount},${meta.shielded ? 1 : 0},${meta.stance},${meta.exhausted ? 1 : 0},${meta.abilityUsedThisTurn ? 1 : 0};`;
      list.push({
        uid,
        cardId: meta.cardId,
        school: meta.school,
        side: meta.side,
        lane: meta.lane,
        atk: meta.atk,
        hp: meta.hp,
        maxHp: meta.maxHp,
        veteranCount: meta.veteranCount,
        shielded: meta.shielded,
        stance: meta.stance,
        exhausted: Boolean(meta.exhausted),
        activeAbility: meta.activeAbility,
        abilityUsed: Boolean(meta.abilityUsedThisTurn),
        x: sx,
        y: sy,
        visible: true,
      });
    }
    if (force || sig !== prevBadgeSig) {
      prevBadgeSig = sig;
      callbacks.onBadgesUpdate(list);
    }

    if (callbacks.onLaneRunesUpdate) {
      const runesList: ProjectedLaneRune[] = [];
      let runeSig = '';
      const laneRunes = latestBoardSnapshot?.laneRunes;
      if (laneRunes && sceneMode === 'playing' && hoveredLane) {
        const sides: Array<{ side: 'player' | 'enemy'; arr: Array<LaneRuneKind | null>; xs: number[]; z: number }> = [
          { side: 'player', arr: laneRunes.player, xs: PLAYER_LANE_X, z: 2.09 },
          { side: 'enemy', arr: laneRunes.enemy, xs: ENEMY_LANE_X, z: -2.09 },
        ];
        const rawRunes: ProjectedLaneRune[] = [];
        for (const s of sides) {
          for (let i = 0; i < 4; i++) {
            const kind = s.arr[i];
            if (!kind) continue;
            _proj.set(s.xs[i] + 0.15, 0.56, s.z).project(camera);
            if (_proj.z < -1 || _proj.z > 1) continue;
            const rx = (_proj.x * 0.5 + 0.5) * width;
            const ry = (-_proj.y * 0.5 + 0.5) * height;
            rawRunes.push({ side: s.side, lane: i, kind, x: rx, y: ry });
          }
        }
        const filtered = filterHoveredLaneRunes(rawRunes, hoveredLane);
        for (const r of filtered) {
          runeSig += `${r.side}:${r.lane}:${r.kind}:${Math.round(r.x)},${Math.round(r.y)};`;
          runesList.push(r);
        }
      }
      if (force || runeSig !== prevRuneSig) {
        prevRuneSig = runeSig;
        callbacks.onLaneRunesUpdate(runesList);
      }
    }

    if (callbacks.onWorldPromptUpdate) {
      const promptList: WorldPromptInfo[] = [];
      let promptSig = '';
      if (sceneMode === 'playing' && latestBoardSnapshot) {
        if (cardSelected) {
          const emptyIdx = latestBoardSnapshot.playerBoard.findIndex((c) => c === null);
          if (emptyIdx >= 0) {
            _proj.set(PLAYER_LANE_X[emptyIdx], 0.42, 1.75).project(camera);
            if (_proj.z >= -1 && _proj.z <= 1) {
              const px = (_proj.x * 0.5 + 0.5) * width;
              const py = (-_proj.y * 0.5 + 0.5) * height;
              promptSig += `summon:${emptyIdx}:${Math.round(px)},${Math.round(py)};`;
              promptList.push({ id: `summon-${emptyIdx}`, x: px, y: py, kind: 'summon' });
            }
          }
        } else {
          const readyIdx = latestBoardSnapshot.playerBoard.findIndex(
            (c) => c !== null && !c.shielded && !c.exhausted
          );
          if (readyIdx >= 0) {
            _proj.set(PLAYER_LANE_X[readyIdx], 1.55, 1.75).project(camera);
            if (_proj.z >= -1 && _proj.z <= 1) {
              const px = (_proj.x * 0.5 + 0.5) * width;
              const py = (-_proj.y * 0.5 + 0.5) * height;
              promptSig += `leap:${readyIdx}:${Math.round(px)},${Math.round(py)};`;
              promptList.push({ id: `leap-${readyIdx}`, x: px, y: py, kind: 'leap' });
            }
          }
        }
      }
      if (force || promptSig !== prevPromptSig) {
        prevPromptSig = promptSig;
        callbacks.onWorldPromptUpdate(promptList);
      }
    }
  };

  function triggerDeferredDeath(uid: string) {
    deferredDeathUids.delete(uid);
    const handle = activeTotems.get(uid);
    if (!handle) return;
    etherAudio.playDeathShatter();
    combatVfx3d.spawnCreatureVanish3D(handle.group.position, handle.school);
    if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
      const pt = projectWorldToScreen(handle.group.position);
      vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(handle.school), 16, 180);
    }
    handle.triggerDeath();
    dyingTotems.push({ handle, timer: 0.7 });
    activeTotems.delete(uid);
    totemMeta.delete(uid);
    totemTargets.delete(uid);
    if (activeHoverKey === `creature:${uid}`) {
      clearHoverTarget();
    }
    rebuildHoverColliders();
    pushBadges();
  }

  const flushDeferredCombatVisuals = () => {
    animationQueue.clear();
    applyFinalUnitSnapshots();
    for (const uid of Array.from(deferredSummonUids)) {
      const h = activeTotems.get(uid);
      if (h) h.group.visible = true;
    }
    deferredSummonUids.clear();
    for (const uid of Array.from(deferredDeathUids)) {
      const h = activeTotems.get(uid);
      if (h) {
        scene.remove(h.group);
        h.dispose();
        activeTotems.delete(uid);
      }
      totemMeta.delete(uid);
      totemTargets.delete(uid);
    }
    deferredDeathUids.clear();
  };

  const syncDuelState = (
    state: DuelState | null,
    mode: 'title' | 'playing' | 'paused' | 'gameover'
  ) => {
    flushDeferredCombatVisuals();
    sceneMode = mode;
    if (mode !== 'playing') {
      clearHoverTarget();
      hoveredLane = null;
    }
    if (!state) {
      latestBoardSnapshot = null;
      arena.setEnchantments(null, null);
      arena.setTraps(null, null);
      arena.setSlotAftermath(undefined);
      arena.setLaneRunes(undefined);
      applyOverloadColors(false);
      resonanceVisualLevel = 0;
      soulTetherVisualState = false;
      playerDemiurge.setResonanceLevel(0);
      playerDemiurge.setSoulTetherVisual(false);
      refreshSlotVisuals();
      if (currentStageIdx !== 0 || enemyShattered) {
        rebuildEnemyForStage(0);
      }
      if (activeTotems.size === 0) spawnShowcase();
      badgeAcc = 0;
      pushBadges(true);
      return 0;
    }

    clearShowcase();

    if (state.stageIndex !== currentStageIdx || (state.phase !== 'victory' && enemyShattered)) {
      rebuildEnemyForStage(state.stageIndex);
    }

    if (state.phase === 'victory' && !enemyShattered) {
      enemyShattered = true;
      enemyDemiurge.triggerDefeatShatter();
      const enemyPos = setDemiurgeWorldPos('enemy', _tmpA);
      combatVfx3d.spawnShatterBurst(
        enemyPos,
        getOpponentForStage(currentStageIdx).school,
        16
      );
      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        const pt = projectWorldToScreen(enemyPos);
        vfx2d.spawnBurst(pt.x, pt.y, 1, 28, 320);
        vfx2d.spawnBurst(pt.x, pt.y, 2, 24, 260);
        vfx2d.spawnSlash(pt.x, pt.y, -0.45, 1, 72);
        vfx2d.spawnSlash(pt.x, pt.y, 0.75, 2, 68);
        if (currentGraphicsLevel >= GRAPHICS_LEVEL.ultra) {
          trauma = Math.min(1, trauma + 0.72);
        }
      }
    }

    latestBoardSnapshot = {
      playerBoard: state.playerBoard,
      enemyBoard: state.enemyBoard,
      chaosBurnLanes: state.chaosBurnLanes,
      playerSchool: state.playerSchool,
      laneRunes: state.laneRunes,
    };
    const pEnchSchool = state.playerEnchantment ? (CARD_CATALOG[state.playerEnchantment]?.school ?? null) : null;
    const eEnchSchool = state.enemyEnchantment ? (CARD_CATALOG[state.enemyEnchantment]?.school ?? null) : null;
    const pTrapSchool = state.playerTrap ? (CARD_CATALOG[state.playerTrap]?.school ?? null) : null;
    const eTrapSchool = state.enemyTrap ? (CARD_CATALOG[state.enemyTrap]?.school ?? null) : null;
    arena.setEnchantments(pEnchSchool, eEnchSchool);
    arena.setTraps(pTrapSchool, eTrapSchool);
    arena.setSlotAftermath(state.slotAftermath);
    arena.setLaneRunes(state.laneRunes);

    applyOverloadColors(state.overloadUsedThisTurn || state.ultimatumActive);
    resonanceVisualLevel = state.playerResonance;
    soulTetherVisualState = state.soulTetherActive;
    playerDemiurge.setResonanceLevel(resonanceVisualLevel);
    playerDemiurge.setSoulTetherVisual(soulTetherVisualState);
    refreshSlotVisuals();

    const willSchedule = state.pendingEvents.length > 0;
    const pendingDiedUids = new Set<string>();
    const pendingSummonUids = new Set<string>();
    if (willSchedule) {
      state.pendingEvents.forEach((ev) => {
        if (ev.type === 'creature_died' && ev.uid) pendingDiedUids.add(ev.uid);
        if (ev.type === 'summon' && ev.uid) pendingSummonUids.add(ev.uid);
      });
    }

    const wanted = new Set<string>();
    let colliderDirty = false;
    const syncSide = (board: Array<BoardCreature | null>, side: 'player' | 'enemy') => {
      board.forEach((unit, lane) => {
        if (!unit) return;
        wanted.add(unit.uid);
        const prevVeteran = totemMeta.get(unit.uid)?.veteranCount ?? 0;
        const targetX = side === 'player' ? PLAYER_LANE_X[lane] : ENEMY_LANE_X[lane];
        const targetZ = side === 'player' ? 1.75 : -1.75;
        const targetRotY = side === 'player' ? Math.PI - (lane - 1.5) * 0.14 : (lane - 1.5) * 0.14;
        totemTargets.set(unit.uid, { x: targetX, rotY: targetRotY });

        let handle = activeTotems.get(unit.uid);
        if (!handle) {
          totemMeta.set(unit.uid, { ...unit, keywords: [...unit.keywords] });
          handle = buildCreatureTotem(
            unit.uid,
            unit.cardId,
            unit.school,
            side,
            unit.atk,
            unit.hp,
            mats,
            contactTex,
            currentDetailTier
          );
          handle.group.position.set(targetX, 0, targetZ);
          handle.group.rotation.y = targetRotY;
          if (pendingSummonUids.has(unit.uid)) {
            handle.group.visible = false;
            deferredSummonUids.add(unit.uid);
          } else {
            handle.triggerSpawn();
          }
          scene.add(handle.group);
          activeTotems.set(unit.uid, handle);
          colliderDirty = true;
          handle.atk = unit.atk;
          handle.hp = unit.hp;
          handle.setVeteran(unit.veteranCount);
          handle.setShielded(unit.shielded);
          handle.setStance(unit.stance, Boolean(unit.exhausted));
        } else if (willSchedule) {
          // Defer post-combat stat changes until the AnimationQueue resolves impact/veteran steps
          finalUnitSnapshots.set(unit.uid, { ...unit, keywords: [...unit.keywords] });
        } else {
          totemMeta.set(unit.uid, { ...unit, keywords: [...unit.keywords] });
          if (unit.veteranCount > prevVeteran) {
            etherAudio.playAscend();
            handle.triggerAscend();
            combatVfx3d.spawnSummonPillar(_tmpA.set(targetX, 0.02, targetZ), unit.school);
            combatVfx3d.spawnSpellNova3D(_tmpA.set(targetX, 0.12, targetZ), unit.school, 1.35);
          }
          handle.atk = unit.atk;
          handle.hp = unit.hp;
          handle.setVeteran(unit.veteranCount);
          handle.setShielded(unit.shielded);
          handle.setStance(unit.stance, Boolean(unit.exhausted));
        }
      });
    };

    syncSide(state.playerBoard, 'player');
    syncSide(state.enemyBoard, 'enemy');

    // Keep units alive on the board until their exact 'creature_died' combat event fires!
    let shatteredAny = false;
    for (const [uid, handle] of activeTotems.entries()) {
      if (!wanted.has(uid)) {
        if (pendingDiedUids.has(uid)) {
          deferredDeathUids.add(uid);
          continue;
        }
        shatteredAny = true;
        combatVfx3d.spawnCreatureVanish3D(handle.group.position, handle.school);
        if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
          const pt = projectWorldToScreen(handle.group.position);
          vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(handle.school), 16, 180);
        }
        handle.triggerDeath();
        dyingTotems.push({ handle, timer: 0.7 });
        activeTotems.delete(uid);
        totemMeta.delete(uid);
        totemTargets.delete(uid);
        colliderDirty = true;
        if (activeHoverKey === `creature:${uid}`) {
          clearHoverTarget();
        }
      }
    }
    if (shatteredAny) etherAudio.playDeathShatter();

    if (colliderDirty) rebuildHoverColliders();

    let totalDuration = 0;
    if (state.pendingEvents.length > 0) {
      totalDuration = playCombatEvents(state.pendingEvents);
    }

    if (state.phase === 'victory' || state.phase === 'defeat') {
      pendingOutcomeAudio = state.phase;
      outcomeAudioDelay = Math.max(0.15, totalDuration + 0.12);
    }

    badgeAcc = 0;
    pushBadges();

    publishMetrics({
      completed: state.phase === 'victory' || state.stageIndex > 0,
      round: state.round,
      playerHp: state.playerHp,
      enemyHp: state.enemyHp,
      playerEther: state.playerEther,
      overloadActive: state.overloadUsedThisTurn,
      stage: state.stageIndex + 1,
    });

    return totalDuration;
  };

  const screenToLane = (clientX: number, clientY: number): { side: 'player' | 'enemy'; lane: number } => {
    const rect = renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    _raycaster.setFromCamera(_ndc, camera);
    if (_raycaster.ray.intersectPlane(_arenaPlane, _hitPoint)) {
      const side = _hitPoint.z < 0 ? 'enemy' : 'player';
      let bestLane = 0;
      let bestDist = Infinity;
      PLAYER_LANE_X.forEach((lx, idx) => {
        const d = Math.abs(_hitPoint.x - lx);
        if (d < bestDist) {
          bestDist = d;
          bestLane = idx;
        }
      });
      return { side, lane: bestLane };
    }
    return { side: 'player', lane: 1 };
  };

  const activePointers = new Map<number, { x: number; y: number; button: number }>();
  let primaryPointerId: number | null = null;
  let primaryButton = 0;
  let lastDragX = 0;
  let lastDragY = 0;
  let dragDistance = 0;
  let isDraggingOrbit = false;
  let multiTouchUsed = false;
  let prevPinchDist = 0;
  const getDragThresholdPx = () => (isMobileMode ? 10 : 6);

  const getPinchDistance = (): number => {
    if (activePointers.size < 2) return 0;
    const pts = Array.from(activePointers.values());
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    introSweepTimer = 0;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    if (activePointers.size === 1) {
      primaryPointerId = e.pointerId;
      primaryButton = e.button;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      dragDistance = 0;
      isDraggingOrbit = false;
      multiTouchUsed = false;
      prevPinchDist = 0;
    } else if (activePointers.size === 2) {
      multiTouchUsed = true;
      isDraggingOrbit = true;
      prevPinchDist = getPinchDistance();
      renderer.domElement.style.cursor = 'grabbing';
      clearHoverTarget();
    }
  };

  let lastHoverRaycastMs = 0;

  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdcX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    pointerNdcY = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    vfx2d.setParallax(pointerNdcX, pointerNdcY);

    if (activePointers.has(e.pointerId)) {
      const prev = activePointers.get(e.pointerId)!;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: prev.button });

      if (activePointers.size >= 2) {
        const dist = getPinchDistance();
        if (prevPinchDist > 10 && dist > 10) {
          orbitZoomScale = THREE.MathUtils.clamp(orbitZoomScale * (prevPinchDist / dist), 0.56, 1.58);
        }
        prevPinchDist = dist;
        renderer.domElement.style.cursor = 'grabbing';
        clearHoverTarget();
        return;
      }

      if (activePointers.size === 1 && e.pointerId === primaryPointerId && !multiTouchUsed) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        dragDistance += Math.hypot(dx, dy);

        if (dragDistance > getDragThresholdPx()) {
          if (!isDraggingOrbit) {
            isDraggingOrbit = true;
            try {
              renderer.domElement.setPointerCapture?.(e.pointerId);
            } catch {
              // ignore if synthetic pointer
            }
            renderer.domElement.style.cursor = 'grabbing';
            clearHoverTarget();
          }
          orbitYawOffset -= dx * 0.0068;
          orbitPitchOffset = THREE.MathUtils.clamp(orbitPitchOffset - dy * 0.0052, -0.62, 0.46);
          return;
        }
      }
    }

    if (
      sceneMode !== 'playing' ||
      (inputMode === 'touch' && activePointers.size === 0)
    ) {
      if (hoveredLane !== null) {
        hoveredLane = null;
        pushBadges(true);
      }
      clearHoverTarget();
      renderer.domElement.style.cursor = cardSelected ? 'crosshair' : 'grab';
      return;
    }

    const nowMs = performance.now();
    if (nowMs - lastHoverRaycastMs < 24) {
      return;
    }
    lastHoverRaycastMs = nowMs;

    _ndc.set(pointerNdcX, pointerNdcY);
    _raycaster.setFromCamera(_ndc, camera);

    // Detect hovered board hex/lane so lane runes only display on hover
    let nextHoveredLane: LaneRuneTarget | null = null;
    if (_raycaster.ray.intersectPlane(_arenaPlane, _hitPoint)) {
      const absZ = Math.abs(_hitPoint.z);
      if (absZ >= 0.72 && absZ <= 3.05 && Math.abs(_hitPoint.x) <= 4.15) {
        let bestLane = 0;
        let bestDist = Infinity;
        PLAYER_LANE_X.forEach((lx, idx) => {
          const d = Math.abs(_hitPoint.x - lx);
          if (d < bestDist) {
            bestDist = d;
            bestLane = idx;
          }
        });
        if (bestDist <= 1.05) {
          nextHoveredLane = { side: _hitPoint.z < 0 ? 'enemy' : 'player', lane: bestLane };
        }
      }
    }
    if (
      nextHoveredLane?.side !== hoveredLane?.side ||
      nextHoveredLane?.lane !== hoveredLane?.lane
    ) {
      hoveredLane = nextHoveredLane;
      pushBadges(true);
    }

    if (!hoverEnabled || !callbacks.onHoverTargetChange || hoverColliders.length === 0) {
      clearHoverTarget();
      renderer.domElement.style.cursor = cardSelected ? 'crosshair' : 'grab';
      return;
    }

    const hits = _raycaster.intersectObjects(hoverColliders, false);
    const hitData = hits[0]?.object?.userData?.hoverTarget as
      | { kind: 'creature'; uid: string }
      | { kind: 'archon'; side: 'player' | 'enemy' }
      | undefined;

    if (!hitData) {
      clearHoverTarget();
      renderer.domElement.style.cursor = cardSelected ? 'crosshair' : 'grab';
      return;
    }

    renderer.domElement.style.cursor = 'pointer';

    if (hitData.kind === 'creature') {
      const totem = activeTotems.get(hitData.uid);
      if (!totem) {
        clearHoverTarget();
        return;
      }
      const nextKey = `creature:${hitData.uid}`;
      if (nextKey !== activeHoverKey) {
        activeHoverKey = nextKey;
        const sealHex = totem.side === 'enemy' ? 0xe85a46 : schoolSlotHex(totem.school);
        hoverSealOuterMat.color.setHex(sealHex);
        hoverSealOuterMat.emissive.setHex(sealHex);
        hoverSealBeamMat.color.setHex(sealHex);
        hoverSealBeamMat.emissive.setHex(sealHex);
        hoverSealGroup.position.set(totem.group.position.x, 0.03, totem.group.position.z);
        hoverSealGroup.scale.setScalar(0.95);
        hoverSealGroup.visible = true;
        totem.badgeAnchor.getWorldPosition(_proj);
        const screen = projectWorldToScreen(_proj);
        callbacks.onHoverTargetChange({
          kind: 'creature',
          uid: hitData.uid,
          x: screen.x,
          y: screen.y,
        });
      }
    } else {
      const nextKey = `archon:${hitData.side}`;
      if (nextKey !== activeHoverKey) {
        activeHoverKey = nextKey;
        const archonPos = setDemiurgeWorldPos(hitData.side, _tmpA);
        const archonHex =
          hitData.side === 'enemy'
            ? 0xe85a46
            : schoolSlotHex(latestBoardSnapshot?.playerSchool ?? 'kinet');
        hoverSealOuterMat.color.setHex(archonHex);
        hoverSealOuterMat.emissive.setHex(archonHex);
        hoverSealBeamMat.color.setHex(archonHex);
        hoverSealBeamMat.emissive.setHex(archonHex);
        hoverSealGroup.position.set(archonPos.x, 0.04, archonPos.z);
        hoverSealGroup.scale.setScalar(1.32);
        hoverSealGroup.visible = true;
        archonPos.y = 1.9;
        const screen = projectWorldToScreen(archonPos);
        callbacks.onHoverTargetChange({
          kind: 'archon',
          side: hitData.side,
          x: screen.x,
          y: screen.y,
        });
      }
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDragging = isDraggingOrbit || multiTouchUsed || dragDistance > getDragThresholdPx();
    const wasPrimary = e.pointerId === primaryPointerId;
    const btn = activePointers.get(e.pointerId)?.button ?? primaryButton;
    activePointers.delete(e.pointerId);
    try {
      if (renderer.domElement.hasPointerCapture?.(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (activePointers.size < 2) prevPinchDist = 0;
    if (activePointers.size === 0) {
      isDraggingOrbit = false;
      primaryPointerId = null;
      renderer.domElement.style.cursor = cardSelected ? 'crosshair' : 'grab';

      if (wasPrimary && !wasDragging && sceneMode === 'playing') {
        if (btn === 2) {
          const { lane } = screenToLane(e.clientX, e.clientY);
          callbacks.onRightClickLane(lane);
        } else if (btn === 0) {
          const { side, lane } = screenToLane(e.clientX, e.clientY);
          callbacks.onLeftClickLane(side, lane);
        }
      }
    }
  };

  const onPointerCancel = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) prevPinchDist = 0;
    if (activePointers.size === 0) {
      isDraggingOrbit = false;
      primaryPointerId = null;
      renderer.domElement.style.cursor = cardSelected ? 'crosshair' : 'grab';
    }
  };

  const onPointerLeave = () => {
    if (!isDraggingOrbit) {
      clearHoverTarget();
      if (hoveredLane !== null) {
        hoveredLane = null;
        pushBadges(true);
      }
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    introSweepTimer = 0;
    const factor = e.deltaY > 0 ? 1.07 : 0.93;
    orbitZoomScale = THREE.MathUtils.clamp(orbitZoomScale * factor, 0.56, 1.58);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onResize = () => {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.fov = computeResponsiveFov(width, height);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(computeTargetDpr(currentGraphicsLevel));
    renderer.setSize(width, height);
    vfx2d.resize(width, height);
    pipeline.setSize(width, height);
    pipeline.render();
    vfx2d.updateAndRender(0, elapsed);
    pushBadges();
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('resize', onResize);

  publishGameHandle({
    ready: true,
    setPreset: (p: CameraPreset) => {
      currentPreset = p;
      introSweepTimer = 0;
      orbitYawOffset = 0;
      orbitPitchOffset = 0;
      orbitZoomScale = 1;
    },
    getOrbitState: () => ({
      yaw: Number(curOrbitYaw.toFixed(3)),
      pitch: Number(curOrbitPitch.toFixed(3)),
      zoom: Number(curOrbitZoom.toFixed(3)),
    }),
  });

  let last = performance.now();
  let frameId = 0;
  let disposed = false;
  let frameTimeEmaMs = 16.6;
  let adaptivePerfScale = 1.0;

  const afterDraw = (cb: () => void) => {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 50);
      }
    };
    frameId = window.setTimeout(poll, 5);
  };

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const frameDeltaMs = Math.min(now - last, 120);
    const rawDt = Math.min(frameDeltaMs / 1000, 0.05);
    last = now;

    if (!isSoftwareGl && sceneMode !== 'paused') {
      frameTimeEmaMs = frameTimeEmaMs * 0.92 + frameDeltaMs * 0.08;
      if (frameTimeEmaMs > 28 && adaptivePerfScale > 0.62) {
        adaptivePerfScale = Math.max(0.62, adaptivePerfScale - rawDt * 0.16);
        arena.setPerfScale(adaptivePerfScale);
      } else if (frameTimeEmaMs < 19 && adaptivePerfScale < 1.0) {
        adaptivePerfScale = Math.min(1.0, adaptivePerfScale + rawDt * 0.1);
        arena.setPerfScale(adaptivePerfScale);
      }
      if (warmClerestoryLight) warmClerestoryLight.intensity = 2.6 * adaptivePerfScale;
      if (coolClerestoryLight) coolClerestoryLight.intensity = 2.2 * adaptivePerfScale;
    }

    // Hitstop pauses sim ticks briefly on heavy blows while VFX/shake continue!
    if (hitstop > 0) {
      hitstop = Math.max(0, hitstop - rawDt);
    } else if (sceneMode !== 'paused' || briefingCameraActive) {
      elapsed += rawDt;
      arena.update(elapsed, pointerNdcX, pointerNdcY);
      playerDemiurge.update(elapsed, rawDt);
      enemyDemiurge.update(elapsed, rawDt);
      arenaVfx.update(elapsed);
      combatVfx3d.update(rawDt);
      for (const [uid, h] of activeTotems.entries()) {
        const tgt = totemTargets.get(uid);
        if (tgt) {
          h.group.position.x = THREE.MathUtils.damp(h.group.position.x, tgt.x, 12, rawDt);
          h.group.rotation.y = THREE.MathUtils.damp(h.group.rotation.y, tgt.rotY, 12, rawDt);
        }
        h.update(elapsed, rawDt);
      }

      // Tick dying KO totems until dissolve finishes
      for (let i = dyingTotems.length - 1; i >= 0; i--) {
        const item = dyingTotems[i];
        item.timer -= rawDt;
        item.handle.update(elapsed, rawDt);
        if (item.timer <= 0) {
          scene.remove(item.handle.group);
          item.handle.dispose();
          dyingTotems.splice(i, 1);
        }
      }

      combatFocusX = THREE.MathUtils.damp(combatFocusX, 0, 5.5, rawDt);
      combatFocusZ = THREE.MathUtils.damp(combatFocusZ, 0, 5.5, rawDt);

      if (pendingOutcomeAudio) {
        outcomeAudioDelay -= rawDt;
        if (outcomeAudioDelay <= 0) {
          if (pendingOutcomeAudio === 'victory') etherAudio.playVictory();
          else etherAudio.playDefeat();
          pendingOutcomeAudio = null;
        }
      }

      // Smoothly damp stage background, fog, rim light & floor slot rune glows
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(targetBgColor, 0.08);
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetFogColor, 0.08);
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetFogDensity, 6, rawDt);
      }
      rimLight.color.lerp(targetRimColor, 0.08);
      let ringColorDirty = false;
      slotVisuals.forEach((sv, idx) => {
        const dr = sv.sigilMat.color.r - sv.targetColor.r;
        const dg = sv.sigilMat.color.g - sv.targetColor.g;
        const db = sv.sigilMat.color.b - sv.targetColor.b;
        const colorSettled = dr * dr + dg * dg + db * db < 0.0001;
        const opacitySettled = Math.abs(sv.sigilMat.opacity - sv.targetOpacity) < 0.002;
        if (!colorSettled || !opacitySettled) {
          sv.sigilMat.color.lerp(sv.targetColor, 0.14);
          sv.sigilMat.emissive.lerp(sv.targetColor, 0.14);
          sv.sigilMat.opacity = THREE.MathUtils.damp(sv.sigilMat.opacity, sv.targetOpacity, 10, rawDt);
          _ringColorTmp.copy(sv.targetColor).multiplyScalar(0.35 + sv.targetOpacity * 1.15);
          sv.curRingColor.lerp(_ringColorTmp, 0.18);
          slotRingInstanced.setColorAt(idx, sv.curRingColor);
          ringColorDirty = true;
        }
        if (currentGraphicsLevel >= GRAPHICS_LEVEL.high && sv.targetOpacity > 0.3) {
          sv.sigilMesh.rotation.y += rawDt * (sv.targetOpacity > 0.6 ? 0.42 : 0.22);
        }
      });
      if (ringColorDirty && slotRingInstanced.instanceColor) {
        slotRingInstanced.instanceColor.needsUpdate = true;
      }
      if (previewBeaconGroup.visible) {
        previewBeaconGroup.rotation.y = elapsed * 1.4;
        previewBeaconMat.opacity = 0.36 + 0.18 * Math.sin(elapsed * 4.5);
      }
      if (hoverSealGroup.visible) {
        hoverSealOuter.rotation.y = elapsed * 0.95;
        hoverSealInner.rotation.y = -elapsed * 1.55;
        hoverSealBeamMat.opacity = 0.17 + 0.07 * Math.sin(elapsed * 4.2);
      }
    }

    curOrbitYaw = THREE.MathUtils.damp(curOrbitYaw, orbitYawOffset, 12, rawDt);
    curOrbitPitch = THREE.MathUtils.damp(curOrbitPitch, orbitPitchOffset, 12, rawDt);
    curOrbitZoom = THREE.MathUtils.damp(curOrbitZoom, orbitZoomScale, 12, rawDt);

    if (sceneMode === 'title') {
      // Live cinematic world spline orbit tour showcasing the Rose Sanctuary & sculpted duelists
      const angle = elapsed * 0.22 + curOrbitYaw;
      const baseR = 12.2 * curOrbitZoom;
      const titleY = THREE.MathUtils.clamp(5.2 + Math.sin(elapsed * 0.4) * 0.6 + curOrbitPitch * 5.0, 2.0, 12.0);
      _desiredPos.set(Math.sin(angle) * baseR, titleY, Math.cos(angle) * baseR);
      _desiredLook.set(0, 1.35, -0.4);
    } else if (briefingCameraActive) {
      // Slow ceremonial pre-match camera orbit framing the rival Archon & sanctuary
      const angle = 0.42 + Math.sin(elapsed * 0.26) * 0.48 + curOrbitYaw;
      const dist = (7.4 + Math.cos(elapsed * 0.19) * 0.55) * curOrbitZoom;
      const camY = THREE.MathUtils.clamp(3.35 + Math.sin(elapsed * 0.34) * 0.32 + curOrbitPitch * 3.0, 1.8, 7.5);
      _desiredPos.set(
        Math.sin(angle) * dist,
        camY,
        -4.2 + Math.cos(angle) * dist
      );
      _desiredLook.set(0, 1.45, -3.55);
    } else {
      const view = PRESET_VIEWS[currentPreset];
      const lookX = view.look[0] + combatFocusX * 0.65;
      const lookY = view.look[1];
      const lookZ = view.look[2] + combatFocusZ * 0.5;
      const offX = view.pos[0] - view.look[0];
      const offY = view.pos[1] - view.look[1];
      const offZ = view.pos[2] - view.look[2];
      const baseRadius = Math.hypot(offX, offY, offZ);
      const baseAzimuth = Math.atan2(offX, offZ);
      const basePolar = Math.acos(THREE.MathUtils.clamp(offY / Math.max(0.001, baseRadius), -1, 1));

      const az = baseAzimuth + curOrbitYaw + pointerNdcX * 0.032;
      const polar = THREE.MathUtils.clamp(basePolar + curOrbitPitch - pointerNdcY * 0.02, 0.24, 1.3);
      const rad = THREE.MathUtils.clamp(baseRadius * curOrbitZoom, 4.2, 23.0);

      if (introSweepTimer > 0) {
        introSweepTimer = Math.max(0, introSweepTimer - rawDt);
      }
      const sweepFactor = introSweepTimer > 0 ? Math.pow(introSweepTimer / 1.05, 2) : 0;

      const sinP = Math.sin(polar);
      _desiredPos.set(
        lookX + Math.sin(az) * sinP * rad + combatFocusX * 0.45 + sweepFactor * 1.4,
        lookY + Math.cos(polar) * rad + sweepFactor * 2.1,
        lookZ + Math.cos(az) * sinP * rad + combatFocusZ * 0.35 + sweepFactor * 2.2
      );
      _desiredLook.set(lookX, lookY + sweepFactor * 0.4, lookZ);
    }

    const lambda = 7.5;
    const camDt = isSoftwareGl ? Math.min(frameDeltaMs / 1000, 0.25) : rawDt;
    _camPos.x = THREE.MathUtils.damp(_camPos.x, _desiredPos.x, lambda, camDt);
    _camPos.y = THREE.MathUtils.damp(_camPos.y, _desiredPos.y, lambda, camDt);
    _camPos.z = THREE.MathUtils.damp(_camPos.z, _desiredPos.z, lambda, camDt);
    _camLook.x = THREE.MathUtils.damp(_camLook.x, _desiredLook.x, lambda, camDt);
    _camLook.y = THREE.MathUtils.damp(_camLook.y, _desiredLook.y, lambda, camDt);
    _camLook.z = THREE.MathUtils.damp(_camLook.z, _desiredLook.z, lambda, camDt);

    // Trauma-squared screen shake (Ultra only)
    const shakeMag = currentGraphicsLevel >= GRAPHICS_LEVEL.ultra ? trauma * trauma * 0.28 : 0;
    trauma = Math.max(0, trauma - rawDt * 2.2);
    camera.position.set(
      _camPos.x + (Math.random() - 0.5) * shakeMag,
      _camPos.y + (Math.random() - 0.5) * shakeMag,
      _camPos.z
    );
    camera.lookAt(_camLook);
    pipeline.setFocusTarget(_camLook.x, _camLook.y, _camLook.z);
    pipeline.render();

    if (currentGraphicsLevel >= GRAPHICS_LEVEL.ultra && targetingPreview && sceneMode === 'playing') {
      if (targetingPreview.altarMode) {
        setDemiurgeWorldPos('player', _tmpPreviewTarget);
      } else if (targetingPreview.kind === 'creature') {
        const emptyIdx = latestBoardSnapshot?.playerBoard.findIndex((c) => c === null) ?? -1;
        const laneIdx = emptyIdx >= 0 ? emptyIdx : 1;
        setLaneWorldPos('player', laneIdx, _tmpPreviewTarget);
        _tmpPreviewTarget.y = 0.12;
      } else if (targetingPreview.kind === 'trap') {
        _tmpPreviewTarget.set(0, 0.3, 3.2);
      } else if (targetingPreview.kind === 'enchantment') {
        _tmpPreviewTarget.set(-4.2, 1.35, 3.3);
      } else if (targetingPreview.kind === 'spell' && targetingPreview.targetSide === 'enemy') {
        const enemyIdx = latestBoardSnapshot?.enemyBoard.findIndex((c) => c !== null) ?? -1;
        if (enemyIdx >= 0) setLaneWorldPos('enemy', enemyIdx, _tmpPreviewTarget);
        else setDemiurgeWorldPos('enemy', _tmpPreviewTarget);
      } else {
        setDemiurgeWorldPos('player', _tmpPreviewTarget);
      }
      const targetScreen = projectWorldToScreen(_tmpPreviewTarget);
      vfx2d.setTargetingArc({
        sx: targetingPreview.startX,
        sy: targetingPreview.startY,
        tx: targetScreen.x,
        ty: targetScreen.y,
        colorIdx: targetingPreview.altarMode ? 2 : schoolColorIndex(targetingPreview.school),
      });
    } else {
      vfx2d.setTargetingArc(null);
    }

    vfx2d.updateAndRender(rawDt, elapsed);

    const isOrbiting =
      isDraggingOrbit ||
      Math.abs(curOrbitYaw - orbitYawOffset) > 0.004 ||
      Math.abs(curOrbitPitch - orbitPitchOffset) > 0.004 ||
      Math.abs(curOrbitZoom - orbitZoomScale) > 0.004;
    badgeAcc += rawDt;
    if (badgeAcc >= (isOrbiting ? 0.032 : 0.08)) {
      badgeAcc = 0;
      pushBadges();
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  };

  tick();

  return {
    syncDuelState,
    syncExternalState: (ext: ExternalDeviceState) => {
      const dprChanged = isMobileMode !== ext.isMobile;
      isMobileMode = ext.isMobile;
      inputMode = ext.inputMode;
      if (dprChanged) {
        renderer.setPixelRatio(computeTargetDpr(currentGraphicsLevel));
        renderer.setSize(width, height);
      }
    },
    setPreset: (preset: CameraPreset) => {
      currentPreset = preset;
      introSweepTimer = 0;
      orbitYawOffset = 0;
      orbitPitchOffset = 0;
      orbitZoomScale = 1;
    },
    setBriefingCamera: (active: boolean) => {
      briefingCameraActive = active;
    },
    setCardSelected: (selected: boolean) => {
      cardSelected = selected;
      renderer.domElement.style.cursor = selected ? 'crosshair' : 'grab';
      refreshSlotVisuals();
      pushBadges(true);
    },
    setPattern: (pattern: ArcanePatternId) => {
      activePattern = pattern;
      const school = latestBoardSnapshot?.playerSchool ?? 'kinet';
      const hex = schoolSlotHex(school);
      mats.runeEmissiveMat.color.setHex(
        pattern === 'triangle'
          ? 0x62f2e4
          : pattern === 'star'
            ? 0xf4cc68
            : pattern === 'circle'
              ? 0x79ea74
              : hex
      );
    },
    triggerPattern: (pattern?: ArcanePatternId) => {
      const chosen = pattern ?? activePattern;
      activePattern = chosen;
      const school = latestBoardSnapshot?.playerSchool ?? 'kinet';
      const targetLane = Math.max(
        0,
        latestBoardSnapshot?.playerBoard.findIndex((c) => c !== null) ?? 1
      );
      const worldPos = setLaneWorldPos('player', targetLane, _tmpA);
      worldPos.y = 0.25;
      combatVfx3d.spawnPatternSigil3D(worldPos, chosen, school);
      arena.triggerRoseFlare(school, false);
      etherAudio.playUiSelect();
      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        const pt = projectWorldToScreen(worldPos);
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(school), 18, 200);
      }
    },
    setTargetingPreview: (preview: TargetingPreview | null) => {
      targetingPreview = preview;
    },
    setPowerHoverPreview: (kind: ArchonPowerHoverKind | null, snapshot?: DuelState | null) => {
      hoveredPowerKind = kind;
      hoveredPowerSnapshot = snapshot ?? null;
      refreshSlotVisuals();
    },
    triggerCardCast: (x: number, y: number, school: MagicSchool) => {
      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        vfx2d.spawnCardLaunch(x, y, schoolColorIndex(school));
      }
    },
    triggerVisualPulse: (lane = 1) => {
      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        const pt = projectWorldToScreen(setLaneWorldPos('player', lane, _tmpA));
        vfx2d.spawnBurst(pt.x, pt.y, 0, 20, 220);
      }
      for (const h of activeTotems.values()) {
        if (h.side === 'player') h.triggerJump();
      }
    },
    triggerBattleStartVfx: (school: MagicSchool = 'kinet') => {
      playerDemiurge.group.updateMatrixWorld(true);
      enemyDemiurge.group.updateMatrixWorld(true);
      playerDemiurge.update(elapsed, 0);
      enemyDemiurge.update(elapsed, 0);
      playerDemiurge.triggerCastFlare();
      enemyDemiurge.triggerCastFlare();
      arena.triggerRoseFlare(school, true);
      etherAudio.playBattleStart(school);
      const pStaff =
        playerDemiurge.staffOriginWorld.lengthSq() > 0.01
          ? playerDemiurge.staffOriginWorld
          : setDemiurgeWorldPos('player', _tmpA);
      const eStaff =
        enemyDemiurge.staffOriginWorld.lengthSq() > 0.01
          ? enemyDemiurge.staffOriginWorld
          : setDemiurgeWorldPos('enemy', _tmpB);
      combatVfx3d.spawnBattleStart3D(pStaff, eStaff, school);
      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        const pt = projectWorldToScreen(_tmpC.set(0, 1.35, 0));
        vfx2d.spawnBurst(pt.x, pt.y, schoolColorIndex(school), 28, 280);
        vfx2d.triggerFlash(school === 'chaos' ? '#FF7E66' : '#F4CC68', 0.2);
      }
      if (currentPreset === 'combat') {
        introSweepTimer = 1.05;
      }
    },
    dispose: () => {
      disposed = true;
      animationQueue.clear();
      unsubQueueBusy();
      unsubGraphics();
      unsubFastCombat();
      unsubHover();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);

      for (const h of activeTotems.values()) h.dispose();
      activeTotems.clear();
      dyingTotems.forEach((d) => d.handle.dispose());
      dyingTotems.length = 0;
      previewBeaconRingGeo.dispose();
      previewBeaconBeamGeo.dispose();
      previewBeaconMat.dispose();
      hoverSealOuterGeo.dispose();
      hoverSealInnerGeo.dispose();
      hoverSealBeamGeo.dispose();
      hoverSealOuterMat.dispose();
      hoverSealBeamMat.dispose();
      slotSigilGeo.dispose();
      slotRingGeo.dispose();
      slotSigilTex.dispose();
      slotRingInstanced.dispose();
      slotRingInstMat.dispose();
      slotVisuals.forEach((sv) => {
        sv.sigilMat.dispose();
      });
      arena.dispose();
      playerDemiurge.dispose();
      enemyDemiurge.dispose();
      arenaVfx.dispose();
      combatVfx3d.dispose();
      mats.dispose();
      cathedralEnvTex.dispose();
      vfx2d.dispose();
      pipeline.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
