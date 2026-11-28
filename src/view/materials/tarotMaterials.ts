import * as THREE from 'three';
import { getGraphicsDetailTier, type DetailTier } from '../../core/graphicsSettings';
import { createRng } from '../../core/rng';
import {
  buildNormalMapFromCanvas,
  createEmbossedLeatherTextures,
  createMicroScratchTextures,
  createPerlinNormalRoughnessPair,
  Perlin2D,
} from './proceduralNoise';

export const TAROT_PALETTE = {
  obsidian: 0x1a181a,
  basalt: 0x262123,
  slate: 0x453636,
  bronze: 0x8f6642,
  gold: 0xc49c48,
  ether: 0x4fa89e,
  order: 0x6a8498,
  overload: 0xb93826,
} as const;

export interface TarotMaterialLibrary {
  wetBasaltMat: THREE.MeshPhysicalMaterial;
  pillarStoneMat: THREE.MeshStandardMaterial;
  sanctumWallMat: THREE.MeshStandardMaterial;
  bronzeMat: THREE.MeshPhysicalMaterial;
  darkBronzeMat: THREE.MeshPhysicalMaterial;
  goldMat: THREE.MeshPhysicalMaterial;
  bluedSteelMat: THREE.MeshPhysicalMaterial;
  crimsonArmorMat: THREE.MeshPhysicalMaterial;
  emeraldArmorMat: THREE.MeshPhysicalMaterial;
  obsidianClothMat: THREE.MeshPhysicalMaterial;
  royalIndigoClothMat: THREE.MeshPhysicalMaterial;
  agedLeatherMat: THREE.MeshPhysicalMaterial;
  porcelainMaskMat: THREE.MeshStandardMaterial;
  boneIvoryMat: THREE.MeshStandardMaterial;
  fluoriteMat: THREE.MeshPhysicalMaterial;
  runeEmissiveMat: THREE.MeshStandardMaterial;
  etherCoreMat: THREE.MeshStandardMaterial;
  chaosCoreMat: THREE.MeshStandardMaterial;
  vitalAmberMat: THREE.MeshStandardMaterial;
  venomGreenMat: THREE.MeshStandardMaterial;
  flameEmissiveMat: THREE.MeshStandardMaterial;
  cyanEyeMat: THREE.MeshStandardMaterial;
  crimsonEyeMat: THREE.MeshStandardMaterial;
  voidMat: THREE.MeshStandardMaterial;
  sovereignVelvetMat: THREE.MeshPhysicalMaterial;
  crimsonSilkMat: THREE.MeshPhysicalMaterial;
  heroSteelPlateMat: THREE.MeshPhysicalMaterial;
  heroGoldTrimMat: THREE.MeshPhysicalMaterial;
  heroArcaneCrystalMat: THREE.MeshPhysicalMaterial;
  heroGrimoirePageMat: THREE.MeshStandardMaterial;
  heroVisageMat: THREE.MeshPhysicalMaterial;
  contactTex: THREE.Texture;
  grimoireTex: THREE.CanvasTexture;
  textures: THREE.Texture[];
  setDetailLevel: (tier: DetailTier) => void;
  dispose: () => void;
}

