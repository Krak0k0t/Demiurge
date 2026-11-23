import * as THREE from 'three';
import { publishGameHandle, publishMetrics } from '../core/events';
import { getGraphicsLevel, GRAPHICS_LEVEL, subscribeGraphicsQuality } from '../core/graphicsSettings';
import { readLaunchParams } from '../core/rng';
import { etherAudio } from '../audio/etherAudio';
import { createCathedralHdriEnvironment } from './materials/proceduralNoise';
import { createTarotMaterialLibrary, TAROT_PALETTE } from './materials/tarotMaterials';
import { createCinematicPipeline } from './postprocessing/cinematicPipeline';
import { buildArenaEnvironment } from './assets/arenaEnv';
import { buildDemiurgeSculpt } from './assets/demiurgeSculpts';
import { buildCreatureTotem, type CreatureTotemHandle, type MagicSchool } from './assets/creatureTotems';
import { buildEtherVfx } from './assets/etherVfx';

export type LookDevPreset = 'combat' | 'closeup' | 'wide';

export interface ProjectedCreatureBadge {
  id: string;
  name: string;
  school: MagicSchool;
  side: 'player' | 'enemy';
  atk: number;
  hp: number;
  x: number;
  y: number;
  visible: boolean;
}

export interface LookDevUiState {
  preset: LookDevPreset;
  overloadActive: boolean;
  playerHp: number;
  playerEther: number;
  playerMaxEther: number;
  enemyHp: number;
  enemyEther: number;
  badges: ProjectedCreatureBadge[];
}

export interface LookDevBridge {
  setPreset: (preset: LookDevPreset) => void;
  toggleOverload: () => void;
  dispose: () => void;
}

const PRESET_VIEWS: Record<LookDevPreset, { pos: [number, number, number]; look: [number, number, number] }> = {
  combat: { pos: [-1.85, 6.7, 13.9], look: [0.05, 0.35, 0.85] },
  closeup: { pos: [2.95, 2.35, 2.15], look: [-0.2, 0.82, -0.25] },
  wide: { pos: [8.4, 7.6, 11.8], look: [0, 0.7, 0.2] },
};

const _proj = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();

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

