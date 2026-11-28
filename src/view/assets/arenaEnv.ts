import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type TarotMaterialLibrary } from '../materials/tarotMaterials';
import { createFoliageAlphaTextures, createPerlinNormalRoughnessPair } from '../materials/proceduralNoise';
import { createRng } from '../../core/rng';
import { getGraphicsLevel, GRAPHICS_LEVEL } from '../../core/graphicsSettings';

export interface StageAtmosphere {
  horizonHex: number;
  midHex: number;
  vaultHex: number;
  fogHex: number;
  fogDensity: number;
  rayHex: number;
  rimHex: number;
  roseInnerHex: number;
  roseOuterHex: number;
  moatHex: number;
}

export const STAGE_ATMOSPHERES: StageAtmosphere[] = [
  // Stage 1: Initiate Lyra — Dawn Teal & Amber Gold
  {
    horizonHex: 0x4b333d,
    midHex: 0x2b2947,
    vaultHex: 0x1a182d,
    fogHex: 0x1f1d33,
    fogDensity: 0.0105,
    rayHex: 0xf3cf82,
    rimHex: 0x5cc4b8,
    roseInnerHex: 0x357c7e,
    roseOuterHex: 0xa16632,
    moatHex: 0x488c85,
  },
  // Stage 2: Warden Torin — Forged Brass & Steel Twilight
  {
    horizonHex: 0x50382a,
    midHex: 0x2c324a,
    vaultHex: 0x181c2e,
    fogHex: 0x1f2336,
    fogDensity: 0.0108,
    rayHex: 0xf6c46e,
    rimHex: 0x8db4d6,
    roseInnerHex: 0x45698c,
    roseOuterHex: 0xb57c3a,
    moatHex: 0x5f84a1,
  },
  // Stage 3: Vespera of Thorns — Moss Emerald Sanctuary
  {
    horizonHex: 0x38452e,
    midHex: 0x213834,
    vaultHex: 0x132024,
    fogHex: 0x182628,
    fogDensity: 0.011,
    rayHex: 0xd9d884,
    rimHex: 0x5fcf8e,
    roseInnerHex: 0x347c57,
    roseOuterHex: 0x998634,
    moatHex: 0x4c996b,
  },
  // Stage 4: Ignis-Chancellor — Smoldering Ash & Cinder Boss
  {
    horizonHex: 0x612625,
    midHex: 0x3b1f2b,
    vaultHex: 0x1e111c,
    fogHex: 0x28141d,
    fogDensity: 0.0118,
    rayHex: 0xf69a5e,
    rimHex: 0xf0654a,
    roseInnerHex: 0x873026,
    roseOuterHex: 0xc45a2e,
    moatHex: 0xa33f30,
  },
  // Stage 5: Magister Vael — Astral Rift Violet
  {
    horizonHex: 0x432b59,
    midHex: 0x2b2147,
    vaultHex: 0x16122c,
    fogHex: 0x1f1938,
    fogDensity: 0.0112,
    rayHex: 0xb7d4ff,
    rimHex: 0x9e80f5,
    roseInnerHex: 0x4b4494,
    roseOuterHex: 0x8c55ad,
    moatHex: 0x6b5cb5,
  },
  // Stage 6: Chronos-Forged Prime — High Astrolabe Gilded Ivory
  {
    horizonHex: 0x54402c,
    midHex: 0x2f2940,
    vaultHex: 0x1a1728,
    fogHex: 0x231e2e,
    fogDensity: 0.0108,
    rayHex: 0xffe29c,
    rimHex: 0xd4c285,
    roseInnerHex: 0x5f758c,
    roseOuterHex: 0xc29240,
    moatHex: 0x967e47,
  },
  // Stage 7: Archdemiurge Corvin — Obsidian Crimson Eclipse
  {
    horizonHex: 0x692228,
    midHex: 0x361a30,
    vaultHex: 0x180b19,
    fogHex: 0x24101c,
    fogDensity: 0.012,
    rayHex: 0xf49862,
    rimHex: 0xf25846,
    roseInnerHex: 0x942930,
    roseOuterHex: 0xd16830,
    moatHex: 0xb33834,
  },
];

import type { MagicSchool } from './creatureTotems';

export type ArenaLaneRune = 'aegis' | 'surge' | 'fury';

export interface ArenaEnvironmentHandle {
  group: THREE.Group;
  setOverload: (active: boolean) => void;
  setGraphicsLevel: (level: number) => void;
  setPerfScale: (scale: number) => void;
  setStageAtmosphere: (stageIndex: number) => StageAtmosphere;
  setEnchantments: (playerSchool: MagicSchool | null, enemySchool: MagicSchool | null) => void;
  setTraps: (playerSchool: MagicSchool | null, enemySchool: MagicSchool | null) => void;
  setLaneRunes: (runes?: {
    player: Array<ArenaLaneRune | null>;
    enemy: Array<ArenaLaneRune | null>;
  }) => void;
  triggerRoseFlare: (school: MagicSchool, intense?: boolean) => void;
  setSlotAftermath: (aftermath?: {
    player: Array<'chaos' | 'poison' | null>;
    enemy: Array<'chaos' | 'poison' | null>;
  }) => void;
  update: (time: number, parallaxX: number, parallaxY: number) => void;
  dispose: () => void;
}

const _flameDummy = new THREE.Object3D();

/**
 * Ensures every geometry in a batch is non-indexed and shares the same attributes
 * (position, normal, uv) so BufferGeometryUtils.mergeGeometries never fails
 * when mixing ExtrudeGeometry (non-indexed) with Cylinder/Box/Torus (indexed).
 */
function safeMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const normalized = parts.map((raw) => {
    const g = raw.index ? raw.toNonIndexed() : raw;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        g.deleteAttribute(key);
      }
    }
    return g;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  parts.forEach((g) => g.dispose());
  return merged;
}

/**
 * Procedural Gothic Stained-Glass Rose Mandala texture (radial leadwork + faceted glass panes)
 * aligned to CircleGeometry / RingGeometry planar UVs centered at (0.5, 0.5).
 */
function createRoseMandalaTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;
  const rMax = size * 0.495;

  ctx.fillStyle = '#0c0b12';
  ctx.fillRect(0, 0, size, size);

  const sectorCount = 12;
  const sectorAngle = (Math.PI * 2) / sectorCount;

  // Concentric stained-glass facet rings (inner core, middle lancets, outer crown petals)
  const rings: Array<{ r0: number; r1: number; palette: string[] }> = [
    {
      r0: rMax * 0.68,
      r1: rMax * 0.99,
      palette: ['#d9a24c', '#b4622a', '#4f8da8', '#d4863b'],
    },
    {
      r0: rMax * 0.36,
      r1: rMax * 0.68,
      palette: ['#3d9699', '#d29a48', '#336c8c', '#459e83'],
    },
    {
      r0: 0,
      r1: rMax * 0.36,
      palette: ['#f0c975', '#52b8b5', '#d98f46', '#67c2a8'],
    },
  ];

  rings.forEach((ring, ringIdx) => {
    for (let i = 0; i < sectorCount; i++) {
      const a0 = i * sectorAngle;
      const a1 = (i + 1) * sectorAngle;
      const midR = (ring.r0 + ring.r1) * 0.5;
      const grad = ctx.createRadialGradient(
        cx + Math.cos(a0 + sectorAngle * 0.5) * midR * 0.35,
        cy + Math.sin(a0 + sectorAngle * 0.5) * midR * 0.35,
        Math.max(2, ring.r0 * 0.3),
        cx,
        cy,
        ring.r1
      );
      const baseHex = ring.palette[(i + ringIdx) % ring.palette.length];
      grad.addColorStop(0, baseHex);
      grad.addColorStop(0.72, baseHex);
      grad.addColorStop(1, '#1a1a26');

      ctx.beginPath();
      ctx.arc(cx, cy, ring.r1, a0, a1);
      if (ring.r0 > 0) {
        ctx.arc(cx, cy, ring.r0, a1, a0, true);
      } else {
        ctx.lineTo(cx, cy);
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
  });

  // Subtle internal facet highlight diamonds in outer petal crown
  for (let i = 0; i < sectorCount; i++) {
    const aMid = (i + 0.5) * sectorAngle;
    const pr = rMax * 0.83;
    const px = cx + Math.cos(aMid) * pr;
    const py = cy + Math.sin(aMid) * pr;
    ctx.beginPath();
    ctx.arc(px, py, rMax * 0.085, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 228, 165, 0.55)' : 'rgba(130, 224, 218, 0.45)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#09090f';
    ctx.stroke();
  }

  // Dark Gothic leadwork cames (radial spokes & concentric mullions)
  ctx.strokeStyle = '#09090f';
  ctx.lineWidth = 5;
  [0.36, 0.68, 0.985].forEach((frac) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rMax * frac, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.lineWidth = 4;
  for (let i = 0; i < sectorCount; i++) {
    const a = i * sectorAngle;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rMax * 0.14, cy + Math.sin(a) * rMax * 0.14);
    ctx.lineTo(cx + Math.cos(a) * rMax, cy + Math.sin(a) * rMax);
    ctx.stroke();
  }

  // Sub-spokes in outer ring for authentic tracery density
  ctx.lineWidth = 2.5;
  for (let i = 0; i < sectorCount; i++) {
    const a = (i + 0.5) * sectorAngle;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rMax * 0.68, cy + Math.sin(a) * rMax * 0.68);
    ctx.lineTo(cx + Math.cos(a) * rMax, cy + Math.sin(a) * rMax);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildArenaEnvironment(mats: TarotMaterialLibrary): ArenaEnvironmentHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  // 0. Cathedral Twilight Atmosphere Dome (stage-reactive horizon, sanctum mid & vault colors)
  const skyGeo = new THREE.SphereGeometry(46, 24, 16);
  geometries.push(skyGeo);
  const skyUniforms = {
    uHorizon: { value: new THREE.Color(STAGE_ATMOSPHERES[0].horizonHex) },
    uMid: { value: new THREE.Color(STAGE_ATMOSPHERES[0].midHex) },
    uVault: { value: new THREE.Color(STAGE_ATMOSPHERES[0].vaultHex) },
  };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizon;
      uniform vec3 uMid;
      uniform vec3 uVault;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp((vWorldPos.y + 4.0) / 28.0, 0.0, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.34, h));
        col = mix(col, uVault, smoothstep(0.34, 1.0, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  customMats.push(skyMat);
  group.add(new THREE.Mesh(skyGeo, skyMat));

  // 1. Central Wet-Basalt Duel Platform (Aligned flush beneath the Bronze Octagonal Bezel)
  const slabGeo = new THREE.CylinderGeometry(6.42, 6.92, 0.56, 8);
  geometries.push(slabGeo);
  const slab = new THREE.Mesh(slabGeo, mats.wetBasaltMat);
  slab.position.y = -0.28;
  slab.rotation.y = Math.PI / 8;
  slab.receiveShadow = true;
  group.add(slab);

  // Bronze Octagonal Rim + Glowing Tarot Inlay Rings
  const bezelGeo = new THREE.TorusGeometry(6.3, 0.15, 8, 8);
  geometries.push(bezelGeo);
  const bezel = new THREE.Mesh(bezelGeo, mats.bronzeMat);
  bezel.rotation.x = Math.PI / 2;
  bezel.rotation.z = Math.PI / 8;
  bezel.position.y = 0.02;
  group.add(bezel);

  const outerRuneGeo = new THREE.RingGeometry(4.35, 4.46, 64);
  outerRuneGeo.rotateX(-Math.PI / 2);
  const innerRuneGeo = new THREE.RingGeometry(1.18, 1.24, 48);
  innerRuneGeo.rotateX(-Math.PI / 2);
  const centerDivideGeo = new THREE.PlaneGeometry(8.6, 0.055);
  centerDivideGeo.rotateX(-Math.PI / 2);
  const mergedRunes = safeMerge([outerRuneGeo, innerRuneGeo, centerDivideGeo]);
  if (mergedRunes) {
    geometries.push(mergedRunes);
    const runeMesh = new THREE.Mesh(mergedRunes, mats.runeEmissiveMat);
    runeMesh.position.y = 0.015;
    group.add(runeMesh);
  }

  // 1a. Slowly rotating inner astrolabe clockwork ring + bronze corner bezel studs
  const floorClockGeo = new THREE.RingGeometry(2.82, 2.9, 36);
  floorClockGeo.rotateX(-Math.PI / 2);
  geometries.push(floorClockGeo);
  const floorClockRing = new THREE.Mesh(floorClockGeo, mats.goldMat);
  floorClockRing.position.y = 0.017;
  group.add(floorClockRing);

  const rimFinialParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const fg = new THREE.OctahedronGeometry(0.16, 0);
    fg.scale(0.75, 1.45, 0.75);
    fg.translate(Math.cos(a) * 6.32, 0.22, Math.sin(a) * 6.32);
    rimFinialParts.push(fg);
  }
  const mergedRimFinials = safeMerge(rimFinialParts);
  let rimFinialsMesh: THREE.Mesh | null = null;
  if (mergedRimFinials) {
    geometries.push(mergedRimFinials);
    rimFinialsMesh = new THREE.Mesh(mergedRimFinials, mats.goldMat);
    group.add(rimFinialsMesh);
  }

  // 1b. Glowing Obsidian Floor Fracture Veins (subtle gold/ether normally, burning crimson on Overload)
  const fissureGeo = new THREE.CircleGeometry(5.88, 8);
  fissureGeo.rotateX(-Math.PI / 2);
  fissureGeo.rotateY(Math.PI / 8);
  geometries.push(fissureGeo);
  const fissureUniforms = {
    uTime: { value: 0 },
    uOverload: { value: 0 },
    uBaseColor: { value: new THREE.Color(0xc49c48) },
    uOverloadColor: { value: new THREE.Color(0xe64830) },
  };
  const fissureMat = new THREE.ShaderMaterial({
    uniforms: fissureUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOverload;
      uniform vec3 uBaseColor;
      uniform vec3 uOverloadColor;
      varying vec2 vPos;

      float veinPattern(vec2 p) {
        vec2 q = vec2(p.x * 0.85 + sin(p.y * 1.15) * 0.42, p.y * 0.85 + cos(p.x * 1.25) * 0.42);
        float a = abs(sin(q.x * 2.2 + q.y * 1.4) + 0.45 * cos(q.y * 3.1 - q.x * 1.7));
        float b = abs(cos(q.x * 1.7 - q.y * 2.4) + 0.35 * sin(q.x * 2.9 + q.y * 2.1));
        float lineA = 1.0 - smoothstep(0.0, 0.075, a);
        float lineB = 1.0 - smoothstep(0.0, 0.068, b);
        return max(lineA, lineB);
      }

      void main() {
        float dist = length(vPos);
        float radialMask = smoothstep(5.85, 2.6, dist) * smoothstep(0.85, 1.65, dist);
        float veins = veinPattern(vPos);
        float pulse = 0.62 + 0.38 * sin(uTime * (1.8 + uOverload * 2.8) - dist * 1.1);
        float intensity = mix(0.16, 0.64, uOverload);
        vec3 col = mix(uBaseColor, uOverloadColor, uOverload);
        float alpha = veins * radialMask * pulse * intensity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
      }
    `,
  });
  customMats.push(fissureMat);
  const fissureMesh = new THREE.Mesh(fissureGeo, fissureMat);
  fissureMesh.position.y = 0.008;
  fissureMesh.renderOrder = 1;
  group.add(fissureMesh);

  // 2. Grounded Stepped Obsidian Amphitheater & Sunken Leyline Moat
  const courtyardParts: THREE.BufferGeometry[] = [];

  const groundRing = new THREE.RingGeometry(6.3, 44, 48);
  groundRing.rotateX(-Math.PI / 2);
  groundRing.translate(0, -0.45, 0);
  courtyardParts.push(groundRing);

  const tierSpecs: Array<[number, number, number, number]> = [
    [7.4, 8.8, 0.45, -0.22],
    [8.8, 10.6, 0.9, 0.0],
    [10.6, 13.0, 1.35, 0.22],
    [13.0, 18.0, 1.65, 0.35],
  ];
  tierSpecs.forEach(([rIn, rOut, h, yPos]) => {
    const wall = new THREE.CylinderGeometry(rOut, rOut, h, 16, 1, true);
    wall.translate(0, yPos, 0);
    courtyardParts.push(wall);

    const stepCap = new THREE.RingGeometry(rIn, rOut, 16);
    stepCap.rotateX(-Math.PI / 2);
    stepCap.translate(0, yPos + h * 0.5, 0);
    courtyardParts.push(stepCap);
  });

  // North & South Carved Causeway Bridges connecting Duel Platform to Sanctuary Hall
  [-1, 1].forEach((dir) => {
    const bridgeDeck = new THREE.BoxGeometry(3.4, 0.45, 7.0);
    bridgeDeck.translate(0, -0.2, dir * 9.2);
    courtyardParts.push(bridgeDeck);

    [-1.65, 1.65].forEach((bx) => {
      const parapet = new THREE.BoxGeometry(0.32, 0.65, 7.0);
      parapet.translate(bx, 0.25, dir * 9.2);
      courtyardParts.push(parapet);
    });
  });

  const shadowCasters: THREE.Mesh[] = [];
  const shadowReceivers: THREE.Mesh[] = [slab];

  const mergedCourtyard = safeMerge(courtyardParts);
  if (mergedCourtyard) {
    geometries.push(mergedCourtyard);
    const courtyardMesh = new THREE.Mesh(mergedCourtyard, mats.sanctumWallMat);
    courtyardMesh.receiveShadow = true;
    shadowReceivers.push(courtyardMesh);
    group.add(courtyardMesh);
  }

  // Subtle ether leyline channel around the sunken moat ring (PBR emissive)
  const moatPair = createPerlinNormalRoughnessPair(181, {
    size: 128,
    baseFreq: 6,
    octaves: 3,
    normalStrength: 1.8,
    roughMin: 0.14,
    roughMax: 0.42,
    repeat: 4,
    maxAnisotropy: 4,
  });
  const moatLeyGeo = new THREE.RingGeometry(6.74, 6.9, 48);
  moatLeyGeo.rotateX(-Math.PI / 2);
  geometries.push(moatLeyGeo);
  const moatLeyMat = new THREE.MeshStandardMaterial({
    color: 0x162d2b,
    emissive: 0x3b726d,
    emissiveIntensity: 0.95,
    normalMap: moatPair.normalMap,
    roughnessMap: moatPair.roughnessMap,
    roughness: 0.25,
    metalness: 0.12,
    transparent: true,
    opacity: 0.48,
  });
  customMats.push(moatLeyMat);
  const moatLey = new THREE.Mesh(moatLeyGeo, moatLeyMat);
  moatLey.position.y = -0.42;
  group.add(moatLey);

  // 3. Sculpted Gothic Cathedral Buttress Columns + Pointed Arches + Stained-Glass Niches
  const stoneParts: THREE.BufferGeometry[] = [];
  const bronzeTrimParts: THREE.BufferGeometry[] = [];
  const stainedGlassParts: THREE.BufferGeometry[] = [];

  const archShape = new THREE.Shape();
  archShape.moveTo(-2.1, 0);
  archShape.lineTo(-2.1, 3.8);
  archShape.quadraticCurveTo(-1.8, 5.6, 0, 6.4);
  archShape.quadraticCurveTo(1.8, 5.6, 2.1, 3.8);
  archShape.lineTo(2.1, 0);
  archShape.lineTo(1.55, 0);
  archShape.lineTo(1.55, 3.6);
  archShape.quadraticCurveTo(1.3, 5.05, 0, 5.7);
  archShape.quadraticCurveTo(-1.3, 5.05, -1.55, 3.6);
  archShape.lineTo(-1.55, 0);
  archShape.closePath();

  const archBaseGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.52,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  archBaseGeo.translate(0, 0, -0.26);

  const colAngles = [
    Math.PI * 0.86,
    Math.PI * 1.04,
    Math.PI * 1.22,
    Math.PI * 1.38,
    Math.PI * 1.62,
    Math.PI * 1.80,
    Math.PI * 1.98,
    Math.PI * 2.14,
  ];
  const radiusCol = 9.6;

  colAngles.forEach((ang, idx) => {
    const px = Math.cos(ang) * radiusCol;
    const pz = Math.sin(ang) * radiusCol;

    const plinth = new THREE.CylinderGeometry(0.76, 0.94, 0.95, 8);
    plinth.translate(px, 0.48, pz);
    stoneParts.push(plinth);

    const shaft = new THREE.CylinderGeometry(0.46, 0.56, 5.4, 8);
    shaft.translate(px, 3.6, pz);
    stoneParts.push(shaft);

    const capital = new THREE.CylinderGeometry(0.84, 0.48, 0.55, 8);
    capital.translate(px, 6.45, pz);
    stoneParts.push(capital);

    const spire = new THREE.ConeGeometry(0.46, 1.6, 6);
    spire.translate(px, 7.5, pz);
    stoneParts.push(spire);

    const collar = new THREE.TorusGeometry(0.56, 0.055, 6, 12);
    collar.rotateX(Math.PI / 2);
    collar.translate(px, 5.85, pz);
    bronzeTrimParts.push(collar);

    const lancet = new THREE.BoxGeometry(0.22, 3.4, 0.24);
    lancet.rotateY(-ang);
    lancet.translate(Math.cos(ang) * (radiusCol - 0.44), 3.4, Math.sin(ang) * (radiusCol - 0.44));
    stainedGlassParts.push(lancet);

    if (idx < colAngles.length - 1 && idx !== 3) {
      const nextAng = colAngles[idx + 1];
      const midAng = (ang + nextAng) * 0.5;
      const mx = Math.cos(midAng) * radiusCol;
      const mz = Math.sin(midAng) * radiusCol;
      const span = archBaseGeo.clone();
      span.scale(1.14, 1.0, 1);
      span.rotateY(-midAng + Math.PI / 2);
      span.translate(mx, 0.65, mz);
      stoneParts.push(span);
    }
  });
  archBaseGeo.dispose();

  // 4. Monumental Rose-Astrolabe Cathedral Sanctuary Arch (Unobstructed North Focal Backdrop)
  const roseZ = -11.0;
  const roseY = 4.95;

  [-3.25, 3.25].forEach((bx) => {
    const pier = new THREE.BoxGeometry(1.5, 9.2, 1.5);
    pier.translate(bx, 4.3, roseZ);
    stoneParts.push(pier);

    const pierBase = new THREE.BoxGeometry(1.85, 1.1, 1.85);
    pierBase.translate(bx, 0.55, roseZ);
    stoneParts.push(pierBase);

    const pinnacle = new THREE.ConeGeometry(0.82, 2.5, 4);
    pinnacle.rotateY(Math.PI / 4);
    pinnacle.translate(bx, 10.1, roseZ);
    stoneParts.push(pinnacle);

    const sconceArm = new THREE.BoxGeometry(0.24, 0.24, 0.72);
    sconceArm.translate(bx * 0.88, 3.2, roseZ + 0.9);
    bronzeTrimParts.push(sconceArm);
  });

  // Back sanctuary masonry wall framing the Rose window
  const altarWall = new THREE.BoxGeometry(7.2, 6.2, 0.7);
  altarWall.translate(0, 1.1, roseZ - 0.45);
  stoneParts.push(altarWall);

  const gableArch = new THREE.TorusGeometry(3.45, 0.5, 8, 28, Math.PI);
  gableArch.translate(0, 6.55, roseZ);
  stoneParts.push(gableArch);

  const roseFrameOuter = new THREE.TorusGeometry(2.55, 0.17, 8, 36);
  roseFrameOuter.translate(0, roseY, roseZ + 0.14);
  bronzeTrimParts.push(roseFrameOuter);

  const roseFrameMid = new THREE.TorusGeometry(1.75, 0.11, 8, 28);
  roseFrameMid.translate(0, roseY, roseZ + 0.16);
  bronzeTrimParts.push(roseFrameMid);

  const roseFrameInner = new THREE.TorusGeometry(0.92, 0.08, 8, 24);
  roseFrameInner.translate(0, roseY, roseZ + 0.18);
  bronzeTrimParts.push(roseFrameInner);

  for (let s = 0; s < 6; s++) {
    const spoke = new THREE.BoxGeometry(0.085, 5.0, 0.12);
    spoke.rotateZ((s * Math.PI) / 6);
    spoke.translate(0, roseY, roseZ + 0.15);
    bronzeTrimParts.push(spoke);
  }

  const glassPair = createPerlinNormalRoughnessPair(283, {
    size: 128,
    baseFreq: 7,
    octaves: 3,
    normalStrength: 2.0,
    roughMin: 0.08,
    roughMax: 0.28,
    repeat: 2,
    maxAnisotropy: 4,
  });
  const roseMandalaTex = createRoseMandalaTexture(512);
  const roseOuterGlassGeo = new THREE.RingGeometry(1.72, 2.52, 32);
  geometries.push(roseOuterGlassGeo);
  const roseOuterGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x8c5c2b,
    map: roseMandalaTex,
    emissive: 0xa86c32,
    emissiveMap: roseMandalaTex,
    emissiveIntensity: 0.72,
    normalMap: glassPair.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughnessMap: glassPair.roughnessMap,
    roughness: 0.24,
    metalness: 0.05,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  customMats.push(roseOuterGlassMat);
  const roseOuterGlass = new THREE.Mesh(roseOuterGlassGeo, roseOuterGlassMat);
  roseOuterGlass.position.set(0, roseY, roseZ + 0.06);
  group.add(roseOuterGlass);

  const roseGlassGeo = new THREE.CircleGeometry(1.74, 28);
  geometries.push(roseGlassGeo);
  const roseGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b7a7c,
    map: roseMandalaTex,
    emissive: 0x458e91,
    emissiveMap: roseMandalaTex,
    emissiveIntensity: 0.78,
    normalMap: glassPair.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughnessMap: glassPair.roughnessMap,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  customMats.push(roseGlassMat);
  const roseGlass = new THREE.Mesh(roseGlassGeo, roseGlassMat);
  roseGlass.position.set(0, roseY, roseZ + 0.08);
  group.add(roseGlass);

  const roseCoreGeo = new THREE.OctahedronGeometry(0.54, 0);
  const roseFiligreeGeo = new THREE.TorusGeometry(2.14, 0.045, 6, 12);
  geometries.push(roseCoreGeo, roseFiligreeGeo);
  const roseCore = new THREE.Mesh(roseCoreGeo, mats.goldMat);
  roseCore.position.set(0, roseY, roseZ + 0.22);
  group.add(roseCore);

  const roseFiligree = new THREE.Mesh(roseFiligreeGeo, mats.goldMat);
  roseFiligree.position.set(0, roseY, roseZ + 0.19);
  group.add(roseFiligree);

  const mergedStone = safeMerge(stoneParts);
  if (mergedStone) {
    geometries.push(mergedStone);
    const stoneMesh = new THREE.Mesh(mergedStone, mats.pillarStoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    shadowCasters.push(stoneMesh);
    shadowReceivers.push(stoneMesh);
    group.add(stoneMesh);
  }

  const mergedBronze = safeMerge(bronzeTrimParts);
  if (mergedBronze) {
    geometries.push(mergedBronze);
    group.add(new THREE.Mesh(mergedBronze, mats.goldMat));
  }

  const mergedGlass = safeMerge(stainedGlassParts);
  if (mergedGlass) {
    geometries.push(mergedGlass);
    const lancetMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b4d58,
      emissive: 0x1e2c34,
      emissiveIntensity: 0.42,
      normalMap: glassPair.normalMap,
      roughnessMap: glassPair.roughnessMap,
      roughness: 0.3,
      metalness: 0.18,
      clearcoat: 0.7,
    });
    customMats.push(lancetMat);
    group.add(new THREE.Mesh(mergedGlass, lancetMat));
  }

  // 5. Living Alchemical Braziers (8 ring braziers + 2 sanctuary pier sconces — static pedestals/bowls merged)
  const flameOuterGeo = new THREE.ConeGeometry(0.2, 0.56, 6);
  const flameInnerGeo = new THREE.ConeGeometry(0.1, 0.36, 5);
  geometries.push(flameOuterGeo, flameInnerGeo);

  const flameOuterMat = new THREE.MeshStandardMaterial({
    color: 0x451205,
    emissive: 0xd94e1f,
    emissiveIntensity: 1.45,
    normalMap: glassPair.normalMap,
    roughnessMap: glassPair.roughnessMap,
    roughness: 0.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.62,
  });
  customMats.push(flameOuterMat);

  const pedestalParts: THREE.BufferGeometry[] = [];
  const bowlParts: THREE.BufferGeometry[] = [];
  const flameAnchors: Array<{ x: number; y: number; z: number; scale: number }> = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.cos(a) * 6.55;
    const bz = Math.sin(a) * 6.55;

    const standGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.78, 6);
    standGeo.translate(bx, 0.39, bz);
    pedestalParts.push(standGeo);

    const bowlGeo = new THREE.CylinderGeometry(0.42, 0.18, 0.28, 8);
    bowlGeo.translate(bx, 0.88, bz);
    bowlParts.push(bowlGeo);

    flameAnchors.push({ x: bx, y: 1.02, z: bz, scale: 1.0 });
  }

  [-3.25 * 0.88, 3.25 * 0.88].forEach((sx) => {
    const sconceBowlGeo = new THREE.CylinderGeometry(0.42, 0.18, 0.28, 8);
    sconceBowlGeo.translate(sx, 3.38, roseZ + 1.18);
    bowlParts.push(sconceBowlGeo);

    flameAnchors.push({ x: sx, y: 3.52, z: roseZ + 1.18, scale: 1.25 });
  });

  // Batched InstancedMesh flames: 2 draw calls total instead of 20 individual flame meshes
  const outerFlameInstanced = new THREE.InstancedMesh(flameOuterGeo, flameOuterMat, flameAnchors.length);
  outerFlameInstanced.frustumCulled = false;
  const innerFlameInstanced = new THREE.InstancedMesh(flameInnerGeo, mats.flameEmissiveMat, flameAnchors.length);
  innerFlameInstanced.frustumCulled = false;

  const updateInstancedFlames = (t: number) => {
    flameAnchors.forEach((anchor, idx) => {
      const flicker =
        t > 0
          ? 0.86 + Math.sin(t * 9.5 + idx * 1.7) * 0.2 + Math.cos(t * 15 + idx) * 0.08
          : 1.0;
      const sxz = anchor.scale * (0.92 + (flicker - 1) * 0.25);
      const sy = anchor.scale * flicker;
      const rotY = t * 1.8 + idx;

      _flameDummy.position.set(anchor.x, anchor.y + 0.26 * sy, anchor.z);
      _flameDummy.rotation.set(0, rotY, 0);
      _flameDummy.scale.set(sxz, sy, sxz);
      _flameDummy.updateMatrix();
      outerFlameInstanced.setMatrixAt(idx, _flameDummy.matrix);

      _flameDummy.position.set(anchor.x, anchor.y + 0.22 * sy, anchor.z);
      _flameDummy.rotation.set(0, -rotY * 0.85, 0);
      _flameDummy.scale.set(sxz, sy, sxz);
      _flameDummy.updateMatrix();
      innerFlameInstanced.setMatrixAt(idx, _flameDummy.matrix);
    });
    outerFlameInstanced.instanceMatrix.needsUpdate = true;
    innerFlameInstanced.instanceMatrix.needsUpdate = true;
  };
  updateInstancedFlames(0);
  group.add(outerFlameInstanced, innerFlameInstanced);

  const mergedPedestals = safeMerge(pedestalParts);
  if (mergedPedestals) {
    geometries.push(mergedPedestals);
    const pedestalsMesh = new THREE.Mesh(mergedPedestals, mats.darkBronzeMat);
    pedestalsMesh.castShadow = true;
    shadowCasters.push(pedestalsMesh);
    group.add(pedestalsMesh);
  }

  const mergedBowls = safeMerge(bowlParts);
  if (mergedBowls) {
    geometries.push(mergedBowls);
    group.add(new THREE.Mesh(mergedBowls, mats.bronzeMat));
  }

  // Warm torchlight pools illuminating flanking Gothic arches & outer grass tiers
  const torchLightL = new THREE.PointLight(0xff9b4d, 5.2, 28, 1.4);
  torchLightL.position.set(-7.6, 4.6, -4.0);
  group.add(torchLightL);

  const torchLightR = new THREE.PointLight(0xff9b4d, 5.2, 28, 1.4);
  torchLightR.position.set(7.6, 4.6, -4.0);
  group.add(torchLightR);

  // Opposing Demiurge Dais pedestals
  const daisParts: THREE.BufferGeometry[] = [];
  [-4.8, 4.8].forEach((dz) => {
    const base = new THREE.CylinderGeometry(1.18, 1.45, 0.34, 8);
    base.translate(0, 0.17, dz);
    daisParts.push(base);
  });
  const mergedDais = safeMerge(daisParts);
  if (mergedDais) {
    geometries.push(mergedDais);
    const daisMesh = new THREE.Mesh(mergedDais, mats.darkBronzeMat);
    daisMesh.receiveShadow = true;
    shadowReceivers.push(daisMesh);
    group.add(daisMesh);
  }

  // 6. Diablo 4 Style Overhead Cathedral God Rays (Volumetric Light Shafts + Overhead Sanctuary SpotLight)
  const godRayUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0xf3cf82) },
  };

  const godRayConeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: godRayUniforms.uTime,
      uColor: godRayUniforms.uColor,
      uOpacity: { value: 0.27 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mvPos.xyz;
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 vn = length(vViewNormal) > 0.0001 ? normalize(vViewNormal) : vec3(0.0, 0.0, 1.0);
        vec3 viewDir = length(vViewPos) > 0.0001 ? normalize(-vViewPos) : vec3(0.0, 0.0, 1.0);
        float edge = pow(max(0.0001, abs(dot(vn, viewDir))), 1.35);
        float vert = smoothstep(0.02, 0.22, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float streakA = 0.56 + 0.44 * sin(vUv.x * 18.8495 + uTime * 0.20);
        float streakB = 0.68 + 0.32 * sin(vUv.x * 37.6991 - uTime * 0.12);
        float alpha = clamp(edge * vert * streakA * streakB * uOpacity, 0.0, 1.0);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  customMats.push(godRayConeMat);

  const godRaySheetMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: godRayUniforms.uTime,
      uColor: godRayUniforms.uColor,
      uOpacity: { value: 0.21 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float s = max(0.0, sin(clamp(vUv.x, 0.0, 1.0) * 3.14159265));
        float horiz = pow(max(0.0001, s), 1.45) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float vert = smoothstep(0.06, 0.26, vUv.y) * smoothstep(1.0, 0.48, vUv.y);
        float beam = 0.52 + 0.48 * sin(vUv.x * 21.99 + uTime * 0.16) * cos(vUv.x * 9.42 - uTime * 0.1);
        float alpha = clamp(horiz * vert * beam * uOpacity, 0.0, 1.0);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  customMats.push(godRaySheetMat);

  const rayShaftSpecs: Array<{
    topR: number;
    botR: number;
    len: number;
    pos: [number, number, number];
    rotX: number;
    rotZ: number;
  }> = [
    { topR: 0.52, botR: 2.85, len: 14.5, pos: [-0.4, 5.8, -1.2], rotX: 0.34, rotZ: -0.22 },
    { topR: 0.38, botR: 2.05, len: 14.0, pos: [-2.7, 5.6, -1.8], rotX: 0.30, rotZ: -0.25 },
    { topR: 0.40, botR: 2.25, len: 14.0, pos: [2.3, 5.7, -1.4], rotX: 0.32, rotZ: -0.18 },
    { topR: 0.34, botR: 1.85, len: 13.0, pos: [0.3, 5.2, 1.5], rotX: 0.28, rotZ: -0.20 },
    { topR: 0.60, botR: 2.75, len: 13.5, pos: [0.0, 4.4, -5.6], rotX: 0.58, rotZ: -0.08 },
  ];

  const godRayCones: THREE.Mesh[] = [];
  rayShaftSpecs.forEach((spec, idx) => {
    const shaftGeo = new THREE.CylinderGeometry(spec.topR, spec.botR, spec.len, 24, 1, true);
    geometries.push(shaftGeo);
    const shaft = new THREE.Mesh(shaftGeo, godRayConeMat);
    shaft.position.set(...spec.pos);
    shaft.rotation.set(spec.rotX, idx * 0.7, spec.rotZ);
    shaft.renderOrder = 2;
    godRayCones.push(shaft);
    group.add(shaft);
  });

  // Rose-window diagonal sanctuary light ribbons (kept above floor level & NaN-safe)
  const godRaySheets: THREE.Mesh[] = [];
  [-0.24, 0.24].forEach((rotY) => {
    const sheetGeo = new THREE.PlaneGeometry(5.2, 9.6, 1, 1);
    geometries.push(sheetGeo);
    const sheet = new THREE.Mesh(sheetGeo, godRaySheetMat);
    sheet.position.set(0, 4.9, -5.8);
    sheet.rotation.set(0.56, rotY, -0.1);
    sheet.renderOrder = 2;
    godRaySheets.push(sheet);
    group.add(sheet);
  });

  // Overhead Sanctuary SpotLight aligned with the Diablo 4 God Ray shafts (wide soft cone to avoid floor hotspot)
  const godRaySpot = new THREE.SpotLight(0xffe0a6, 1.32, 30, 0.58, 0.96, 1.2);
  godRaySpot.position.set(-1.6, 15.0, -3.2);
  godRaySpot.target.position.set(0.2, 0.0, 0.4);
  group.add(godRaySpot);
  group.add(godRaySpot.target);

  // Far parallax cathedral outer buttress ring (THREE.LOD: high-detail 10 buttresses vs distant 5-pillar silhouette)
  const farSanctumGroup = new THREE.Group();
  const farSanctumLod = new THREE.LOD();
  const outerButtressParts: THREE.BufferGeometry[] = [];
  const outerButtressLowParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * 0.78 + (i / 9) * Math.PI * 1.44;
    const rad = 18.5 + (i % 2) * 2.5;
    const buttressGeo = new THREE.BoxGeometry(1.8, 15, 1.8);
    buttressGeo.rotateY(-a);
    buttressGeo.translate(Math.cos(a) * rad, 5.5, Math.sin(a) * rad);
    outerButtressParts.push(buttressGeo);

    if (i % 2 === 0) {
      const lowGeo = new THREE.BoxGeometry(2.2, 14.2, 2.0);
      lowGeo.rotateY(-a);
      lowGeo.translate(Math.cos(a) * rad, 5.2, Math.sin(a) * rad);
      outerButtressLowParts.push(lowGeo);
    }
  }
  const mergedButtresses = safeMerge(outerButtressParts);
  if (mergedButtresses) {
    geometries.push(mergedButtresses);
    farSanctumLod.addLevel(new THREE.Mesh(mergedButtresses, mats.sanctumWallMat), 0);
  }
  const mergedButtressesLow = safeMerge(outerButtressLowParts);
  if (mergedButtressesLow) {
    geometries.push(mergedButtressesLow);
    farSanctumLod.addLevel(new THREE.Mesh(mergedButtressesLow, mats.sanctumWallMat), 24);
  }
  farSanctumGroup.add(farSanctumLod);
  group.add(farSanctumGroup);

  // Overhead Gothic Vault Ribs (High+, merged into single draw call)
  const vaultRibParts: THREE.BufferGeometry[] = [];
  [-0.28, 0.0, 0.28].forEach((rotY) => {
    const ribGeo = new THREE.TorusGeometry(9.6, 0.24, 6, 26, Math.PI);
    ribGeo.rotateY(rotY);
    ribGeo.translate(0, 6.2, -1.6);
    vaultRibParts.push(ribGeo);
  });
  const mergedVaultRibs = safeMerge(vaultRibParts);
  let vaultRibsMesh: THREE.Mesh | null = null;
  if (mergedVaultRibs) {
    geometries.push(mergedVaultRibs);
    vaultRibsMesh = new THREE.Mesh(mergedVaultRibs, mats.pillarStoneMat);
    group.add(vaultRibsMesh);
  }

  // Flanking Carved Reliquary Monoliths (THREE.LOD detail/silhouette + floating crystals)
  const monolithRuneGeo = new THREE.OctahedronGeometry(0.24, 0);
  geometries.push(monolithRuneGeo);
  const monolithGroup = new THREE.Group();
  const monolithLod = new THREE.LOD();
  const monolithDetailGroup = new THREE.Group();
  const monolithLowGroup = new THREE.Group();

  const monolithBodyParts: THREE.BufferGeometry[] = [];
  const monolithCapParts: THREE.BufferGeometry[] = [];
  const monolithLowParts: THREE.BufferGeometry[] = [];
  const monolithCrystalCoords: Array<[number, number]> = [
    [-5.4, -8.2],
    [5.4, -8.2],
    [-7.8, -1.6],
    [7.8, -1.6],
  ];
  const monolithCrystalInstanced = new THREE.InstancedMesh(
    monolithRuneGeo,
    mats.etherCoreMat,
    monolithCrystalCoords.length
  );
  monolithCrystalInstanced.frustumCulled = false;

  monolithCrystalCoords.forEach(([mx, mz], idx) => {
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.68, 3.8, 6);
    bodyGeo.translate(mx, 1.6, mz);
    monolithBodyParts.push(bodyGeo);

    const capGeo = new THREE.ConeGeometry(0.48, 1.05, 6);
    capGeo.translate(mx, 4.02, mz);
    monolithCapParts.push(capGeo);

    const lowGeo = new THREE.BoxGeometry(0.96, 4.1, 0.96);
    lowGeo.translate(mx, 1.85, mz);
    monolithLowParts.push(lowGeo);

    _flameDummy.position.set(mx, 4.85, mz);
    _flameDummy.rotation.set(0, idx, 0);
    _flameDummy.scale.set(0.75, 1.45, 0.75);
    _flameDummy.updateMatrix();
    monolithCrystalInstanced.setMatrixAt(idx, _flameDummy.matrix);
  });
  monolithCrystalInstanced.instanceMatrix.needsUpdate = true;
  monolithCrystalInstanced.computeBoundingSphere();
  monolithGroup.add(monolithCrystalInstanced);
  const mergedMonolithBodies = safeMerge(monolithBodyParts);
  if (mergedMonolithBodies) {
    geometries.push(mergedMonolithBodies);
    const monolithBodiesMesh = new THREE.Mesh(mergedMonolithBodies, mats.pillarStoneMat);
    monolithBodiesMesh.castShadow = true;
    shadowCasters.push(monolithBodiesMesh);
    monolithDetailGroup.add(monolithBodiesMesh);
  }
  const mergedMonolithCaps = safeMerge(monolithCapParts);
  if (mergedMonolithCaps) {
    geometries.push(mergedMonolithCaps);
    monolithDetailGroup.add(new THREE.Mesh(mergedMonolithCaps, mats.darkBronzeMat));
  }
  const mergedMonolithLow = safeMerge(monolithLowParts);
  if (mergedMonolithLow) {
    geometries.push(mergedMonolithLow);
    monolithLowGroup.add(new THREE.Mesh(mergedMonolithLow, mats.pillarStoneMat));
  }
  monolithLod.addLevel(monolithDetailGroup, 0);
  monolithLod.addLevel(monolithLowGroup, 21);
  monolithGroup.add(monolithLod);
  group.add(monolithGroup);

  // Suspended Sanctuary Brass Censers / Chandeliers (High+)
  const censerChainGeo = new THREE.CylinderGeometry(0.025, 0.025, 3.6, 6);
  const censerRingGeo = new THREE.TorusGeometry(0.55, 0.045, 6, 16);
  censerRingGeo.rotateX(Math.PI / 2);
  const censerCoreGeo = new THREE.OctahedronGeometry(0.2, 0);
  geometries.push(censerChainGeo, censerRingGeo, censerCoreGeo);
  const censers: THREE.Group[] = [];
  [-6.2, 6.2].forEach((cx) => {
    const pivot = new THREE.Group();
    pivot.position.set(cx, 8.6, -3.6);
    const chain = new THREE.Mesh(censerChainGeo, mats.darkBronzeMat);
    chain.position.y = -1.8;
    const ring = new THREE.Mesh(censerRingGeo, mats.goldMat);
    ring.position.y = -3.6;
    const ember = new THREE.Mesh(censerCoreGeo, mats.flameEmissiveMat);
    ember.position.y = -3.6;
    pivot.add(chain, ring, ember);
    group.add(pivot);
    censers.push(pivot);
  });

  // 7. Sanctum Rose Orbiting Shards + Enchantment Obelisks + Trap Ward Seals
  const schoolColors: Record<MagicSchool, number> = {
    kinet: 0x66ddd2,
    vital: 0x6fd986,
    chaos: 0xec5b44,
    synth: 0x90bced,
  };

  const shardGeo = new THREE.OctahedronGeometry(0.32, 0);
  const shardMat = new THREE.MeshPhysicalMaterial({
    color: STAGE_ATMOSPHERES[0].rimHex,
    emissive: STAGE_ATMOSPHERES[0].rimHex,
    emissiveIntensity: 0.58,
    normalMap: glassPair.normalMap,
    roughnessMap: glassPair.roughnessMap,
    metalness: 0.52,
    roughness: 0.16,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    iridescence: 0.68,
    iridescenceIOR: 1.45,
  });
  geometries.push(shardGeo);
  customMats.push(shardMat);
  const roseShardCount = 4;
  const roseShardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, roseShardCount);
  roseShardInstanced.frustumCulled = false;
  for (let i = 0; i < roseShardCount; i++) {
    const a = (i * Math.PI) / 2;
    _flameDummy.position.set(Math.cos(a) * 3.35, roseY + Math.sin(a * 1.5) * 1.35, roseZ + 0.85 + Math.sin(a) * 0.45);
    _flameDummy.rotation.set(0, i, 0);
    _flameDummy.scale.set(0.75, 1.55, 0.75);
    _flameDummy.updateMatrix();
    roseShardInstanced.setMatrixAt(i, _flameDummy.matrix);
  }
  roseShardInstanced.instanceMatrix.needsUpdate = true;
  roseShardInstanced.computeBoundingSphere();
  group.add(roseShardInstanced);

  const obeliskCrystalGeo = new THREE.OctahedronGeometry(0.34, 0);
  obeliskCrystalGeo.scale(0.68, 2.1, 0.68);
  const obeliskRingGeo = new THREE.TorusGeometry(0.48, 0.045, 6, 18);
  obeliskRingGeo.rotateX(Math.PI / 2);
  geometries.push(obeliskCrystalGeo, obeliskRingGeo);

  const createObelisk = (x: number, z: number) => {
    const obGroup = new THREE.Group();
    obGroup.position.set(x, 1.35, z);
    obGroup.visible = false;
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x66ddd2,
      emissive: 0x66ddd2,
      emissiveIntensity: 0.85,
      normalMap: glassPair.normalMap,
      roughnessMap: glassPair.roughnessMap,
      metalness: 0.42,
      roughness: 0.15,
      clearcoat: 0.92,
      clearcoatRoughness: 0.1,
      iridescence: 0.7,
      iridescenceIOR: 1.44,
    });
    customMats.push(mat);
    const crystal = new THREE.Mesh(obeliskCrystalGeo, mat);
    const ring = new THREE.Mesh(obeliskRingGeo, mats.goldMat);
    obGroup.add(crystal, ring);
    group.add(obGroup);
    return { group: obGroup, mat, ring };
  };

  const playerObelisk = createObelisk(-2.35, 4.55);
  const enemyObelisk = createObelisk(2.35, -4.55);

  const trapSealGeo = new THREE.RingGeometry(0.45, 0.58, 6);
  trapSealGeo.rotateX(-Math.PI / 2);
  geometries.push(trapSealGeo);

  const createTrapSeal = (z: number) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x453512,
      emissive: 0xe2b354,
      emissiveIntensity: 1.3,
      normalMap: moatPair.normalMap,
      roughnessMap: moatPair.roughnessMap,
      roughness: 0.28,
      metalness: 0.4,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    customMats.push(mat);
    const mesh = new THREE.Mesh(trapSealGeo, mat);
    mesh.position.set(0, 0.028, z);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, mat };
  };

  const playerTrapSeal = createTrapSeal(3.25);
  const enemyTrapSeal = createTrapSeal(-3.25);

  // 8. Volumetric Crossed-Plane Sanctuary Grass & Thorn-Ferns (2,400 InstancedMesh tufts)
  const grassTextures = createFoliageAlphaTextures(4, 31415);
  const grassPlaneA = new THREE.PlaneGeometry(0.56, 0.55);
  grassPlaneA.translate(0, 0.275, 0);
  grassPlaneA.rotateY(Math.PI * 0.25);
  const grassPlaneB = new THREE.PlaneGeometry(0.56, 0.55);
  grassPlaneB.translate(0, 0.275, 0);
  grassPlaneB.rotateY(-Math.PI * 0.25);
  const grassGeo = safeMerge([grassPlaneA, grassPlaneB])!;
  geometries.push(grassGeo);

  const grassWindUniform = { value: 0 };
  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTextures.map,
    normalMap: grassTextures.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: grassTextures.roughnessMap,
    roughness: 0.68,
    metalness: 0.04,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = grassWindUniform;
    shader.vertexShader =
      'uniform float uWindTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float hFactor = clamp(position.y / 0.55, 0.0, 1.0);
        float windPhase = position.x * 2.1 + position.z * 1.7;
        #ifdef USE_INSTANCING
          windPhase += instanceMatrix[3][0] * 1.37 + instanceMatrix[3][2] * 1.91;
        #endif
        float gust = sin(uWindTime * 1.85 + windPhase) * 0.065 + sin(uWindTime * 3.4 + windPhase * 1.7) * 0.022;
        transformed.x += gust * hFactor * hFactor;
        transformed.z += cos(uWindTime * 1.45 + windPhase * 0.8) * 0.032 * hFactor * hFactor;`
      );
  };
  customMats.push(grassMat);

  const maxGrassCount = 2400;
  const grassInstanced = new THREE.InstancedMesh(grassGeo, grassMat, maxGrassCount);
  grassInstanced.receiveShadow = true;

  const envRng = createRng(8842);
  const instDummy = new THREE.Object3D();
  const instColor = new THREE.Color();

  const ledgeBands: Array<{ rMin: number; rMax: number; yBase: number; weight: number }> = [
    { rMin: 6.95, rMax: 7.42, yBase: -0.45, weight: 0.36 },
    { rMin: 7.45, rMax: 8.65, yBase: 0.005, weight: 0.2 },
    { rMin: 8.85, rMax: 10.45, yBase: 0.45, weight: 0.18 },
    { rMin: 10.7, rMax: 12.85, yBase: 0.895, weight: 0.14 },
    { rMin: 13.15, rMax: 17.8, yBase: 1.175, weight: 0.12 },
  ];

  const sampleBand = (): { rMin: number; rMax: number; yBase: number } => {
    let pick = envRng.next();
    for (const b of ledgeBands) {
      pick -= b.weight;
      if (pick <= 0) return b;
    }
    return ledgeBands[0];
  };

  for (let i = 0; i < maxGrassCount; i++) {
    let gx = 0;
    let gy = -0.45;
    let gz = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const band = sampleBand();
      const ang = envRng.range(0, Math.PI * 2);
      const rad = envRng.range(band.rMin, band.rMax);
      gx = Math.cos(ang) * rad;
      gz = Math.sin(ang) * rad;
      gy = band.yBase;
      // Keep north/south stone bridges & altar pier footprint clear
      const onBridge = Math.abs(gx) < 2.25 && Math.abs(gz) > 5.4;
      const nearNorthAltar = Math.abs(gx) < 4.5 && gz < -9.5 && gz > -12.6;
      if (!onBridge && !nearNorthAltar) break;
    }
    instDummy.position.set(gx, gy, gz);
    instDummy.rotation.set(
      envRng.range(-0.12, 0.12),
      envRng.range(0, Math.PI * 2),
      envRng.range(-0.12, 0.12)
    );
    const sXZ = envRng.range(0.75, 1.48);
    const sY = envRng.range(0.7, 1.55);
    instDummy.scale.set(sXZ, sY, sXZ);
    instDummy.updateMatrix();
    grassInstanced.setMatrixAt(i, instDummy.matrix);

    const shade = envRng.range(0.78, 1.32);
    instColor.setRGB(0.80 * shade, 0.96 * shade, 0.82 * shade);
    grassInstanced.setColorAt(i, instColor);
  }
  grassInstanced.instanceMatrix.needsUpdate = true;
  if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
  grassInstanced.computeBoundingSphere();
  group.add(grassInstanced);

  // 9. Instanced Faceted Basalt Rubble & Sanctuary Stones (1,200 InstancedMesh rocks)
  const rockBaseGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const rockPosAttr = rockBaseGeo.attributes.position;
  for (let vi = 0; vi < rockPosAttr.count; vi++) {
    const vx = rockPosAttr.getX(vi);
    const vy = rockPosAttr.getY(vi);
    const vz = rockPosAttr.getZ(vi);
    const jitter = 0.78 + 0.42 * Math.abs(Math.sin(vx * 37.1 + vy * 51.3 + vz * 29.7));
    rockPosAttr.setXYZ(vi, vx * jitter, vy * jitter * 0.72, vz * jitter);
  }
  rockBaseGeo.computeVertexNormals();
  geometries.push(rockBaseGeo);

  const maxRockCount = 1200;
  const rockInstanced = new THREE.InstancedMesh(rockBaseGeo, mats.pillarStoneMat, maxRockCount);
  rockInstanced.castShadow = false;
  rockInstanced.receiveShadow = true;

  for (let i = 0; i < maxRockCount; i++) {
    let rx = 0;
    let ry = -0.44;
    let rz = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const band = sampleBand();
      const ang = envRng.range(0, Math.PI * 2);
      const rad = envRng.range(band.rMin - 0.35, band.rMax + 0.15);
      rx = Math.cos(ang) * rad;
      rz = Math.sin(ang) * rad;
      ry = band.yBase + 0.03;
      const onBridge = Math.abs(rx) < 2.25 && Math.abs(rz) > 5.4;
      if (!onBridge) break;
    }
    instDummy.position.set(rx, ry, rz);
    instDummy.rotation.set(
      envRng.range(0, Math.PI * 2),
      envRng.range(0, Math.PI * 2),
      envRng.range(0, Math.PI * 2)
    );
    instDummy.scale.set(
      envRng.range(0.45, 1.65),
      envRng.range(0.32, 0.95),
      envRng.range(0.45, 1.55)
    );
    instDummy.updateMatrix();
    rockInstanced.setMatrixAt(i, instDummy.matrix);

    const tone = envRng.range(0.58, 1.08);
    instColor.setRGB(tone * 0.86, tone * 0.84, tone * 0.96);
    rockInstanced.setColorAt(i, instColor);
  }
  rockInstanced.instanceMatrix.needsUpdate = true;
  if (rockInstanced.instanceColor) rockInstanced.instanceColor.needsUpdate = true;
  rockInstanced.computeBoundingSphere();
  group.add(rockInstanced);

  // 10. Instanced Sanctuary Votive Lantern Ring (24 InstancedMesh stone pillars + embers along terrace)
  const votiveStandGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.68, 6);
  const votiveEmberGeo = new THREE.OctahedronGeometry(0.11, 0);
  geometries.push(votiveStandGeo, votiveEmberGeo);

  const maxVotiveCount = 24;
  const votiveStandInstanced = new THREE.InstancedMesh(votiveStandGeo, mats.darkBronzeMat, maxVotiveCount);
  const votiveEmberInstanced = new THREE.InstancedMesh(votiveEmberGeo, mats.flameEmissiveMat, maxVotiveCount);
  votiveStandInstanced.castShadow = false;
  votiveEmberInstanced.castShadow = false;
  let votivePlaced = 0;
  for (let i = 0; i < 32 && votivePlaced < maxVotiveCount; i++) {
    const ang = (i / 32) * Math.PI * 2 + 0.08;
    const rad = 11.45;
    const vx = Math.cos(ang) * rad;
    const vz = Math.sin(ang) * rad;
    if (Math.abs(vx) < 2.35 && Math.abs(vz) > 5.4) continue;
    if (Math.abs(vx) < 4.4 && vz < -9.4) continue;
    _flameDummy.position.set(vx, 1.24, vz);
    _flameDummy.rotation.set(0, ang, 0);
    _flameDummy.scale.setScalar(1);
    _flameDummy.updateMatrix();
    votiveStandInstanced.setMatrixAt(votivePlaced, _flameDummy.matrix);

    _flameDummy.position.set(vx, 1.66, vz);
    _flameDummy.rotation.set(0, ang * 1.7, 0);
    _flameDummy.scale.set(0.85, 1.25, 0.85);
    _flameDummy.updateMatrix();
    votiveEmberInstanced.setMatrixAt(votivePlaced, _flameDummy.matrix);
    votivePlaced += 1;
  }
  votiveStandInstanced.count = votivePlaced;
  votiveEmberInstanced.count = votivePlaced;
  votiveStandInstanced.instanceMatrix.needsUpdate = true;
  votiveEmberInstanced.instanceMatrix.needsUpdate = true;
  votiveStandInstanced.computeBoundingSphere();
  votiveEmberInstanced.computeBoundingSphere();
  group.add(votiveStandInstanced, votiveEmberInstanced);

  // 11. Instanced Floating Cathedral Votive Candles (20 levitating wax candles + warm flames, 2 draw calls)
  const maxFloatingCandles = 20;
  const floatingCandleBodyGeo = new THREE.CylinderGeometry(0.036, 0.046, 0.28, 6);
  const floatingCandleFlameGeo = new THREE.OctahedronGeometry(0.045, 0);
  geometries.push(floatingCandleBodyGeo, floatingCandleFlameGeo);

  const floatingCandleWaxMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8ac7e,
    emissive: 0x3b260c,
    emissiveIntensity: 0.28,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.32,
    clearcoatRoughness: 0.3,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xffd48e),
  });
  customMats.push(floatingCandleWaxMat);

  const floatingCandleBodyInst = new THREE.InstancedMesh(
    floatingCandleBodyGeo,
    floatingCandleWaxMat,
    maxFloatingCandles
  );
  const floatingCandleFlameInst = new THREE.InstancedMesh(
    floatingCandleFlameGeo,
    mats.flameEmissiveMat,
    maxFloatingCandles
  );
  floatingCandleBodyInst.frustumCulled = false;
  floatingCandleFlameInst.frustumCulled = false;

  const floatingCandleSeeds: Array<{ x: number; baseY: number; z: number; phase: number; speed: number; scale: number }> = [];
  for (let i = 0; i < maxFloatingCandles; i++) {
    const sideSign = i % 2 === 0 ? -1 : 1;
    const bandAngle = -Math.PI * 0.42 + (i / maxFloatingCandles) * Math.PI * 0.84;
    const rad = envRng.range(7.3, 9.5);
    const fx = sideSign * (5.2 + Math.abs(Math.sin(bandAngle)) * 4.2);
    const fz = Math.cos(bandAngle) * rad * 0.68 - 1.4;
    floatingCandleSeeds.push({
      x: fx,
      baseY: envRng.range(2.6, 4.9),
      z: fz,
      phase: envRng.range(0, Math.PI * 2),
      speed: envRng.range(0.95, 1.6),
      scale: envRng.range(0.85, 1.25),
    });
  }

  const updateFloatingCandles = (t: number) => {
    const activeCount = floatingCandleBodyInst.count;
    for (let i = 0; i < activeCount; i++) {
      const c = floatingCandleSeeds[i];
      const cy = c.baseY + Math.sin(t * c.speed + c.phase) * 0.16;
      const tilt = Math.sin(t * 0.8 + c.phase) * 0.04;
      _flameDummy.position.set(c.x, cy, c.z);
      _flameDummy.rotation.set(tilt, c.phase + t * 0.25, -tilt);
      _flameDummy.scale.setScalar(c.scale);
      _flameDummy.updateMatrix();
      floatingCandleBodyInst.setMatrixAt(i, _flameDummy.matrix);

      const flicker = 0.88 + Math.sin(t * 10.5 + c.phase) * 0.18;
      _flameDummy.position.set(c.x, cy + 0.22 * c.scale, c.z);
      _flameDummy.rotation.set(0, t * 2.1 + c.phase, 0);
      _flameDummy.scale.set(0.85 * c.scale, 1.35 * c.scale * flicker, 0.85 * c.scale);
      _flameDummy.updateMatrix();
      floatingCandleFlameInst.setMatrixAt(i, _flameDummy.matrix);
    }
    floatingCandleBodyInst.instanceMatrix.needsUpdate = true;
    floatingCandleFlameInst.instanceMatrix.needsUpdate = true;
  };
  updateFloatingCandles(0);
  group.add(floatingCandleBodyInst, floatingCandleFlameInst);

  const targetHorizon = new THREE.Color(STAGE_ATMOSPHERES[0].horizonHex);
  const targetMid = new THREE.Color(STAGE_ATMOSPHERES[0].midHex);
  const targetVault = new THREE.Color(STAGE_ATMOSPHERES[0].vaultHex);
  const stageRayColor = new THREE.Color(STAGE_ATMOSPHERES[0].rayHex);
  const stageRoseInnerColor = new THREE.Color(STAGE_ATMOSPHERES[0].roseInnerHex);
  const stageRoseOuterColor = new THREE.Color(STAGE_ATMOSPHERES[0].roseOuterHex);
  const flareColor = new THREE.Color(0x5ec8be);
  const overloadRayColor = new THREE.Color(0xe8563a);
  let overloadState = false;
  let overloadBlend = 0;
  let roseFlareTimer = 0;
  let roseFlareDuration = 1.4;
  let roseFlareIntensity = 1.0;

  // Pooled 1-turn ground aftermath decals beneath the 8 combat lanes (chaos scorch / poison venom)
  const laneX = [-3.0, -1.0, 1.0, 3.0];
  const aftermathGeo = new THREE.RingGeometry(0.38, 0.59, 14);
  aftermathGeo.rotateX(-Math.PI / 2);
  geometries.push(aftermathGeo);
  const aftermathDecals: Array<{
    side: 'player' | 'enemy';
    lane: number;
    mesh: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
    kind: 'chaos' | 'poison' | null;
  }> = [];
  (['player', 'enemy'] as const).forEach((side) => {
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef5a35,
        emissive: 0xef5a35,
        emissiveIntensity: 1.15,
        roughness: 0.4,
        metalness: 0.05,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      customMats.push(mat);
      const mesh = new THREE.Mesh(aftermathGeo, mat);
      mesh.position.set(laneX[i], 0.017, side === 'player' ? 1.75 : -1.75);
      mesh.visible = false;
      group.add(mesh);
      aftermathDecals.push({ side, lane: i, mesh, mat, kind: null });
    }
  });

  // Consecrated Lane Rune Crystal Sigils (player/enemy 4 lanes)
  const laneRuneCrystalGeo = new THREE.OctahedronGeometry(0.14, 0);
  laneRuneCrystalGeo.scale(0.8, 1.45, 0.8);
  const laneRuneRingGeo = new THREE.RingGeometry(0.32, 0.39, 6);
  laneRuneRingGeo.rotateX(-Math.PI / 2);
  geometries.push(laneRuneCrystalGeo, laneRuneRingGeo);

  const laneRuneHex: Record<ArenaLaneRune, number> = {
    aegis: 0x5ec8be,
    surge: 0xe2b354,
    fury: 0xe56847,
  };

  const laneRuneMarkers: Array<{
    side: 'player' | 'enemy';
    lane: number;
    holder: THREE.Group;
    crystal: THREE.Mesh;
    ring: THREE.Mesh;
    mat: THREE.MeshPhysicalMaterial;
    kind: ArenaLaneRune | null;
  }> = [];

  (['player', 'enemy'] as const).forEach((side) => {
    for (let i = 0; i < 4; i++) {
      const holder = new THREE.Group();
      holder.position.set(laneX[i], 0.03, side === 'player' ? 1.75 : -1.75);
      holder.visible = false;

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x5ec8be,
        emissive: 0x5ec8be,
        emissiveIntensity: 1.05,
        roughness: 0.16,
        metalness: 0.25,
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.88,
      });
      customMats.push(mat);

      const crystal = new THREE.Mesh(laneRuneCrystalGeo, mat);
      crystal.position.set(0.42, 0.3, side === 'player' ? 0.34 : -0.34);
      const ring = new THREE.Mesh(laneRuneRingGeo, mat);
      ring.position.y = 0.008;
      holder.add(crystal, ring);
      group.add(holder);
      laneRuneMarkers.push({ side, lane: i, holder, crystal, ring, mat, kind: null });
    }
  });

  let currentGraphicsLevel = getGraphicsLevel();
  let perfScale = 1.0;

  const syncInstanceCounts = () => {
    const baseGrass =
      currentGraphicsLevel >= GRAPHICS_LEVEL.ultra
        ? maxGrassCount
        : currentGraphicsLevel >= GRAPHICS_LEVEL.high
          ? 1600
          : currentGraphicsLevel >= GRAPHICS_LEVEL.medium
            ? 900
            : 400;
    const baseRock =
      currentGraphicsLevel >= GRAPHICS_LEVEL.ultra
        ? maxRockCount
        : currentGraphicsLevel >= GRAPHICS_LEVEL.high
          ? 840
          : currentGraphicsLevel >= GRAPHICS_LEVEL.medium
            ? 480
            : 200;
    grassInstanced.count = Math.max(200, Math.round(baseGrass * perfScale));
    rockInstanced.count = Math.max(120, Math.round(baseRock * perfScale));
    const showVotives = currentGraphicsLevel >= GRAPHICS_LEVEL.medium;
    votiveStandInstanced.visible = showVotives;
    votiveEmberInstanced.visible = showVotives;
    if (showVotives) {
      const baseVotive =
        currentGraphicsLevel >= GRAPHICS_LEVEL.high
          ? votivePlaced
          : Math.min(12, votivePlaced);
      const scaledVotive = Math.max(6, Math.round(baseVotive * perfScale));
      votiveStandInstanced.count = scaledVotive;
      votiveEmberInstanced.count = scaledVotive;
    }
    const showFloatingCandles = currentGraphicsLevel >= GRAPHICS_LEVEL.high;
    floatingCandleBodyInst.visible = showFloatingCandles;
    floatingCandleFlameInst.visible = showFloatingCandles;
    if (showFloatingCandles) {
      const baseCandles = currentGraphicsLevel >= GRAPHICS_LEVEL.ultra ? maxFloatingCandles : 12;
      const scaledCandles = Math.max(6, Math.round(baseCandles * perfScale));
      floatingCandleBodyInst.count = scaledCandles;
      floatingCandleFlameInst.count = scaledCandles;
    }
  };

  const applyGraphicsLevel = (level: number) => {
    currentGraphicsLevel = level;
    fissureMesh.visible = level >= GRAPHICS_LEVEL.high;
    floorClockRing.visible = level >= GRAPHICS_LEVEL.medium;
    if (rimFinialsMesh) rimFinialsMesh.visible = level >= GRAPHICS_LEVEL.medium;
    if (vaultRibsMesh) vaultRibsMesh.visible = level >= GRAPHICS_LEVEL.high;
    monolithGroup.visible = level >= GRAPHICS_LEVEL.high;
    censers.forEach((m) => {
      m.visible = level >= GRAPHICS_LEVEL.high;
    });
    roseFiligree.visible = level >= GRAPHICS_LEVEL.high;
    godRayCones.forEach((m) => {
      m.visible = level >= GRAPHICS_LEVEL.high;
    });
    godRaySheets.forEach((m) => {
      m.visible = level >= GRAPHICS_LEVEL.ultra;
    });
    shadowCasters.forEach((m) => {
      m.castShadow = level >= GRAPHICS_LEVEL.high;
    });
    shadowReceivers.forEach((m) => {
      m.receiveShadow = level >= GRAPHICS_LEVEL.high;
    });
    torchLightL.visible = level >= GRAPHICS_LEVEL.medium;
    torchLightR.visible = level >= GRAPHICS_LEVEL.medium;
    godRaySpot.visible = level >= GRAPHICS_LEVEL.high;
    roseShardInstanced.visible = level >= GRAPHICS_LEVEL.medium;

    syncInstanceCounts();
    rockInstanced.castShadow = false;
    rockInstanced.receiveShadow = level >= GRAPHICS_LEVEL.high;
    grassInstanced.receiveShadow = level >= GRAPHICS_LEVEL.high;
  };
  applyGraphicsLevel(currentGraphicsLevel);

  return {
    group,
    setOverload: (active: boolean) => {
      overloadState = active;
    },
    setGraphicsLevel: applyGraphicsLevel,
    setPerfScale: (scale: number) => {
      const clamped = Math.max(0.55, Math.min(1.0, scale));
      if (Math.abs(clamped - perfScale) < 0.04) return;
      perfScale = clamped;
      syncInstanceCounts();
    },
    setStageAtmosphere: (stageIndex: number): StageAtmosphere => {
      const idx = Math.max(0, Math.min(STAGE_ATMOSPHERES.length - 1, stageIndex));
      const atm = STAGE_ATMOSPHERES[idx];
      targetHorizon.setHex(atm.horizonHex);
      targetMid.setHex(atm.midHex);
      targetVault.setHex(atm.vaultHex);
      stageRayColor.setHex(atm.rayHex);
      stageRoseInnerColor.setHex(atm.roseInnerHex);
      stageRoseOuterColor.setHex(atm.roseOuterHex);
      roseGlassMat.color.setHex(atm.roseInnerHex);
      roseGlassMat.emissive.setHex(atm.roseInnerHex);
      roseOuterGlassMat.color.setHex(atm.roseOuterHex);
      roseOuterGlassMat.emissive.setHex(atm.roseOuterHex);
      moatLeyMat.color.setHex(atm.moatHex);
      moatLeyMat.emissive.setHex(atm.moatHex);
      godRaySpot.color.setHex(atm.rayHex);
      shardMat.color.setHex(atm.rimHex);
      shardMat.emissive.setHex(atm.rimHex);
      return atm;
    },
    setEnchantments: (playerSchool: MagicSchool | null, enemySchool: MagicSchool | null) => {
      playerObelisk.group.visible = playerSchool !== null;
      if (playerSchool) {
        playerObelisk.mat.color.setHex(schoolColors[playerSchool]);
        playerObelisk.mat.emissive.setHex(schoolColors[playerSchool]);
      }
      enemyObelisk.group.visible = enemySchool !== null;
      if (enemySchool) {
        enemyObelisk.mat.color.setHex(schoolColors[enemySchool]);
        enemyObelisk.mat.emissive.setHex(schoolColors[enemySchool]);
      }
    },
    setTraps: (playerSchool: MagicSchool | null, enemySchool: MagicSchool | null) => {
      playerTrapSeal.mesh.visible = playerSchool !== null;
      if (playerSchool) {
        playerTrapSeal.mat.color.setHex(schoolColors[playerSchool]);
        playerTrapSeal.mat.emissive.setHex(schoolColors[playerSchool]);
      }
      enemyTrapSeal.mesh.visible = enemySchool !== null;
      if (enemySchool) {
        enemyTrapSeal.mat.color.setHex(schoolColors[enemySchool]);
        enemyTrapSeal.mat.emissive.setHex(schoolColors[enemySchool]);
      }
    },
    setLaneRunes: (runes) => {
      for (const marker of laneRuneMarkers) {
        const k = runes ? (marker.side === 'player' ? runes.player[marker.lane] : runes.enemy[marker.lane]) : null;
        marker.kind = k ?? null;
        if (!marker.kind) {
          marker.holder.visible = false;
        } else {
          const hex = laneRuneHex[marker.kind];
          marker.mat.color.setHex(hex);
          marker.mat.emissive.setHex(hex);
          marker.holder.visible = true;
        }
      }
    },
    triggerRoseFlare: (school: MagicSchool, intense = false) => {
      flareColor.setHex(schoolColors[school]);
      roseFlareDuration = intense ? 1.45 : 1.0;
      roseFlareTimer = roseFlareDuration;
      roseFlareIntensity = intense ? 1.0 : 0.72;
    },
    setSlotAftermath: (aftermath) => {
      for (const dec of aftermathDecals) {
        const k = aftermath ? (dec.side === 'player' ? aftermath.player[dec.lane] : aftermath.enemy[dec.lane]) : null;
        dec.kind = k ?? null;
        if (!dec.kind) {
          dec.mesh.visible = false;
        } else {
          const hex = dec.kind === 'chaos' ? 0xef5a35 : 0x55d472;
          dec.mat.color.setHex(hex);
          dec.mat.emissive.setHex(hex);
          dec.mesh.visible = true;
        }
      }
    },
    update: (time: number, parallaxX: number, parallaxY: number) => {
      grassWindUniform.value = time;
      skyUniforms.uHorizon.value.lerp(targetHorizon, 0.08);
      skyUniforms.uMid.value.lerp(targetMid, 0.08);
      skyUniforms.uVault.value.lerp(targetVault, 0.08);

      const targetOverload = overloadState ? 1.0 : 0.0;
      overloadBlend += (targetOverload - overloadBlend) * 0.12;

      if (roseFlareTimer > 0) {
        roseFlareTimer = Math.max(0, roseFlareTimer - 0.016);
      }
      const flareT = roseFlareTimer > 0 ? Math.sin((roseFlareTimer / roseFlareDuration) * Math.PI) * roseFlareIntensity : 0;

      roseGlassMat.emissive.copy(stageRoseInnerColor).lerp(flareColor, flareT * 0.88);
      roseGlassMat.emissiveIntensity = 0.78 + flareT * 1.45;
      roseOuterGlassMat.emissive.copy(stageRoseOuterColor).lerp(flareColor, flareT * 0.72);
      roseOuterGlassMat.emissiveIntensity = 0.72 + flareT * 1.2;

      for (const dec of aftermathDecals) {
        if (!dec.mesh.visible) continue;
        dec.mesh.rotation.y = time * (dec.kind === 'chaos' ? 0.65 : -0.45) + dec.lane;
        dec.mat.opacity = 0.42 + 0.16 * Math.sin(time * 4.0 + dec.lane * 1.3);
      }

      for (const marker of laneRuneMarkers) {
        if (!marker.holder.visible) continue;
        marker.crystal.position.y = 0.28 + Math.sin(time * 2.8 + marker.lane * 1.1) * 0.055;
        marker.crystal.rotation.y = time * 1.45 + marker.lane * 0.7;
        marker.ring.rotation.y = -time * 0.65 + marker.lane;
        marker.mat.emissiveIntensity = 0.88 + 0.25 * Math.sin(time * 3.4 + marker.lane);
      }

      if (floorClockRing.visible) {
        floorClockRing.rotation.y = time * 0.1;
      }

      if (playerObelisk.group.visible) {
        playerObelisk.group.position.y = 1.4 + Math.sin(time * 2.2) * 0.14;
        playerObelisk.group.rotation.y = time * 0.9;
        playerObelisk.ring.rotation.x = Math.sin(time * 1.4) * 0.35;
      }
      if (enemyObelisk.group.visible) {
        enemyObelisk.group.position.y = 1.4 + Math.sin(time * 2.2 + 1.5) * 0.14;
        enemyObelisk.group.rotation.y = -time * 0.9;
        enemyObelisk.ring.rotation.x = Math.cos(time * 1.4) * 0.35;
      }
      if (playerTrapSeal.mesh.visible) {
        playerTrapSeal.mesh.rotation.y = time * 1.1;
        playerTrapSeal.mat.opacity = 0.52 + 0.26 * Math.sin(time * 3.4);
      }
      if (enemyTrapSeal.mesh.visible) {
        enemyTrapSeal.mesh.rotation.y = -time * 1.1;
        enemyTrapSeal.mat.opacity = 0.52 + 0.26 * Math.cos(time * 3.4);
      }

      if (currentGraphicsLevel >= GRAPHICS_LEVEL.medium) {
        for (let idx = 0; idx < roseShardCount; idx++) {
          const a = time * 0.38 + (idx * Math.PI) / 2;
          _flameDummy.position.set(
            Math.cos(a) * 3.35,
            roseY + Math.sin(a * 1.5) * 1.35,
            roseZ + 0.85 + Math.sin(a) * 0.45
          );
          _flameDummy.rotation.set(0, time * 1.1 + idx, Math.sin(time + idx) * 0.25);
          _flameDummy.scale.set(0.75, 1.55, 0.75);
          _flameDummy.updateMatrix();
          roseShardInstanced.setMatrixAt(idx, _flameDummy.matrix);
        }
        roseShardInstanced.instanceMatrix.needsUpdate = true;
      }

      if (currentGraphicsLevel >= GRAPHICS_LEVEL.high) {
        godRayUniforms.uTime.value = time;
        fissureUniforms.uTime.value = time;
        fissureUniforms.uOverload.value = overloadBlend;

        godRayUniforms.uColor.value
          .copy(stageRayColor)
          .lerp(overloadRayColor, overloadBlend)
          .lerp(flareColor, flareT * 0.85);
        godRayConeMat.uniforms.uOpacity.value = (0.11 + overloadBlend * 0.05 + flareT * 0.11) * perfScale;
        godRaySheetMat.uniforms.uOpacity.value = (0.08 + overloadBlend * 0.04 + flareT * 0.08) * perfScale;

        farSanctumGroup.position.x = -parallaxX * 0.7;
        farSanctumGroup.position.y = parallaxY * 0.25;
        roseCore.rotation.y = time * 0.8;
        roseCore.rotation.z = time * 0.4;
        roseFiligree.rotation.z = -time * (0.14 + flareT * 0.75);

        for (let idx = 0; idx < monolithCrystalCoords.length; idx++) {
          const [mx, mz] = monolithCrystalCoords[idx];
          _flameDummy.position.set(mx, 4.85 + Math.sin(time * 1.8 + idx * 1.4) * 0.12, mz);
          _flameDummy.rotation.set(0, time * 0.9 + idx, 0);
          _flameDummy.scale.set(0.75, 1.45, 0.75);
          _flameDummy.updateMatrix();
          monolithCrystalInstanced.setMatrixAt(idx, _flameDummy.matrix);
        }
        monolithCrystalInstanced.instanceMatrix.needsUpdate = true;
        censers.forEach((censer, idx) => {
          censer.rotation.z = Math.sin(time * 0.95 + idx * 1.5) * 0.055;
          censer.rotation.x = Math.cos(time * 0.75 + idx) * 0.03;
        });

        updateInstancedFlames(time);
        updateFloatingCandles(time);
        torchLightL.intensity = (5.0 + Math.sin(time * 7.8) * 0.35 + Math.cos(time * 13.4) * 0.15) * perfScale;
        torchLightR.intensity = (5.0 + Math.cos(time * 7.2) * 0.35 + Math.sin(time * 12.8) * 0.15) * perfScale;
        godRaySpot.intensity = (1.28 + overloadBlend * 0.35 + flareT * 1.35 + Math.sin(time * 0.9) * 0.12) * perfScale;
        godRaySpot.color.copy(stageRayColor).lerp(flareColor, flareT * 0.75);
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
      outerFlameInstanced.dispose();
      innerFlameInstanced.dispose();
      votiveStandInstanced.dispose();
      votiveEmberInstanced.dispose();
      floatingCandleBodyInst.dispose();
      floatingCandleFlameInst.dispose();
      monolithCrystalInstanced.dispose();
      roseShardInstanced.dispose();
      grassInstanced.dispose();
      rockInstanced.dispose();
      roseMandalaTex.dispose();
      moatPair.normalMap.dispose();
      moatPair.roughnessMap.dispose();
      glassPair.normalMap.dispose();
      glassPair.roughnessMap.dispose();
      grassTextures.map.dispose();
      grassTextures.normalMap.dispose();
      grassTextures.roughnessMap.dispose();
    },
  };
}
