import * as THREE from 'three';
import { createRng } from '../../core/rng';

/**
 * Deterministic 2D Perlin Gradient Noise + Fractal Brownian Motion (FBM)
 * for procedural normal maps, roughness maps, and micro-relief textures.
 */
function buildPermutation(seed: number): Uint8Array {
  const rng = createRng(seed);
  const p = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  return p;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function grad2(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
}

export class Perlin2D {
  private readonly p: Uint8Array;

  constructor(seed: number) {
    this.p = buildPermutation(seed);
  }

  /** Returns noise in [-1, 1], periodic over `period` if period > 0 */
  sample(x: number, y: number, period = 0): number {
    let xi0 = Math.floor(x);
    let yi0 = Math.floor(y);
    const xf = x - xi0;
    const yf = y - yi0;

    let xi1 = xi0 + 1;
    let yi1 = yi0 + 1;

    if (period > 0) {
      xi0 = ((xi0 % period) + period) % period;
      yi0 = ((yi0 % period) + period) % period;
      xi1 = ((xi1 % period) + period) % period;
      yi1 = ((yi1 % period) + period) % period;
    }

    const X0 = xi0 & 255;
    const Y0 = yi0 & 255;
    const X1 = xi1 & 255;
    const Y1 = yi1 & 255;

    const u = fade(xf);
    const v = fade(yf);

    const aa = this.p[this.p[X0] + Y0];
    const ab = this.p[this.p[X0] + Y1];
    const ba = this.p[this.p[X1] + Y0];
    const bb = this.p[this.p[X1] + Y1];

    const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
    const x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.45;
  }

  /** Tileable multi-octave FBM in [0, 1] */
  fbmTiled(u: number, v: number, baseFreq: number, octaves = 4): number {
    let sum = 0;
    let amp = 0.5;
    let freq = baseFreq;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const period = Math.max(2, Math.round(freq));
      sum += amp * (this.sample(u * period, v * period, period) * 0.5 + 0.5);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / Math.max(1e-5, norm);
  }
}

/**
 * Converts a scalar heightfield Float32Array (size x size, values in [0, 1])
 * into a tangent-space normalMap CanvasTexture (linear NoColorSpace).
 */
export function heightfieldToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  maxAnisotropy: number,
  repeat = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const hL = heights[y * size + xm];
      const hR = heights[y * size + xp];
      const hD = heights[ym * size + x];
      const hU = heights[yp * size + x];

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const invLen = 1.0 / Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Converts an existing CanvasTexture (grayscale height/bump) + Perlin micro-relief
 * into a crisp tangent-space normalMap and optional roughnessMap.
 */
export function buildNormalMapFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  perlin: Perlin2D,
  options: {
    strength: number;
    noiseWeight: number;
    noiseFreq: number;
    maxAnisotropy: number;
    repeatX?: number;
    repeatY?: number;
  }
): THREE.CanvasTexture {
  const size = sourceCanvas.width;
  const srcCtx = sourceCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, size, size).data;
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;
      const baseH = srcData[idx] / 255;
      const n = perlin.fbmTiled(u, v, options.noiseFreq, 4);
      heights[y * size + x] = baseH * (1 - options.noiseWeight) + n * options.noiseWeight;
    }
  }

  const tex = heightfieldToNormalTexture(heights, size, options.strength, options.maxAnisotropy, 1);
  tex.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  return tex;
}

/**
 * Generates paired Perlin FBM normalMap + roughnessMap (linear NoColorSpace)
 * for materials that don't have a bespoke pattern canvas (porcelain, ivory, leather, crystal, etc.).
 */
export function createPerlinNormalRoughnessPair(
  seed: number,
  options: {
    size?: number;
    baseFreq?: number;
    octaves?: number;
    normalStrength?: number;
    roughMin?: number;
    roughMax?: number;
    repeat?: number;
    maxAnisotropy: number;
    streakX?: number;
  }
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = options.size ?? 256;
  const baseFreq = options.baseFreq ?? 6;
  const octaves = options.octaves ?? 4;
  const roughMin = options.roughMin ?? 0.25;
  const roughMax = options.roughMax ?? 0.78;
  const repeat = options.repeat ?? 2;
  const streakX = options.streakX ?? 1;

  const perlin = new Perlin2D(seed);
  const heights = new Float32Array(size * size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);
  const rData = rImg.data;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * streakX;
      const h = perlin.fbmTiled(u % 1, v, baseFreq, octaves);
      heights[y * size + x] = h;

      const rVal = Math.round((roughMin + (1 - h) * (roughMax - roughMin)) * 255);
      const idx = (y * size + x) * 4;
      rData[idx] = rVal;
      rData[idx + 1] = rVal;
      rData[idx + 2] = rVal;
      rData[idx + 3] = 255;
    }
  }
  rCtx.putImageData(rImg, 0, 0);

  const normalMap = heightfieldToNormalTexture(
    heights,
    size,
    options.normalStrength ?? 2.6,
    options.maxAnisotropy,
    repeat
  );

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeat, repeat);
  roughnessMap.anisotropy = options.maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Generates a procedural HDR-balanced Gothic Cathedral Equirectangular Environment Map
 * so PBR metals, wet basalt, and crystals reflect warm stained-glass amber + cool teal
 * clerestory light without relying on external .hdr files.
 */