export function mountLookDevScene(
  container: HTMLElement,
  onUiUpdate: (state: LookDevUiState) => void
): LookDevBridge {
  const launch = readLaunchParams(window.location.search);
  const isSoftwareGl = detectSoftwareGl();

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1f1d33);
  scene.fog = new THREE.FogExp2(0x1f1d33, 0.011);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 70);
  _camPos.set(...PRESET_VIEWS.combat.pos);
  _camLook.set(...PRESET_VIEWS.combat.look);
  camera.position.copy(_camPos);
  camera.lookAt(_camLook);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const cathedralEnvTex = createCathedralHdriEnvironment(renderer);
  scene.environment = cathedralEnvTex;
  scene.environmentIntensity = 1.06;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const mats = createTarotMaterialLibrary(maxAniso, launch.seed);
  const contactTex = mats.contactTex;

  const hemi = new THREE.HemisphereLight(0x9ab5dc, 0x382d47, 1.32);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffe4b8, 1.75);
  keyLight.position.set(7.0, 12.0, 6.0);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const frontFillLight = new THREE.DirectionalLight(0xc4d8f5, 0.94);
  frontFillLight.position.set(-6.5, 6.2, 11.5);
  scene.add(frontFillLight);

  const rimLight = new THREE.DirectionalLight(TAROT_PALETTE.ether, 1.08);
  rimLight.position.set(-7, 5, -8.5);
  scene.add(rimLight);

  const channelLight = new THREE.PointLight(TAROT_PALETTE.ether, 0.85, 18, 1.4);
  channelLight.position.set(0, 6.2, 1.0);
  scene.add(channelLight);

  // Environment & Hero Sculpt Assembly
  const arena = buildArenaEnvironment(mats);
  scene.add(arena.group);

  const playerDemiurge = buildDemiurgeSculpt('player', mats, contactTex);
  playerDemiurge.group.position.set(0, 0.34, 4.8);
  playerDemiurge.group.rotation.y = Math.PI;
  scene.add(playerDemiurge.group);

  const enemyDemiurge = buildDemiurgeSculpt('enemy', mats, contactTex);
  enemyDemiurge.group.position.set(0, 0.34, -4.8);
  scene.add(enemyDemiurge.group);

  // 4 School Creatures arranged in classic Etherlords duel lanes
  const creatures: CreatureTotemHandle[] = [
    buildCreatureTotem('c-kinet', 'Крылатый Сильф', 'kinet', 'player', 3, 2, mats, contactTex),
    buildCreatureTotem('c-synth', 'Бронзовый Конструкт', 'synth', 'player', 2, 5, mats, contactTex),
    buildCreatureTotem('c-chaos', 'Обсидиановый Ифрит', 'chaos', 'enemy', 4, 3, mats, contactTex),
    buildCreatureTotem('c-vital', 'Янтарный Роевик', 'vital', 'enemy', 3, 4, mats, contactTex),
  ];

  const lanePositions: [number, number, number, number][] = [
    [-2.05, 0, 1.65, Math.PI - 0.28],
    [2.05, 0, 1.65, Math.PI + 0.28],
    [-2.05, 0, -1.65, 0.28],
    [2.05, 0, -1.65, -0.28],
  ];
  creatures.forEach((c, idx) => {
    const [x, y, z, rotY] = lanePositions[idx];
    c.group.position.set(x, y, z);
    c.group.rotation.y = rotY;
    scene.add(c.group);
  });

  const vfx = buildEtherVfx(launch.seed);
  scene.add(vfx.group);

  const pipeline = createCinematicPipeline(
    renderer,
    scene,
    camera,
    width,
    height,
    getGraphicsLevel(),
    isSoftwareGl
  );
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }
  const unsubGraphics = subscribeGraphicsQuality((_q, lvl) => {
    pipeline.setGraphicsLevel(lvl);
    pipeline.setSize(width, height);
    arena.setGraphicsLevel(lvl);
    vfx.setGraphicsLevel(lvl);
    const shadowsOn = !isSoftwareGl && lvl >= GRAPHICS_LEVEL.high;
    renderer.shadowMap.enabled = shadowsOn;
    keyLight.castShadow = shadowsOn;
  });

  let currentPreset: LookDevPreset = 'combat';
  let overloadActive = false;
  let elapsed = 0;
  const eventLog: Array<{ type: string; at: number }> = [];

  const recordEvent = (type: string) => {
    eventLog.push({ type, at: Number(elapsed.toFixed(2)) });
    if (eventLog.length > 20) eventLog.shift();
  };

  const projectBadges = (): ProjectedCreatureBadge[] =>
    creatures.map((c) => {
      c.badgeAnchor.getWorldPosition(_proj);
      _proj.project(camera);
      const x = (_proj.x * 0.5 + 0.5) * width;
      const y = (-_proj.y * 0.5 + 0.5) * height;
      const visible = _proj.z > -1 && _proj.z < 1;
      return {
        id: c.id,
        name: c.name,
        school: c.school,
        side: c.side,
        atk: c.atk,
        hp: c.hp,
        x,
        y,
        visible,
      };
    });

  const pushState = () => {
    onUiUpdate({
      preset: currentPreset,
      overloadActive,
      playerHp: overloadActive ? 22 : 25,
      playerEther: overloadActive ? 6 : 4,
      playerMaxEther: 4,
      enemyHp: 22,
      enemyEther: 4,
      badges: projectBadges(),
    });
    publishMetrics({
      completed: overloadActive,
      overloadActive,
      moves: eventLog.length,
      ether: overloadActive ? 6 : 4,
      hp: overloadActive ? 22 : 25,
      events: eventLog,
    });
  };

  const applyOverloadVisuals = (active: boolean) => {
    overloadActive = active;
    recordEvent(active ? 'overload:on' : 'overload:off');
    const runeHex = active ? TAROT_PALETTE.overload : 0x9c7c3b;
    const lightHex = active ? TAROT_PALETTE.overload : TAROT_PALETTE.ether;

    mats.runeEmissiveMat.color.setHex(runeHex);
    mats.runeEmissiveMat.emissive.setHex(active ? 0x7d2015 : 0x6b5220);
    mats.runeEmissiveMat.emissiveIntensity = active ? 0.9 : 0.55;

    channelLight.color.setHex(lightHex);
    channelLight.intensity = active ? 2.1 : 1.4;

    playerDemiurge.setOverloadVisual(active);
    vfx.setOverload(active);
    pushState();
  };

  const setPreset = (preset: LookDevPreset) => {
    currentPreset = preset;
    recordEvent(`preset:${preset}`);
    etherAudio.playUiSelect();
    pushState();
  };

  const toggleOverload = () => {
    const next = !overloadActive;
    etherAudio.playOverloadToggle(next);
    applyOverloadVisuals(next);
  };

  publishGameHandle({
    ready: true,
    toggleOverload,
    reset: () => {
      currentPreset = 'combat';
      applyOverloadVisuals(false);
    },
  });
  // Expose lookdev preset hook cleanly for capture.mjs verification
  (window as unknown as Record<string, unknown>).__LOOKDEV_SET_PRESET__ = (p: LookDevPreset) => {
    currentPreset = p;
    recordEvent(`preset:${p}`);
    pushState();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggleOverload();
    } else if (e.code === 'Digit1') setPreset('combat');
    else if (e.code === 'Digit2') setPreset('closeup');
    else if (e.code === 'Digit3') setPreset('wide');
  };

  const onResize = () => {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    pipeline.setSize(width, height);
    pushState();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  let last = performance.now();
  let frameId = 0;
  let disposed = false;
  let badgeAccumulator = 0;

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
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  };

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    arena.update(elapsed, 0, 0);
    playerDemiurge.update(elapsed);
    enemyDemiurge.update(elapsed);
    creatures.forEach((c) => c.update(elapsed));
    vfx.update(elapsed);

    const view = PRESET_VIEWS[currentPreset];
    _desiredPos.set(...view.pos);
    _desiredLook.set(...view.look);

    const lambda = 7;
    _camPos.x = THREE.MathUtils.damp(_camPos.x, _desiredPos.x, lambda, dt);
    _camPos.y = THREE.MathUtils.damp(_camPos.y, _desiredPos.y, lambda, dt);
    _camPos.z = THREE.MathUtils.damp(_camPos.z, _desiredPos.z, lambda, dt);
    _camLook.x = THREE.MathUtils.damp(_camLook.x, _desiredLook.x, lambda, dt);
    _camLook.y = THREE.MathUtils.damp(_camLook.y, _desiredLook.y, lambda, dt);
    _camLook.z = THREE.MathUtils.damp(_camLook.z, _desiredLook.z, lambda, dt);

    camera.position.copy(_camPos);
    camera.lookAt(_camLook);
    pipeline.setFocusTarget(_camLook.x, _camLook.y, _camLook.z);
    pipeline.render();

    badgeAccumulator += dt;
    if (badgeAccumulator >= 0.05) {
      badgeAccumulator = 0;
      pushState();
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  };

  pushState();
  tick();

  return {
    setPreset,
    toggleOverload,
    dispose: () => {
      disposed = true;
      unsubGraphics();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      delete (window as unknown as Record<string, unknown>).__LOOKDEV_SET_PRESET__;

      arena.dispose();
      playerDemiurge.dispose();
      enemyDemiurge.dispose();
      creatures.forEach((c) => c.dispose());
      vfx.dispose();
      mats.dispose();
      cathedralEnvTex.dispose();
      pipeline.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
