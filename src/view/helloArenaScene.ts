import * as THREE from 'three';
import { publishGameHandle, publishMetrics, type GameEvent } from '../core/events';
import { getGraphicsLevel } from '../core/graphicsSettings';
import { createRng, readLaunchParams } from '../core/rng';
import {
  buildNormalMapFromCanvas,
  createCathedralHdriEnvironment,
  createPerlinNormalRoughnessPair,
  Perlin2D,
} from './materials/proceduralNoise';
import { createCinematicPipeline } from './postprocessing/cinematicPipeline';
import {
  createInitialHelloState,
  stepTotemPosition,
  toggleOverload,
  type HelloState,
} from '../systems/etherChannel';

export interface HelloSceneBridge {
  toggleOverload: () => void;
  reset: () => void;
  dispose: () => void;
}

const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

const PALETTE = {
  obsidian: 0x1a181a,
  basalt: 0x453636,
  slate: 0x5b5b5b,
  bronze: 0x956842,
  gold: 0xbe9f4e,
  ether: 0x679793,
  order: 0x6a8498,
  overload: 0xb93826,
} as const;

function detectSoftwareGl(): boolean {
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) ?? '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function createBasaltTextures(maxAnisotropy: number, seed: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const rng = createRng(seed);
  const perlin = new Perlin2D(seed + 19);
  const size = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  cCtx.fillStyle = '#181618';
  cCtx.fillRect(0, 0, size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#484848';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const r = rng.range(8, 52);
    const v = Math.floor(rng.range(18, 34));
    cCtx.fillStyle = `rgba(${v + 4}, ${v}, ${v + 2}, 0.25)`;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();

    const roughVal = Math.floor(rng.range(24, 96));
    rCtx.fillStyle = `rgba(${roughVal}, ${roughVal}, ${roughVal}, 0.35)`;
    rCtx.beginPath();
    rCtx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    rCtx.fill();
  }

  cCtx.strokeStyle = 'rgba(190, 159, 78, 0.16)';
  cCtx.lineWidth = 2;
  const cx = size / 2;
  const cy = size / 2;
  [110, 175, 224].forEach((radius) => {
    cCtx.beginPath();
    cCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    cCtx.stroke();
  });
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4;
    cCtx.beginPath();
    cCtx.moveTo(cx + Math.cos(ang) * 70, cy + Math.sin(ang) * 70);
    cCtx.lineTo(cx + Math.cos(ang) * 238, cy + Math.sin(ang) * 238);
    cCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(roughCanvas, perlin, {
    strength: 2.8,
    noiseWeight: 0.45,
    noiseFreq: 10,
    maxAnisotropy,
  });

  return { map, roughnessMap, normalMap };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function mountHelloArenaScene(
  container: HTMLElement,
  onHudUpdate: (state: HelloState) => void
): HelloSceneBridge {
  const launch = readLaunchParams(window.location.search);
  const isSoftwareGl = detectSoftwareGl();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.obsidian);
  scene.fog = new THREE.FogExp2(PALETTE.obsidian, 0.032);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
  camera.position.set(0, 6.8, 10.6);
  camera.lookAt(0, 0.9, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const cathedralEnvTex = createCathedralHdriEnvironment(renderer);
  scene.environment = cathedralEnvTex;
  scene.environmentIntensity = 1.06;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const basaltTex = createBasaltTextures(maxAniso, launch.seed);
  const surfacePair = createPerlinNormalRoughnessPair(launch.seed + 303, {
    size: 128,
    baseFreq: 7,
    octaves: 3,
    normalStrength: 2.2,
    roughMin: 0.2,
    roughMax: 0.65,
    repeat: 2,
    maxAnisotropy: maxAniso,
  });
  const contactShadowTex = createContactShadowTexture();

  // Lighting rig: warm golden key + cool slate hemisphere fill + camera-side fill + crisp rim light
  const hemi = new THREE.HemisphereLight(0x9ab5dc, 0x352c44, 1.15);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffe4b8, 1.75);
  keyLight.position.set(5.5, 9.5, 5.0);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const frontFillLight = new THREE.DirectionalLight(0xc4d8f5, 0.88);
  frontFillLight.position.set(-5.5, 5.5, 9.5);
  scene.add(frontFillLight);

  const rimLight = new THREE.DirectionalLight(PALETTE.ether, 1.12);
  rimLight.position.set(-6, 4.5, -7.5);
  scene.add(rimLight);

  const totemGlowLight = new THREE.PointLight(PALETTE.ether, 2.4, 8, 2);
  totemGlowLight.position.set(0, 1.4, 0);
  scene.add(totemGlowLight);

  // Materials (100% PBR with normalMap & roughnessMap)
  const wetBasaltMat = new THREE.MeshPhysicalMaterial({
    map: basaltTex.map,
    normalMap: basaltTex.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: basaltTex.roughnessMap,
    color: 0xffffff,
    roughness: 0.36,
    metalness: 0.25,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
  });
  const slateTrimMat = new THREE.MeshStandardMaterial({
    color: 0x262123,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.72,
    metalness: 0.32,
  });
  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.bronze,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.32,
    metalness: 0.88,
    anisotropy: 0.7,
  });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.gold,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.2,
    metalness: 0.94,
    anisotropy: 0.75,
    emissive: 0x3b2c0c,
    emissiveIntensity: 0.35,
  });
  const fluoriteMat = new THREE.MeshPhysicalMaterial({
    color: 0x121318,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.14,
    metalness: 0.3,
    clearcoat: 0.65,
  });
  const runeRingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    emissive: PALETTE.gold,
    emissiveIntensity: 1.4,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.25,
    metalness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const coreCrystalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ether,
    emissive: PALETTE.ether,
    emissiveIntensity: 2.1,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.15,
    metalness: 0.1,
  });
  const fresnelRimMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(PALETTE.ether) },
      uIntensity: { value: 1.15 },
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.6);
        gl_FragColor = vec4(uColor * uIntensity, fresnel * 0.78);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Arena platform (grounded top surface at y = 0)
  const arenaGroup = new THREE.Group();
  const arenaSlabGeo = new THREE.CylinderGeometry(5.2, 5.6, 0.6, 8);
  const arenaSlab = new THREE.Mesh(arenaSlabGeo, wetBasaltMat);
  arenaSlab.position.y = -0.3;
  arenaSlab.receiveShadow = true;
  arenaGroup.add(arenaSlab);

  const outerRingGeo = new THREE.TorusGeometry(5.28, 0.12, 8, 8);
  const outerRing = new THREE.Mesh(outerRingGeo, bronzeMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.rotation.z = Math.PI / 8;
  outerRing.position.y = 0.02;
  arenaGroup.add(outerRing);

  const runeRingGeo = new THREE.RingGeometry(3.55, 3.68, 64);
  const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.y = 0.015;
  arenaGroup.add(runeRing);

  // Outer void floor plane to anchor fog fade
  const voidFloorGeo = new THREE.CircleGeometry(32, 32);
  const voidFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0f0e10,
    normalMap: surfacePair.normalMap,
    roughnessMap: surfacePair.roughnessMap,
    roughness: 0.9,
    metalness: 0.1,
  });
  const voidFloor = new THREE.Mesh(voidFloorGeo, voidFloorMat);
  voidFloor.rotation.x = -Math.PI / 2;
  voidFloor.position.y = -0.62;
  arenaGroup.add(voidFloor);

  // 4 monolithic basalt pillars with glowing gold inner slits
  const pillarGeo = new THREE.BoxGeometry(0.68, 4.4, 0.68);
  const pillarCapGeo = new THREE.OctahedronGeometry(0.38, 0);
  const pillarSlitGeo = new THREE.BoxGeometry(0.14, 3.2, 0.72);
  const pillarAngles = [
    Math.PI * 0.25,
    Math.PI * 0.75,
    Math.PI * 1.25,
    Math.PI * 1.75,
  ];
  pillarAngles.forEach((angle) => {
    const pillar = new THREE.Group();
    pillar.position.set(Math.cos(angle) * 5.6, -0.3, Math.sin(angle) * 5.6);
    pillar.rotation.y = -angle;

    const body = new THREE.Mesh(pillarGeo, slateTrimMat);
    body.position.y = 2.2;
    body.castShadow = true;
    body.receiveShadow = true;
    pillar.add(body);

    const slit = new THREE.Mesh(pillarSlitGeo, runeRingMat);
    slit.position.y = 2.15;
    pillar.add(slit);

    const cap = new THREE.Mesh(pillarCapGeo, fluoriteMat);
    cap.position.y = 4.75;
    pillar.add(cap);

    arenaGroup.add(pillar);
  });

  // Two opposing Demiurge daises (Etherlords framing)
  const daisGeo = new THREE.CylinderGeometry(0.85, 1.05, 0.36, 6);
  const northDais = new THREE.Mesh(daisGeo, bronzeMat);
  northDais.position.set(0, 0.18, -4.4);
  const southDais = new THREE.Mesh(daisGeo, bronzeMat);
  southDais.position.set(0, 0.18, 4.4);
  arenaGroup.add(northDais, southDais);

  scene.add(arenaGroup);

  // Composite 8-part Hero Ether Totem (pivot bottom-center at y = 0)
  const totemGroup = new THREE.Group();

  const shadowDiscGeo = new THREE.PlaneGeometry(1.9, 1.9);
  const shadowDiscMat = new THREE.MeshStandardMaterial({
    map: contactShadowTex,
    color: 0x000000,
    roughness: 1,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  totemGroup.add(shadowDisc);

  const plinthGeo = new THREE.CylinderGeometry(0.62, 0.78, 0.24, 8);
  const plinth = new THREE.Mesh(plinthGeo, bronzeMat);
  plinth.position.y = 0.12;
  plinth.castShadow = true;
  totemGroup.add(plinth);

  const collarGeo = new THREE.CylinderGeometry(0.42, 0.56, 0.28, 12);
  const collar = new THREE.Mesh(collarGeo, slateTrimMat);
  collar.position.y = 0.38;
  collar.castShadow = true;
  totemGroup.add(collar);

  const crystalAnchor = new THREE.Group();
  crystalAnchor.position.y = 1.25;
  totemGroup.add(crystalAnchor);

  const coreGeo = new THREE.OctahedronGeometry(0.46, 0);
  const coreMesh = new THREE.Mesh(coreGeo, coreCrystalMat);
  coreMesh.scale.set(0.85, 1.35, 0.85);
  coreMesh.castShadow = true;
  crystalAnchor.add(coreMesh);

  const fresnelShellGeo = new THREE.OctahedronGeometry(0.54, 1);
  const fresnelShell = new THREE.Mesh(fresnelShellGeo, fresnelRimMat);
  fresnelShell.scale.set(0.9, 1.4, 0.9);
  crystalAnchor.add(fresnelShell);

  // 4 cubic fluorite casing shards orbiting/framing the glowing core
  const shardGeo = new THREE.BoxGeometry(0.24, 0.42, 0.24);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const shard = new THREE.Mesh(shardGeo, fluoriteMat);
    shard.position.set(Math.cos(a) * 0.52, (i % 2 === 0 ? 0.12 : -0.12), Math.sin(a) * 0.52);
    shard.rotation.set(0.35, a, 0.25);
    shard.castShadow = true;
    crystalAnchor.add(shard);
  }

  // Dual gold Tarot astrolabe rings
  const astroOuterGeo = new THREE.TorusGeometry(0.86, 0.032, 8, 48);
  const astroOuter = new THREE.Mesh(astroOuterGeo, goldMat);
  crystalAnchor.add(astroOuter);

  const astroInnerGeo = new THREE.TorusGeometry(0.68, 0.025, 8, 36);
  const astroInner = new THREE.Mesh(astroInnerGeo, goldMat);
  astroInner.rotation.x = Math.PI / 2;
  crystalAnchor.add(astroInner);

  scene.add(totemGroup);

  const pipeline = createCinematicPipeline(
    renderer,
    scene,
    camera,
    width,
    height,
    getGraphicsLevel(),
    isSoftwareGl,
    { bloomIntensity: 0.28 }
  );
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // State, Input & Metrics
  let gameState = createInitialHelloState();
  const events: GameEvent[] = [];
  const pressedKeys = new Set<string>();
  let spaceEdgeConsumed = false;
  let elapsedSim = 0;

  const syncOverloadVisuals = (overload: boolean) => {
    const accentHex = overload ? PALETTE.overload : PALETTE.ether;
    const ringHex = overload ? PALETTE.overload : PALETTE.gold;
    coreCrystalMat.color.setHex(accentHex);
    coreCrystalMat.emissive.setHex(accentHex);
    coreCrystalMat.emissiveIntensity = overload ? 2.8 : 2.0;
    runeRingMat.color.setHex(ringHex);
    runeRingMat.emissive.setHex(ringHex);
    runeRingMat.emissiveIntensity = overload ? 2.2 : 1.35;
    totemGlowLight.color.setHex(accentHex);
    totemGlowLight.intensity = overload ? 3.8 : 2.6;
    fresnelRimMat.uniforms.uColor.value.setHex(accentHex);
    fresnelRimMat.uniforms.uIntensity.value = overload ? 1.55 : 1.15;
  };

  const emitHudAndMetrics = () => {
    onHudUpdate(gameState);
    publishMetrics({
      completed: gameState.completed,
      overloadActive: gameState.overloadActive,
      moves: gameState.moves,
      ether: gameState.ether,
      hp: gameState.hp,
      events: events.slice(-24),
    });
  };

  const triggerOverload = () => {
    gameState = toggleOverload(gameState);
    events.push({
      type: gameState.overloadActive ? 'overload_on' : 'overload_off',
      at: Number(elapsedSim.toFixed(2)),
    });
    syncOverloadVisuals(gameState.overloadActive);
    emitHudAndMetrics();
  };

  const resetArena = () => {
    gameState = createInitialHelloState();
    events.push({ type: 'reset', at: Number(elapsedSim.toFixed(2)) });
    syncOverloadVisuals(false);
    emitHudAndMetrics();
  };

  publishGameHandle({
    ready: true,
    toggleOverload: triggerOverload,
    reset: resetArena,
  });
  emitHudAndMetrics();

  const onKeyDown = (e: KeyboardEvent) => {
    pressedKeys.add(e.code);
    if (e.code === 'Space' && !spaceEdgeConsumed) {
      e.preventDefault();
      spaceEdgeConsumed = true;
      triggerOverload();
    } else if (e.code === 'KeyR') {
      resetArena();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    pressedKeys.delete(e.code);
    if (e.code === 'Space') spaceEdgeConsumed = false;
  };

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    pipeline.setSize(w, h);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);

  // Fixed timestep + software WebGL pacing loop
  const STEP = 1 / 60;
  let acc = 0;
  let last = performance.now();
  let frameId = 0;
  let disposed = false;

  const updateFixed = (dt: number) => {
    elapsedSim += dt;
    const ix =
      (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD') ? 1 : 0) -
      (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA') ? 1 : 0);
    const iz =
      (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS') ? 1 : 0) -
      (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW') ? 1 : 0);

    if (ix !== 0 || iz !== 0) {
      const prevMoves = gameState.moves;
      gameState = stepTotemPosition(gameState, { ix, iz }, dt);
      if (prevMoves === 0 || gameState.moves % 10 === 0) {
        if (prevMoves === 0) {
          events.push({ type: 'first_move', at: Number(elapsedSim.toFixed(2)) });
        }
        emitHudAndMetrics();
      }
    }
  };

  const renderFrame = (dt: number) => {
    const t = elapsedSim;
    totemGroup.position.x = THREE.MathUtils.damp(totemGroup.position.x, gameState.x, 12, dt);
    totemGroup.position.z = THREE.MathUtils.damp(totemGroup.position.z, gameState.z, 12, dt);

    crystalAnchor.position.y = 1.25 + Math.sin(t * 2.1) * 0.08;
    coreMesh.rotation.y += dt * (gameState.overloadActive ? 2.4 : 0.9);
    astroOuter.rotation.y += dt * 0.65;
    astroOuter.rotation.x = Math.sin(t * 0.7) * 0.35;
    astroInner.rotation.z -= dt * 1.1;

    totemGlowLight.position.set(totemGroup.position.x, 1.45, totemGroup.position.z);

    _camTarget.set(totemGroup.position.x * 0.28, 0.9, totemGroup.position.z * 0.25);
    _camDesired.set(totemGroup.position.x * 0.22, 6.8, 10.6 + totemGroup.position.z * 0.18);
    camera.position.lerp(_camDesired, 1 - Math.exp(-5 * dt));
    camera.lookAt(_camTarget);
    pipeline.setFocusTarget(_camTarget.x, _camTarget.y, _camTarget.z);
    pipeline.render();
  };

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
    const frameDt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += frameDt;
    while (acc >= STEP) {
      updateFixed(STEP);
      acc -= STEP;
    }
    renderFrame(frameDt);
    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  };

  tick();

  return {
    toggleOverload: triggerOverload,
    reset: resetArena,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);

      [
        arenaSlabGeo,
        outerRingGeo,
        runeRingGeo,
        voidFloorGeo,
        pillarGeo,
        pillarCapGeo,
        pillarSlitGeo,
        daisGeo,
        shadowDiscGeo,
        plinthGeo,
        collarGeo,
        coreGeo,
        fresnelShellGeo,
        shardGeo,
        astroOuterGeo,
        astroInnerGeo,
      ].forEach((g) => g.dispose());

      [
        wetBasaltMat,
        slateTrimMat,
        bronzeMat,
        goldMat,
        fluoriteMat,
        runeRingMat,
        coreCrystalMat,
        fresnelRimMat,
        voidFloorMat,
        shadowDiscMat,
      ].forEach((m) => m.dispose());

      basaltTex.map.dispose();
      basaltTex.roughnessMap.dispose();
      basaltTex.normalMap.dispose();
      surfacePair.normalMap.dispose();
      surfacePair.roughnessMap.dispose();
      contactShadowTex.dispose();
      cathedralEnvTex.dispose();
      pipeline.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