export function createCathedralHdriEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x232038);

  const tempGeos: THREE.BufferGeometry[] = [];
  const tempMats: THREE.Material[] = [];

  // Full 360° luminous twilight hemisphere dome so PBR metals & cloth never reflect dead-black voids
  const domeGeo = new THREE.SphereGeometry(28, 24, 16);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 nadir = vec3(0.22, 0.17, 0.28);
        vec3 horizon = vec3(0.26, 0.30, 0.44);
        vec3 zenith = vec3(0.24, 0.22, 0.38);
        vec3 col = mix(nadir, horizon, smoothstep(0.0, 0.52, h));
        col = mix(col, zenith, smoothstep(0.52, 1.0, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  tempGeos.push(domeGeo);
  tempMats.push(domeMat);
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const addPanel = (
    color: number,
    intensity: number,
    pos: [number, number, number],
    look: [number, number, number],
    w: number,
    h: number
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    tempGeos.push(geo);
    tempMats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(...look);
    envScene.add(mesh);
  };

  // Balanced warm Rose/Oculus overhead panels (tamed so clearcoat floor avoids harsh hotspot)
  addPanel(0xffe0a6, 2.5, [0, 13, -4], [0, 0, 0], 12, 9);
  addPanel(0xf2ba63, 2.2, [9, 9, 4], [0, 0, 0], 8, 7);
  // Cool arcane teal clerestory panels on left & back
  addPanel(0x5ed6cb, 2.4, [-11, 7, -5], [0, 0, 0], 10, 7);
  addPanel(0x7d9fd4, 2.1, [-8, 6, 9], [0, 0, 0], 9, 6);
  // Camera-side soft skylight & warm bounce so player-facing bronze/cloth backs are cleanly lit
  addPanel(0x9bb8e6, 2.2, [0, 6.5, 13], [0, 0, 0], 14, 8);
  addPanel(0xd9b382, 1.6, [9, 4.5, 11], [0, 0, 0], 8, 6);
  // Subtle crimson-amber ember + lower stone bounce
  addPanel(0xb55936, 1.8, [10, 2.2, -7], [0, 1, 0], 7, 4);
  addPanel(0x4c3f5e, 1.7, [0, -6, 0], [0, 0, 0], 26, 26);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  tempGeos.forEach((g) => g.dispose());
  tempMats.forEach((m) => m.dispose());

  return envRt.texture;
}

/**
 * Generates crossed-plane sanctuary grass/thorn-fern tuft textures:
 * - map (sRGB RGBA with crisp organic blades for alphaTest = 0.5)
 * - normalMap (tangent-space blade curvature + Perlin fiber relief)
 * - roughnessMap (waxy blade sheen variation)
 */
export function createFoliageAlphaTextures(
  maxAnisotropy: number,
  seed: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const rng = createRng(seed + 919);
  const perlin = new Perlin2D(seed + 920);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  cCtx.clearRect(0, 0, size, size);

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;
  hCtx.fillStyle = '#404040';
  hCtx.fillRect(0, 0, size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#909090';
  rCtx.fillRect(0, 0, size, size);

  // Draw 11 overlapping tapering dark-emerald & moss-gold sanctuary blades
  for (let b = 0; b < 11; b++) {
    const baseX = size * (0.18 + (b / 10) * 0.64 + rng.range(-0.04, 0.04));
    const tipX = baseX + rng.range(-48, 48);
    const tipY = size * rng.range(0.08, 0.36);
    const ctrlX = (baseX + tipX) * 0.5 + rng.range(-24, 24);
    const ctrlY = size * rng.range(0.45, 0.72);
    const halfW = rng.range(8, 15);

    const grad = cCtx.createLinearGradient(baseX, size, tipX, tipY);
    grad.addColorStop(0, '#23382c');
    grad.addColorStop(0.55, '#3b634e');
    grad.addColorStop(0.88, '#5c8a66');
    grad.addColorStop(1, '#8ea364');

    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.moveTo(baseX - halfW, size);
    cCtx.quadraticCurveTo(ctrlX - halfW * 0.45, ctrlY, tipX, tipY);
    cCtx.quadraticCurveTo(ctrlX + halfW * 0.45, ctrlY, baseX + halfW, size);
    cCtx.closePath();
    cCtx.fill();

    // Central blade vein highlight on height & roughness
    hCtx.strokeStyle = '#d8d8d8';
    hCtx.lineWidth = 3;
    hCtx.beginPath();
    hCtx.moveTo(baseX, size);
    hCtx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    hCtx.stroke();

    rCtx.strokeStyle = '#606060';
    rCtx.lineWidth = 4;
    rCtx.beginPath();
    rCtx.moveTo(baseX, size);
    rCtx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    rCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const normalMap = buildNormalMapFromCanvas(heightCanvas, perlin, {
    strength: 3.0,
    noiseWeight: 0.25,
    noiseFreq: 10,
    maxAnisotropy,
  });

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}
