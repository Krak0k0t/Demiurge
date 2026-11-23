import * as THREE from 'three';
import { createRng } from '../../core/rng';
import { TAROT_PALETTE } from '../materials/tarotMaterials';
import { getGraphicsLevel, GRAPHICS_LEVEL } from '../../core/graphicsSettings';
import type { MagicSchool } from './creatureTotems';

export interface EtherVfxHandle {
  group: THREE.Group;
  setOverload: (active: boolean) => void;
  setSchoolTheme: (school: MagicSchool) => void;
  setGraphicsLevel: (level: number) => void;
  update: (time: number) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();

const SCHOOL_VFX_COLORS: Record<MagicSchool, { primary: number; spark: number }> = {
  kinet: { primary: 0x6ce8dc, spark: 0x9ef7ee },
  vital: { primary: 0x86e07b, spark: 0xd9e874 },
  chaos: { primary: 0xf26444, spark: 0xffa65c },
  synth: { primary: 0xf5cf76, spark: 0x9ec8f0 },
};

export function buildEtherVfx(seed: number): EtherVfxHandle {
  const group = new THREE.Group();
  const rng = createRng(seed);

  // 1. Slowly Drifting Sanctuary Dust Motes Across the Arena (themed per stage school)
  const moteCount = 180;
  const moteGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(moteCount * 3);
  const aPhase = new Float32Array(moteCount);
  const aSpeed = new Float32Array(moteCount);
  const aSize = new Float32Array(moteCount);
  const aTint = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    const x = rng.range(-10.5, 10.5);
    const y = rng.range(0.15, 8.8);
    const z = rng.range(-11.2, 8.8);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    aPhase[i] = rng.range(0, Math.PI * 2);
    aSpeed[i] = rng.range(0.14, 0.36);
    aSize[i] = rng.range(10, 26);
    aTint[i] = rng.range(0, 1);
  }

  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  moteGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  moteGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  moteGeo.setAttribute('aTint', new THREE.BufferAttribute(aTint, 1));

  const moteMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOverload: { value: 0 },
      uThemeColor: { value: new THREE.Color(0x6ce8dc) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      attribute float aTint;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec3 p = position;
        float t = uTime * aSpeed + aPhase;
        float rise = mod(p.y + uTime * (0.14 + aSpeed * 0.35), 8.85) + 0.15;
        p.y = rise;
        p.x += sin(t * 0.9) * 0.55 + cos(t * 0.45) * 0.25;
        p.z += cos(t * 0.8 + aPhase) * 0.55;

        float fadeY = smoothstep(0.15, 1.1, rise) * smoothstep(9.0, 7.0, rise);
        float twinkle = 0.45 + 0.55 * sin(uTime * 1.45 + aPhase * 3.0);
        float rayBoost = 1.0 + 0.45 * exp(-((p.x * p.x) + (p.z + 1.0) * (p.z + 1.0)) * 0.045);

        vAlpha = fadeY * twinkle * 0.72 * rayBoost;
        vTint = aTint;

        vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(aSize * (10.0 / max(1.0, -mvPos.z)), 2.0, 11.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uOverload;
      uniform vec3 uThemeColor;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.04, d);
        glow = glow * glow;

        vec3 paleGold = vec3(1.0, 0.90, 0.62);
        vec3 crimsonSpark = vec3(0.95, 0.36, 0.22);
        vec3 baseCol = mix(uThemeColor, paleGold, vTint * 0.55);
        vec3 finalCol = mix(baseCol, crimsonSpark, uOverload * 0.6);

        gl_FragColor = vec4(finalCol, glow * vAlpha);
      }
    `,
  });

  const dustPoints = new THREE.Points(moteGeo, moteMat);
  dustPoints.frustumCulled = false;
  dustPoints.renderOrder = 3;
  group.add(dustPoints);

  // 2. Slowly Rising School Sparks Across the Arena (InstancedMesh)
  const sparkCount = 42;
  const sparkGeo = new THREE.OctahedronGeometry(0.036, 0);
  const sparkMat = new THREE.MeshStandardMaterial({
    color: 0xe6b655,
    emissive: 0xe6b655,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
    opacity: 0.65,
  });
  const sparks = new THREE.InstancedMesh(sparkGeo, sparkMat, sparkCount);
  sparks.frustumCulled = false;

  const baseX = new Float32Array(sparkCount);
  const baseZ = new Float32Array(sparkCount);
  const speeds = new Float32Array(sparkCount);
  const offsets = new Float32Array(sparkCount);

  for (let i = 0; i < sparkCount; i++) {
    baseX[i] = rng.range(-9.0, 9.0);
    baseZ[i] = rng.range(-9.5, 7.5);
    speeds[i] = rng.range(0.18, 0.42);
    offsets[i] = rng.range(0, 1);
  }
  group.add(sparks);

  let overloadActive = false;
  let currentSchool: MagicSchool = 'kinet';
  let activeSparkCount = sparkCount;
  let currentLevel = getGraphicsLevel();

  const applyGraphicsLevel = (level: number) => {
    currentLevel = level;
    if (level < GRAPHICS_LEVEL.high) {
      group.visible = false;
      activeSparkCount = 0;
      sparks.count = 0;
      moteGeo.setDrawRange(0, 0);
      return;
    }
    group.visible = true;
    if (level === GRAPHICS_LEVEL.high) {
      activeSparkCount = 14;
      sparks.count = 14;
      moteGeo.setDrawRange(0, 72);
    } else {
      activeSparkCount = sparkCount;
      sparks.count = sparkCount;
      moteGeo.setDrawRange(0, moteCount);
    }
  };
  applyGraphicsLevel(currentLevel);

  return {
    group,
    setOverload: (active: boolean) => {
      overloadActive = active;
      moteMat.uniforms.uOverload.value = active ? 1.0 : 0.0;
      const hex = active ? TAROT_PALETTE.overload : SCHOOL_VFX_COLORS[currentSchool].spark;
      sparkMat.color.setHex(hex);
      sparkMat.emissive.setHex(hex);
      sparkMat.opacity = active ? 0.72 : 0.65;
    },
    setSchoolTheme: (school: MagicSchool) => {
      currentSchool = school;
      const theme = SCHOOL_VFX_COLORS[school];
      (moteMat.uniforms.uThemeColor.value as THREE.Color).setHex(theme.primary);
      if (!overloadActive) {
        sparkMat.color.setHex(theme.spark);
        sparkMat.emissive.setHex(theme.spark);
      }
    },
    setGraphicsLevel: applyGraphicsLevel,
    update: (time: number) => {
      if (currentLevel < GRAPHICS_LEVEL.high) return;

      moteMat.uniforms.uTime.value = time;

      const speedMult = overloadActive ? 1.55 : 1.0;
      for (let i = 0; i < activeSparkCount; i++) {
        const life = (time * speeds[i] * speedMult * 0.2 + offsets[i]) % 1;
        const driftX = Math.sin(time * 0.42 + i * 1.3) * 0.55;
        const driftZ = Math.cos(time * 0.36 + i * 0.9) * 0.55;
        _dummy.position.set(baseX[i] + driftX, 0.25 + life * 5.8, baseZ[i] + driftZ);
        const s = (1 - Math.abs(life * 2 - 1)) * 0.95;
        _dummy.scale.setScalar(Math.max(0.06, s));
        _dummy.rotation.set(time * 0.8 + i, time * 0.5, 0);
        _dummy.updateMatrix();
        sparks.setMatrixAt(i, _dummy.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      moteGeo.dispose();
      moteMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}