export function createWetBasaltTextures(
  maxAnisotropy: number,
  seed: number
): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const rng = createRng(seed);
  const perlin = new Perlin2D(seed + 17);
  const size = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bgGrad = cCtx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.52);
  bgGrad.addColorStop(0, '#2c283d');
  bgGrad.addColorStop(0.58, '#201c2d');
  bgGrad.addColorStop(1, '#181523');
  cCtx.fillStyle = bgGrad;
  cCtx.fillRect(0, 0, size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#707070';
  rCtx.fillRect(0, 0, size, size);

  // Height canvas (512x512) for fast Perlin-fused tangent-space normal map
  const normSize = 512;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = normSize;
  heightCanvas.height = normSize;
  const hCtx = heightCanvas.getContext('2d')!;
  hCtx.fillStyle = '#888888';
  hCtx.fillRect(0, 0, normSize, normSize);

  cCtx.strokeStyle = 'rgba(8, 7, 14, 0.72)';
  cCtx.lineWidth = 3;
  hCtx.strokeStyle = '#303030';
  hCtx.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    const p = (i * size) / 8;
    cCtx.beginPath();
    cCtx.moveTo(p, 0);
    cCtx.lineTo(p, size);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(0, p);
    cCtx.lineTo(size, p);
    cCtx.stroke();

    const hp = (i * normSize) / 8;
    hCtx.beginPath();
    hCtx.moveTo(hp, 0);
    hCtx.lineTo(hp, normSize);
    hCtx.stroke();
    hCtx.beginPath();
    hCtx.moveTo(0, hp);
    hCtx.lineTo(normSize, hp);
    hCtx.stroke();
  }

  for (let i = 0; i < 650; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const r = rng.range(10, 72);
    const isMoss = i % 9 === 0;
    cCtx.fillStyle = isMoss
      ? `rgba(38, 60, 50, ${rng.range(0.08, 0.18).toFixed(2)})`
      : `rgba(${Math.floor(rng.range(18, 34))}, ${Math.floor(rng.range(16, 30))}, ${Math.floor(rng.range(28, 46))}, 0.25)`;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();

    const roughVal = Math.floor(rng.range(64, 152));
    rCtx.fillStyle = `rgba(${roughVal}, ${roughVal}, ${roughVal}, 0.34)`;
    rCtx.beginPath();
    rCtx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    rCtx.fill();

    const hVal = Math.floor(rng.range(105, 165));
    hCtx.fillStyle = `rgba(${hVal}, ${hVal}, ${hVal}, 0.25)`;
    hCtx.beginPath();
    hCtx.arc(x * 0.5, y * 0.5, r * 0.45, 0, Math.PI * 2);
    hCtx.fill();
  }

  cCtx.lineCap = 'round';
  hCtx.lineCap = 'round';
  for (let c = 0; c < 44; c++) {
    let px = rng.range(80, size - 80);
    let py = rng.range(80, size - 80);
    let ang = rng.range(0, Math.PI * 2);
    cCtx.strokeStyle = c % 5 === 0 ? 'rgba(72, 148, 140, 0.14)' : 'rgba(8, 7, 14, 0.62)';
    cCtx.lineWidth = rng.range(1.2, 2.6);
    hCtx.strokeStyle = '#202020';
    hCtx.lineWidth = 1.8;
    cCtx.beginPath();
    hCtx.beginPath();
    cCtx.moveTo(px, py);
    hCtx.moveTo(px * 0.5, py * 0.5);
    for (let seg = 0; seg < 6; seg++) {
      ang += rng.range(-0.65, 0.65);
      px += Math.cos(ang) * rng.range(14, 34);
      py += Math.sin(ang) * rng.range(14, 34);
      cCtx.lineTo(px, py);
      hCtx.lineTo(px * 0.5, py * 0.5);
    }
    cCtx.stroke();
    hCtx.stroke();
  }

  const cx = size / 2;
  const cy = size / 2;
  cCtx.strokeStyle = 'rgba(180, 142, 70, 0.26)';
  cCtx.lineWidth = 2;
  hCtx.strokeStyle = '#dcdcdc';
  hCtx.lineWidth = 1.6;
  [120, 185, 310, 420].forEach((radius) => {
    cCtx.beginPath();
    cCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    cCtx.stroke();
    hCtx.beginPath();
    hCtx.arc(cx * 0.5, cy * 0.5, radius * 0.5, 0, Math.PI * 2);
    hCtx.stroke();
  });
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 6;
    cCtx.beginPath();
    cCtx.moveTo(cx + Math.cos(ang) * 120, cy + Math.sin(ang) * 120);
    cCtx.lineTo(cx + Math.cos(ang) * 440, cy + Math.sin(ang) * 440);
    cCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(heightCanvas, perlin, {
    strength: 3.1,
    noiseWeight: 0.42,
    noiseFreq: 12,
    maxAnisotropy,
  });

  return { map, roughnessMap, normalMap };
}

export function createCarvedStoneTexture(
  maxAnisotropy: number,
  seed: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const rng = createRng(seed + 77);
  const perlin = new Perlin2D(seed + 78);
  const size = 512;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;
  hCtx.fillStyle = '#909090';
  hCtx.fillRect(0, 0, size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#b6b6b6';
  rCtx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#3a344a';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const rowH = size / rows;
  ctx.strokeStyle = 'rgba(10, 8, 16, 0.78)';
  ctx.lineWidth = 3;
  hCtx.strokeStyle = '#202020';
  hCtx.lineWidth = 4;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * 64;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    hCtx.beginPath();
    hCtx.moveTo(0, y);
    hCtx.lineTo(size, y);
    hCtx.stroke();

    for (let x = offset; x < size; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(x, y);
      hCtx.lineTo(x, y + rowH);
      hCtx.stroke();

      const shade = Math.floor(rng.range(46, 74));
      ctx.fillStyle = `rgba(${shade}, ${shade - 4}, ${shade + 12}, 0.34)`;
      ctx.fillRect(x + 3, y + 3, 122, rowH - 6);

      const rv = Math.floor(rng.range(160, 224));
      rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
      rCtx.fillRect(x + 3, y + 3, 122, rowH - 6);
    }
  }

  for (let i = 0; i < 240; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const rad = rng.range(4, 22);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(52, 72, 60, 0.15)' : 'rgba(12, 10, 18, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();

    const hv = Math.floor(rng.range(60, 195));
    hCtx.fillStyle = `rgba(${hv},${hv},${hv},0.22)`;
    hCtx.beginPath();
    hCtx.arc(x, y, rad, 0, Math.PI * 2);
    hCtx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  map.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(heightCanvas, perlin, {
    strength: 3.4,
    noiseWeight: 0.45,
    noiseFreq: 10,
    maxAnisotropy,
    repeatX: 3,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}

export function createGrimoirePageTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ddd0b8';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#8b6339';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 232, 232);

  // Tarot star diagram on parchment
  ctx.strokeStyle = '#3d6f6a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(128, 100, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(128, 52);
  ctx.lineTo(168, 134);
  ctx.lineTo(88, 134);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#473626';
  for (let y = 172; y <= 220; y += 12) {
    ctx.fillRect(36, y, 184, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createFiligreeMetalTextures(
  maxAnisotropy: number,
  seed: number
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const rng = createRng(seed + 211);
  const perlin = new Perlin2D(seed + 212);
  const size = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  bCtx.fillStyle = '#828282';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const v = Math.floor(rng.range(108, 152));
    bCtx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    bCtx.beginPath();
    bCtx.arc(rng.range(0, size), rng.range(0, size), rng.range(2, 9), 0, Math.PI * 2);
    bCtx.fill();
  }

  bCtx.strokeStyle = '#363636';
  bCtx.lineWidth = 3;
  for (let y = 32; y < size; y += 64) {
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();
    bCtx.strokeStyle = '#c8c8c8';
    bCtx.lineWidth = 1.5;
    bCtx.beginPath();
    bCtx.moveTo(0, y + 3);
    bCtx.lineTo(size, y + 3);
    bCtx.stroke();
    bCtx.strokeStyle = '#363636';
    bCtx.lineWidth = 3;
  }
  for (let x = 32; x < size; x += 64) {
    for (let y = 16; y < size; y += 64) {
      bCtx.fillStyle = '#dcdcdc';
      bCtx.beginPath();
      bCtx.arc(x, y, 3.2, 0, Math.PI * 2);
      bCtx.fill();
    }
  }
  bCtx.strokeStyle = '#b4b4b4';
  bCtx.lineWidth = 2;
  for (let x = 0; x <= size; x += 64) {
    for (let y = 0; y <= size; y += 64) {
      bCtx.beginPath();
      bCtx.arc(x + 32, y + 32, 18, 0, Math.PI * 2);
      bCtx.stroke();
      bCtx.beginPath();
      bCtx.moveTo(x + 32, y + 8);
      bCtx.lineTo(x + 56, y + 32);
      bCtx.lineTo(x + 32, y + 56);
      bCtx.lineTo(x + 8, y + 32);
      bCtx.closePath();
      bCtx.stroke();
    }
  }

  const normalMap = buildNormalMapFromCanvas(bumpCanvas, perlin, {
    strength: 2.9,
    noiseWeight: 0.34,
    noiseFreq: 12,
    maxAnisotropy,
    repeatX: 2,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

function createBrocadeClothTextures(
  maxAnisotropy: number,
  seed: number
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const perlin = new Perlin2D(seed + 313);
  const size = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const ctx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#707070';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(138, 138, 138, 0.36)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 2.4;
  for (let x = 0; x < size; x += 48) {
    for (let y = 0; y < size; y += 48) {
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 4);
      ctx.lineTo(x + 44, y + 24);
      ctx.lineTo(x + 24, y + 44);
      ctx.lineTo(x + 4, y + 24);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#dcdcdc';
      ctx.beginPath();
      ctx.arc(x + 24, y + 24, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const normalMap = buildNormalMapFromCanvas(bumpCanvas, perlin, {
    strength: 2.5,
    noiseWeight: 0.36,
    noiseFreq: 14,
    maxAnisotropy,
    repeatX: 3,
    repeatY: 3,
  });

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

function createChitinScaleTextures(
  maxAnisotropy: number,
  seed: number
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const perlin = new Perlin2D(seed + 415);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#585858';
  ctx.fillRect(0, 0, size, size);

  const stepY = 24;
  const stepX = 32;
  for (let row = -1; row <= size / stepY + 1; row++) {
    const offset = (row % 2) * (stepX * 0.5);
    for (let col = -1; col <= size / stepX + 1; col++) {
      const cx = col * stepX + offset;
      const cy = row * stepY;
      const grad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, 18);
      grad.addColorStop(0, '#dedede');
      grad.addColorStop(0.75, '#8c8c8c');
      grad.addColorStop(1, '#343434');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  const normalMap = buildNormalMapFromCanvas(c, perlin, {
    strength: 3.1,
    noiseWeight: 0.28,
    noiseFreq: 10,
    maxAnisotropy,
    repeatX: 3,
    repeatY: 3,
  });

  const roughnessMap = new THREE.CanvasTexture(c);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

function createVolcanicFissureTextures(
  maxAnisotropy: number,
  seed: number
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const rng = createRng(seed + 409);
  const perlin = new Perlin2D(seed + 410);
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = 'round';
  for (let k = 0; k < 28; k++) {
    let x = rng.range(0, size);
    let y = rng.range(0, size);
    let ang = rng.range(0, Math.PI * 2);
    ctx.strokeStyle = k % 3 === 0 ? '#181818' : '#323232';
    ctx.lineWidth = rng.range(2, 4.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      ang += rng.range(-0.9, 0.9);
      x += Math.cos(ang) * rng.range(12, 28);
      y += Math.sin(ang) * rng.range(12, 28);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const normalMap = buildNormalMapFromCanvas(c, perlin, {
    strength: 3.3,
    noiseWeight: 0.42,
    noiseFreq: 8,
    maxAnisotropy,
    repeatX: 2,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(c);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.92)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createSovereignBrocadeTextures(
  maxAnisotropy: number,
  seed: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const perlin = new Perlin2D(seed + 619);
  const size = 512;

  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const cCtx = colCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Rich midnight-indigo velvet base
  const grad = cCtx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1e284a');
  grad.addColorStop(0.5, '#27355f');
  grad.addColorStop(1, '#1a2342');
  cCtx.fillStyle = grad;
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#6c6c6c';
  bCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#d4d4d4';
  rCtx.fillRect(0, 0, size, size);

  // Fine velvet twill grain
  cCtx.strokeStyle = 'rgba(130, 165, 230, 0.08)';
  bCtx.strokeStyle = 'rgba(128, 128, 128, 0.35)';
  cCtx.lineWidth = 1;
  bCtx.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 6) {
    cCtx.beginPath();
    cCtx.moveTo(i, 0);
    cCtx.lineTo(i + size, size);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(i, 0);
    bCtx.lineTo(i + size, size);
    bCtx.stroke();
  }

  // Woven golden-silk Tarot damask medallions & filigree trellises
  const cell = 128;
  for (let gx = 0; gx < size; gx += cell) {
    for (let gy = 0; gy < size; gy += cell) {
      const cx = gx + cell * 0.5;
      const cy = gy + cell * 0.5;

      // Subtle embroidered diamond trellis
      cCtx.strokeStyle = 'rgba(196, 156, 72, 0.28)';
      cCtx.lineWidth = 2;
      bCtx.strokeStyle = '#bcbcbc';
      bCtx.lineWidth = 2.5;
      rCtx.strokeStyle = '#6a6a6a';
      rCtx.lineWidth = 2.5;

      [cCtx, bCtx, rCtx].forEach((ctx) => {
        ctx.beginPath();
        ctx.moveTo(cx, gy + 8);
        ctx.lineTo(gx + cell - 8, cy);
        ctx.lineTo(cx, gy + cell - 8);
        ctx.lineTo(gx + 8, cy);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 8-ray embroidered star core
      cCtx.strokeStyle = 'rgba(222, 185, 102, 0.42)';
      cCtx.lineWidth = 1.6;
      bCtx.strokeStyle = '#dedede';
      bCtx.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        cCtx.beginPath();
        cCtx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
        cCtx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        cCtx.stroke();

        bCtx.beginPath();
        bCtx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
        bCtx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        bCtx.stroke();
      }
    }
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(bumpCanvas, perlin, {
    strength: 2.6,
    noiseWeight: 0.32,
    noiseFreq: 16,
    maxAnisotropy,
    repeatX: 2,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}

function createCrimsonSilkTextures(
  maxAnisotropy: number,
  seed: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const perlin = new Perlin2D(seed + 733);
  const size = 256;

  const colCanvas = document.createElement('canvas');
  colCanvas.width = size;
  colCanvas.height = size;
  const cCtx = colCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const grad = cCtx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#781d22');
  grad.addColorStop(0.5, '#912529');
  grad.addColorStop(1, '#5e1419');
  cCtx.fillStyle = grad;
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#7c7c7c';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#8a8a8a';
  rCtx.fillRect(0, 0, size, size);

  cCtx.strokeStyle = 'rgba(235, 160, 120, 0.14)';
  bCtx.strokeStyle = 'rgba(155, 155, 155, 0.35)';
  cCtx.lineWidth = 1;
  bCtx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    cCtx.beginPath();
    cCtx.moveTo(0, i);
    cCtx.lineTo(size, i);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, i);
    bCtx.lineTo(size, i);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(bumpCanvas, perlin, {
    strength: 1.9,
    noiseWeight: 0.25,
    noiseFreq: 14,
    maxAnisotropy,
    repeatX: 2,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}

function createDamascusSteelTextures(
  maxAnisotropy: number,
  seed: number
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const perlin = new Perlin2D(seed + 827);
  const size = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Damascus folded wave striations & rivet micro-bevels
  for (let y = 0; y < size; y += 6) {
    bCtx.strokeStyle = y % 12 === 0 ? 'rgba(205, 205, 205, 0.4)' : 'rgba(65, 65, 65, 0.35)';
    bCtx.lineWidth = 1.8;
    bCtx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wave = Math.sin(x * 0.05 + y * 0.09) * 3.5;
      if (x === 0) bCtx.moveTo(x, y + wave);
      else bCtx.lineTo(x, y + wave);
    }
    bCtx.stroke();
  }

  const normalMap = buildNormalMapFromCanvas(bumpCanvas, perlin, {
    strength: 1.65,
    noiseWeight: 0.26,
    noiseFreq: 10,
    maxAnisotropy,
    repeatX: 2,
    repeatY: 2,
  });

  const roughnessMap = new THREE.CanvasTexture(bumpCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

function createIlluminatedGrimoireTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const parchment = ctx.createRadialGradient(size / 2, size / 2, 24, size / 2, size / 2, size * 0.72);
  parchment.addColorStop(0, '#efe4cc');
  parchment.addColorStop(0.7, '#dfd0b2');
  parchment.addColorStop(1, '#bea882');
  ctx.fillStyle = parchment;
  ctx.fillRect(0, 0, size, size);

  // Double gold leaf frame
  ctx.strokeStyle = '#a47936';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, size - 40, size - 40);
  ctx.strokeStyle = '#6f4e22';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, size - 60, size - 60);

  // Celestial Tarot Astrolabe sigil
  const cx = size / 2;
  const cy = 190;
  ctx.strokeStyle = '#2d6d68';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#9b3428';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const x = cx + Math.cos(a) * 90;
    const y = cy + Math.sin(a) * 90;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#c49c48';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  // Illuminated drop-cap + calligraphic script lines
  ctx.fillStyle = '#8e2c22';
  ctx.fillRect(58, 326, 44, 44);
  ctx.strokeStyle = '#c49c48';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(58, 326, 44, 44);

  ctx.fillStyle = '#3b2b1d';
  for (let row = 0; row < 6; row++) {
    const y = 330 + row * 22;
    const xStart = row < 3 ? 116 : 58;
    const w = (size - 58 - xStart) * (row === 5 ? 0.62 : 0.96);
    ctx.fillRect(xStart, y, w, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTarotMaterialLibrary(
  maxAnisotropy: number,
  seed: number
): TarotMaterialLibrary {
  const basalt = createWetBasaltTextures(maxAnisotropy, seed);
  const stone = createCarvedStoneTexture(maxAnisotropy, seed);
  const grimoireTex = createGrimoirePageTexture(maxAnisotropy);
  const contact = createContactShadowTexture();
  const filigree = createFiligreeMetalTextures(maxAnisotropy, seed);
  const brocade = createBrocadeClothTextures(maxAnisotropy, seed);
  const chitin = createChitinScaleTextures(maxAnisotropy, seed);
  const volcanic = createVolcanicFissureTextures(maxAnisotropy, seed);
  const sovereignBrocade = createSovereignBrocadeTextures(maxAnisotropy, seed);
  const crimsonSilk = createCrimsonSilkTextures(maxAnisotropy, seed);
  const damascusSteel = createDamascusSteelTextures(maxAnisotropy, seed);
  const microScratch = createMicroScratchTextures(seed, {
    size: 256,
    scratchCount: 135,
    maxAnisotropy,
    repeat: 2,
    strength: 2.35,
  });
  const embossedLeather = createEmbossedLeatherTextures(maxAnisotropy, seed);
  const illuminatedGrimoireTex = createIlluminatedGrimoireTexture(maxAnisotropy);

  // Perlin micro-relief normal+roughness pairs for porcelain, ivory, crystal, void & runes
  const porcelainPair = createPerlinNormalRoughnessPair(seed + 501, {
    size: 128,
    baseFreq: 6,
    octaves: 3,
    normalStrength: 1.4,
    roughMin: 0.24,
    roughMax: 0.48,
    repeat: 2,
    maxAnisotropy,
  });
  const ivoryPair = createPerlinNormalRoughnessPair(seed + 502, {
    size: 128,
    baseFreq: 8,
    octaves: 4,
    normalStrength: 2.1,
    roughMin: 0.38,
    roughMax: 0.68,
    repeat: 2,
    streakX: 2,
    maxAnisotropy,
  });
  const crystalPair = createPerlinNormalRoughnessPair(seed + 503, {
    size: 128,
    baseFreq: 5,
    octaves: 3,
    normalStrength: 2.2,
    roughMin: 0.12,
    roughMax: 0.34,
    repeat: 2,
    maxAnisotropy,
  });
  const runePair = createPerlinNormalRoughnessPair(seed + 504, {
    size: 128,
    baseFreq: 7,
    octaves: 3,
    normalStrength: 1.9,
    roughMin: 0.18,
    roughMax: 0.44,
    repeat: 2,
    maxAnisotropy,
  });

  const wetBasaltMat = new THREE.MeshPhysicalMaterial({
    map: basalt.map,
    normalMap: basalt.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: basalt.roughnessMap,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.04,
    clearcoat: 0.22,
    clearcoatRoughness: 0.46,
    clearcoatNormalMap: basalt.normalMap,
    clearcoatNormalScale: new THREE.Vector2(0.35, 0.35),
    transparent: true,
    opacity: 0.97,
  });

  const pillarStoneMat = new THREE.MeshStandardMaterial({
    map: stone.map,
    normalMap: stone.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: stone.roughnessMap,
    color: 0x7c7692,
    roughness: 0.76,
    metalness: 0.12,
  });

  const sanctumWallMat = new THREE.MeshStandardMaterial({
    map: stone.map,
    normalMap: stone.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: stone.roughnessMap,
    color: 0x5c5570,
    roughness: 0.84,
    metalness: 0.1,
  });

  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: TAROT_PALETTE.bronze,
    normalMap: filigree.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: filigree.roughnessMap,
    roughness: 0.46,
    metalness: 0.78,
    anisotropy: 0.4,
    clearcoat: 0.14,
    clearcoatRoughness: 0.3,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
  });

  const darkBronzeMat = new THREE.MeshPhysicalMaterial({
    color: 0x614734,
    normalMap: filigree.normalMap,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: filigree.roughnessMap,
    roughness: 0.54,
    metalness: 0.72,
    anisotropy: 0.35,
    clearcoat: 0.12,
    clearcoatRoughness: 0.34,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.42, 0.42),
  });

  const goldMat = new THREE.MeshPhysicalMaterial({
    color: TAROT_PALETTE.gold,
    normalMap: filigree.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: filigree.roughnessMap,
    roughness: 0.36,
    metalness: 0.86,
    anisotropy: 0.44,
    clearcoat: 0.16,
    clearcoatRoughness: 0.26,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.42, 0.42),
  });

  const bluedSteelMat = new THREE.MeshPhysicalMaterial({
    color: 0x455368,
    normalMap: filigree.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: filigree.roughnessMap,
    roughness: 0.36,
    metalness: 0.82,
    anisotropy: 0.42,
    clearcoat: 0.18,
    clearcoatRoughness: 0.28,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
  });

  const crimsonArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0x6f231e,
    normalMap: volcanic.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: volcanic.roughnessMap,
    roughness: 0.48,
    metalness: 0.46,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
  });

  const emeraldArmorMat = new THREE.MeshPhysicalMaterial({
    color: 0x265446,
    normalMap: chitin.normalMap,
    normalScale: new THREE.Vector2(0.82, 0.82),
    roughnessMap: chitin.roughnessMap,
    roughness: 0.5,
    metalness: 0.4,
    clearcoat: 0.18,
    clearcoatRoughness: 0.4,
  });

  const obsidianClothMat = new THREE.MeshPhysicalMaterial({
    color: 0x322b42,
    normalMap: brocade.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: brocade.roughnessMap,
    roughness: 0.88,
    metalness: 0.04,
    sheen: 0.32,
    sheenRoughness: 0.76,
    sheenColor: new THREE.Color(0x6b608c),
  });

  const royalIndigoClothMat = new THREE.MeshPhysicalMaterial({
    color: 0x34436b,
    normalMap: brocade.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: brocade.roughnessMap,
    roughness: 0.85,
    metalness: 0.05,
    sheen: 0.34,
    sheenRoughness: 0.74,
    sheenColor: new THREE.Color(0x6e94c4),
  });

  const agedLeatherMat = new THREE.MeshPhysicalMaterial({
    color: 0x523726,
    normalMap: embossedLeather.normalMap,
    normalScale: new THREE.Vector2(0.78, 0.78),
    roughnessMap: embossedLeather.roughnessMap,
    roughness: 0.76,
    metalness: 0.06,
    sheen: 0.24,
    sheenRoughness: 0.74,
    sheenColor: new THREE.Color(0x825e42),
  });

  const porcelainMaskMat = new THREE.MeshPhysicalMaterial({
    color: 0xdad0bf,
    normalMap: porcelainPair.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughnessMap: porcelainPair.roughnessMap,
    roughness: 0.36,
    metalness: 0.06,
    clearcoat: 0.38,
    clearcoatRoughness: 0.22,
  });

  const boneIvoryMat = new THREE.MeshStandardMaterial({
    color: 0xcabca6,
    normalMap: ivoryPair.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: ivoryPair.roughnessMap,
    roughness: 0.6,
    metalness: 0.05,
  });

  const fluoriteMat = new THREE.MeshPhysicalMaterial({
    color: 0x292a3d,
    normalMap: volcanic.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: volcanic.roughnessMap,
    roughness: 0.36,
    metalness: 0.28,
    clearcoat: 0.28,
    clearcoatRoughness: 0.34,
    iridescence: 0.3,
    iridescenceIOR: 1.4,
  });

  const runeEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0x9c7c3b,
    emissive: 0x7c5e24,
    emissiveIntensity: 0.62,
    normalMap: runePair.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: runePair.roughnessMap,
    roughness: 0.36,
    metalness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const etherCoreMat = new THREE.MeshStandardMaterial({
    color: 0x56b9ae,
    emissive: 0x2f7d75,
    emissiveIntensity: 0.82,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.22,
    metalness: 0.24,
  });

  const chaosCoreMat = new THREE.MeshStandardMaterial({
    color: 0xd9562b,
    emissive: 0x9e3214,
    emissiveIntensity: 0.88,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.26,
    metalness: 0.22,
  });

  const vitalAmberMat = new THREE.MeshStandardMaterial({
    color: 0xcf9b42,
    emissive: 0x7d571a,
    emissiveIntensity: 0.7,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.28,
    metalness: 0.3,
  });

  const venomGreenMat = new THREE.MeshStandardMaterial({
    color: 0x43bd70,
    emissive: 0x1f733f,
    emissiveIntensity: 0.8,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.26,
    metalness: 0.2,
  });

  // Strictly PBR emissive materials (no MeshBasicMaterial anywhere)
  const flameEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0x4d1d08,
    emissive: 0xeb782a,
    emissiveIntensity: 1.55,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.3,
    metalness: 0.05,
  });

  const cyanEyeMat = new THREE.MeshStandardMaterial({
    color: 0x1b4f4b,
    emissive: 0x6ae3d8,
    emissiveIntensity: 1.65,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.18,
    metalness: 0.1,
  });

  const crimsonEyeMat = new THREE.MeshStandardMaterial({
    color: 0x4c170d,
    emissive: 0xf0653c,
    emissiveIntensity: 1.65,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.18,
    metalness: 0.1,
  });

  const voidMat = new THREE.MeshStandardMaterial({
    color: 0x100e17,
    normalMap: porcelainPair.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: porcelainPair.roughnessMap,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Hyper-detailed Sovereign Player Archon PBR materials
  const sovereignVelvetMat = new THREE.MeshPhysicalMaterial({
    map: sovereignBrocade.map,
    normalMap: sovereignBrocade.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: sovereignBrocade.roughnessMap,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.08,
    sheen: 0.65,
    sheenRoughness: 0.56,
    sheenColor: new THREE.Color(0x6f96e8),
    side: THREE.DoubleSide,
  });

  const crimsonSilkMat = new THREE.MeshPhysicalMaterial({
    map: crimsonSilk.map,
    normalMap: crimsonSilk.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: crimsonSilk.roughnessMap,
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.06,
    sheen: 0.72,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(0xe66a5a),
    side: THREE.DoubleSide,
  });

  const heroSteelPlateMat = new THREE.MeshPhysicalMaterial({
    color: 0x677993,
    normalMap: damascusSteel.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: microScratch.roughnessMap,
    roughness: 0.25,
    metalness: 0.9,
    anisotropy: 0.65,
    clearcoat: 0.38,
    clearcoatRoughness: 0.18,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.68, 0.68),
  });

  const heroGoldTrimMat = new THREE.MeshPhysicalMaterial({
    color: 0xdeb75c,
    normalMap: filigree.normalMap,
    normalScale: new THREE.Vector2(0.84, 0.84),
    roughnessMap: microScratch.roughnessMap,
    roughness: 0.22,
    metalness: 0.94,
    anisotropy: 0.68,
    clearcoat: 0.28,
    clearcoatRoughness: 0.17,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.58, 0.58),
  });

  const heroArcaneCrystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x74ebe0,
    emissive: 0x1e6963,
    emissiveIntensity: 0.48,
    normalMap: crystalPair.normalMap,
    normalScale: new THREE.Vector2(0.76, 0.76),
    roughnessMap: crystalPair.roughnessMap,
    roughness: 0.12,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    clearcoatNormalMap: microScratch.clearcoatNormalMap,
    clearcoatNormalScale: new THREE.Vector2(0.3, 0.3),
    iridescence: 0.96,
    iridescenceIOR: 1.5,
  });

  const heroGrimoirePageMat = new THREE.MeshStandardMaterial({
    map: illuminatedGrimoireTex,
    normalMap: ivoryPair.normalMap,
    normalScale: new THREE.Vector2(0.34, 0.34),
    roughnessMap: ivoryPair.roughnessMap,
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.04,
  });

  const heroVisageMat = new THREE.MeshPhysicalMaterial({
    color: 0xede5d7,
    normalMap: porcelainPair.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    roughnessMap: porcelainPair.roughnessMap,
    roughness: 0.3,
    metalness: 0.07,
    clearcoat: 0.34,
    clearcoatRoughness: 0.2,
  });

  let currentDetailTier: DetailTier | null = null;
  const setDetailLevel = (tier: DetailTier) => {
    if (currentDetailTier === tier) return;
    currentDetailTier = tier;
    const rich = tier >= 2;
    const ultra = tier >= 3;
    const envBoost = ultra ? 1.04 : rich ? 0.96 : 0.84;
    const normFactor = ultra ? 1.05 : rich ? 0.85 : 0.55;

    wetBasaltMat.normalScale.set(0.9 * normFactor, 0.9 * normFactor);
    wetBasaltMat.clearcoat = ultra ? 0.34 : rich ? 0.24 : 0.1;
    wetBasaltMat.clearcoatRoughness = ultra ? 0.34 : rich ? 0.44 : 0.56;
    wetBasaltMat.envMapIntensity = envBoost * 0.94;

    [bronzeMat, darkBronzeMat, goldMat, bluedSteelMat].forEach((m) => {
      m.normalScale.set(0.75 * normFactor, 0.75 * normFactor);
      m.clearcoatNormalScale.set(0.45 * normFactor, 0.45 * normFactor);
      m.anisotropy = ultra ? 0.45 : rich ? 0.34 : 0.14;
      m.envMapIntensity = envBoost;
    });

    heroSteelPlateMat.normalScale.set(0.82 * normFactor, 0.82 * normFactor);
    heroSteelPlateMat.clearcoatNormalScale.set(0.58 * normFactor, 0.58 * normFactor);
    heroSteelPlateMat.anisotropy = ultra ? 0.6 : rich ? 0.44 : 0.18;
    heroSteelPlateMat.envMapIntensity = envBoost * 1.06;

    heroGoldTrimMat.normalScale.set(0.75 * normFactor, 0.75 * normFactor);
    heroGoldTrimMat.clearcoatNormalScale.set(0.5 * normFactor, 0.5 * normFactor);
    heroGoldTrimMat.anisotropy = ultra ? 0.64 : rich ? 0.46 : 0.2;
    heroGoldTrimMat.envMapIntensity = envBoost * 1.08;

    heroArcaneCrystalMat.iridescence = ultra ? 0.94 : rich ? 0.72 : 0.3;
    heroArcaneCrystalMat.envMapIntensity = envBoost * 1.12;

    sovereignVelvetMat.normalScale.set(0.95 * normFactor, 0.95 * normFactor);
    sovereignVelvetMat.sheen = ultra ? 0.68 : rich ? 0.5 : 0.26;
    sovereignVelvetMat.envMapIntensity = envBoost * 0.88;

    crimsonSilkMat.normalScale.set(0.75 * normFactor, 0.75 * normFactor);
    crimsonSilkMat.sheen = ultra ? 0.74 : rich ? 0.55 : 0.28;
    crimsonSilkMat.envMapIntensity = envBoost * 0.92;

    heroVisageMat.envMapIntensity = envBoost;

    [obsidianClothMat, royalIndigoClothMat].forEach((m) => {
      m.normalScale.set(0.85 * normFactor, 0.85 * normFactor);
      m.sheen = ultra ? 0.34 : rich ? 0.26 : 0.14;
      m.envMapIntensity = envBoost * 0.78;
    });

    [emeraldArmorMat, agedLeatherMat].forEach((m) => {
      m.normalScale.set(0.82 * normFactor, 0.82 * normFactor);
      m.envMapIntensity = envBoost * 0.9;
    });

    [crimsonArmorMat, fluoriteMat].forEach((m) => {
      m.normalScale.set(0.85 * normFactor, 0.85 * normFactor);
      m.envMapIntensity = envBoost * 0.9;
    });

    pillarStoneMat.normalScale.set(0.95 * normFactor, 0.95 * normFactor);
    pillarStoneMat.envMapIntensity = envBoost * 0.85;

    sanctumWallMat.normalScale.set(1.0 * normFactor, 1.0 * normFactor);
    sanctumWallMat.envMapIntensity = envBoost * 0.82;
  };

  setDetailLevel(getGraphicsDetailTier());

  const allMaterials = [
    wetBasaltMat,
    pillarStoneMat,
    sanctumWallMat,
    bronzeMat,
    darkBronzeMat,
    goldMat,
    bluedSteelMat,
    crimsonArmorMat,
    emeraldArmorMat,
    obsidianClothMat,
    royalIndigoClothMat,
    agedLeatherMat,
    porcelainMaskMat,
    boneIvoryMat,
    fluoriteMat,
    runeEmissiveMat,
    etherCoreMat,
    chaosCoreMat,
    vitalAmberMat,
    venomGreenMat,
    flameEmissiveMat,
    cyanEyeMat,
    crimsonEyeMat,
    voidMat,
    sovereignVelvetMat,
    crimsonSilkMat,
    heroSteelPlateMat,
    heroGoldTrimMat,
    heroArcaneCrystalMat,
    heroGrimoirePageMat,
    heroVisageMat,
  ];
  const textures = [
    basalt.map,
    basalt.roughnessMap,
    basalt.normalMap,
    stone.map,
    stone.normalMap,
    stone.roughnessMap,
    grimoireTex,
    illuminatedGrimoireTex,
    contact,
    filigree.normalMap,
    filigree.roughnessMap,
    brocade.normalMap,
    brocade.roughnessMap,
    chitin.normalMap,
    chitin.roughnessMap,
    volcanic.normalMap,
    volcanic.roughnessMap,
    sovereignBrocade.map,
    sovereignBrocade.normalMap,
    sovereignBrocade.roughnessMap,
    crimsonSilk.map,
    crimsonSilk.normalMap,
    crimsonSilk.roughnessMap,
    damascusSteel.normalMap,
    damascusSteel.roughnessMap,
    microScratch.normalMap,
    microScratch.roughnessMap,
    microScratch.clearcoatNormalMap,
    embossedLeather.normalMap,
    embossedLeather.roughnessMap,
    porcelainPair.normalMap,
    porcelainPair.roughnessMap,
    ivoryPair.normalMap,
    ivoryPair.roughnessMap,
    crystalPair.normalMap,
    crystalPair.roughnessMap,
    runePair.normalMap,
    runePair.roughnessMap,
  ];

  return {
    wetBasaltMat,
    pillarStoneMat,
    sanctumWallMat,
    bronzeMat,
    darkBronzeMat,
    goldMat,
    bluedSteelMat,
    crimsonArmorMat,
    emeraldArmorMat,
    obsidianClothMat,
    royalIndigoClothMat,
    agedLeatherMat,
    porcelainMaskMat,
    boneIvoryMat,
    fluoriteMat,
    runeEmissiveMat,
    etherCoreMat,
    chaosCoreMat,
    vitalAmberMat,
    venomGreenMat,
    flameEmissiveMat,
    cyanEyeMat,
    crimsonEyeMat,
    voidMat,
    sovereignVelvetMat,
    crimsonSilkMat,
    heroSteelPlateMat,
    heroGoldTrimMat,
    heroArcaneCrystalMat,
    heroGrimoirePageMat,
    heroVisageMat,
    contactTex: contact,
    grimoireTex,
    textures,
    setDetailLevel,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
