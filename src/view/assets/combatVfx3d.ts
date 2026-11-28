import * as THREE from 'three';
import { getGraphicsLevel, GRAPHICS_LEVEL } from '../../core/graphicsSettings';
import type { MagicSchool } from './creatureTotems';

export interface CombatVfx3dHandle {
  group: THREE.Group;
  setGraphicsLevel: (level: number) => void;
  spawnProjectileBeam: (from: THREE.Vector3, to: THREE.Vector3, school: MagicSchool, fast?: boolean) => void;
  spawnGroundShockwave: (pos: THREE.Vector3, school: MagicSchool, maxRadius?: number) => void;
  spawnWeaponSlash3D: (pos: THREE.Vector3, school: MagicSchool, yawAngle?: number, scale?: number) => void;
  spawnSummonPillar: (pos: THREE.Vector3, school: MagicSchool) => void;
  spawnCreatureVanish3D: (pos: THREE.Vector3, school: MagicSchool) => void;
  spawnBattleStart3D: (playerPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => void;
  spawnSpellNova3D: (pos: THREE.Vector3, school: MagicSchool, scale?: number) => void;
  spawnShatterBurst: (pos: THREE.Vector3, school: MagicSchool, count?: number) => void;
  spawnChronoAstrolabe3D: (pos: THREE.Vector3) => void;
  spawnSoulTetherArc3D: (from: THREE.Vector3, to: THREE.Vector3, school: MagicSchool) => void;
  spawnResonanceApotheosis3D: (archonPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => void;
  spawnPatternSigil3D: (pos: THREE.Vector3, pattern: 'triangle' | 'star' | 'circle' | 'decoy', school: MagicSchool) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

const SCHOOL_HEX: Record<MagicSchool, { main: number; hot: number }> = {
  kinet: { main: 0x62f2e4, hot: 0xdffffc },
  vital: { main: 0x79ea74, hot: 0xfff0aa },
  chaos: { main: 0xff6240, hot: 0xffe2a8 },
  synth: { main: 0xf4cc68, hot: 0xd0ecff },
};

interface ActiveEffect {
  life: number;
  maxLife: number;
  tick: (p: number, dt: number) => void;
  cleanup: () => void;
}

// Module-level scratch vectors to eliminate per-event/per-frame allocations
const _vTmpA = new THREE.Vector3();
const _vTmpB = new THREE.Vector3();
const _vTmpC = new THREE.Vector3();

export function buildCombatVfx3d(): CombatVfx3dHandle {
  const group = new THREE.Group();
  let currentLevel = getGraphicsLevel();

  // Shared base geometries (zero allocation per combat event)
  const orbGeo = new THREE.OctahedronGeometry(0.2, 1);
  const trailGeo = new THREE.OctahedronGeometry(0.1, 1);
  const ringGeo = new THREE.RingGeometry(0.42, 0.58, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const novaSigilGeo = new THREE.RingGeometry(0.54, 0.7, 6);
  novaSigilGeo.rotateX(-Math.PI / 2);
  const slashGeo = new THREE.TorusGeometry(0.8, 0.034, 6, 22, Math.PI * 0.9);
  const pillarGeo = new THREE.CylinderGeometry(0.42, 0.5, 2.2, 16, 1, true);
  const shardGeo = new THREE.OctahedronGeometry(0.09, 0);
  const clockDialGeo = new THREE.RingGeometry(0.62, 0.72, 24);
  clockDialGeo.rotateX(-Math.PI / 2);
  const tetherBeadGeo = new THREE.OctahedronGeometry(0.085, 0);
  const mandalaGeo = new THREE.RingGeometry(0.46, 0.52, 8);
  mandalaGeo.rotateX(-Math.PI / 2);
  const duelSealGeo = new THREE.TorusGeometry(1.05, 0.022, 6, 36);
  const duelInnerSealGeo = new THREE.TorusGeometry(0.66, 0.016, 6, 6);

  const effects: ActiveEffect[] = [];
  const matPool: THREE.MeshBasicMaterial[] = [];
  const meshPool: THREE.Mesh[] = [];

  const acquireAdditiveMat = (
    hex: number,
    opacity = 0.9,
    doubleSide = false
  ): THREE.MeshBasicMaterial => {
    const mat =
      matPool.pop() ??
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      });
    mat.color.setHex(hex);
    mat.opacity = opacity;
    const desiredSide = doubleSide ? THREE.DoubleSide : THREE.FrontSide;
    if (mat.side !== desiredSide) {
      mat.side = desiredSide;
      mat.needsUpdate = true;
    }
    return mat;
  };

  const releaseAdditiveMat = (mat: THREE.MeshBasicMaterial | null | undefined) => {
    if (!mat) return;
    if (matPool.length < 96) {
      matPool.push(mat);
    } else {
      mat.dispose();
    }
  };

  const acquireMesh = (geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh => {
    const mesh = meshPool.pop();
    if (mesh) {
      mesh.geometry = geo;
      mesh.material = mat;
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;
      return mesh;
    }
    return new THREE.Mesh(geo, mat);
  };

  const releaseMesh = (mesh: THREE.Mesh | null | undefined) => {
    if (!mesh) return;
    mesh.removeFromParent();
    if (meshPool.length < 128) {
      meshPool.push(mesh);
    }
  };

  const clearAll = () => {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].cleanup();
    }
    effects.length = 0;
  };

  const spawnGroundShockwave = (pos: THREE.Vector3, school: MagicSchool, maxRadius = 2.0) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const cols = SCHOOL_HEX[school];
    const outerMat = acquireAdditiveMat(cols.main, 0.88, true);
    const outerRing = acquireMesh(ringGeo, outerMat);
    outerRing.position.set(pos.x, 0.05, pos.z);
    group.add(outerRing);

    let innerRing: THREE.Mesh | null = null;
    let innerMat: THREE.MeshBasicMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = acquireAdditiveMat(cols.hot, 0.78, true);
      innerRing = acquireMesh(ringGeo, innerMat);
      innerRing.position.set(pos.x, 0.065, pos.z);
      group.add(innerRing);
    }

    effects.push({
      life: 0,
      maxLife: 0.56,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        const s = 0.25 + ease * maxRadius;
        outerRing.scale.setScalar(s);
        outerMat.opacity = 0.88 * (1 - p);
        if (innerRing && innerMat) {
          innerRing.scale.setScalar(0.18 + ease * (maxRadius * 0.72));
          innerMat.opacity = 0.78 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(outerRing);
        releaseAdditiveMat(outerMat);
        if (innerRing && innerMat) {
          releaseMesh(innerRing);
          releaseAdditiveMat(innerMat);
        }
      },
    });
  };

  const spawnProjectileBeam = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    school: MagicSchool,
    fast = false
  ) => {
    const pFrom = from.clone();
    const pTo = to.clone();
    const cols = SCHOOL_HEX[school];
    const headMat = acquireAdditiveMat(cols.hot, 0.95);
    const head = acquireMesh(orbGeo, headMat);
    head.position.copy(pFrom);
    group.add(head);

    let helixOrb: THREE.Mesh | null = null;
    let helixMat: THREE.MeshBasicMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      helixMat = acquireAdditiveMat(cols.main, 0.9);
      helixOrb = acquireMesh(shardGeo, helixMat);
      helixOrb.position.copy(pFrom);
      group.add(helixOrb);
    }

    const trails: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = [];
    const trailCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 5 : currentLevel >= GRAPHICS_LEVEL.high ? 3 : 1;
    for (let i = 0; i < trailCount; i++) {
      const tMat = acquireAdditiveMat(cols.main, 0.74 - i * 0.12);
      const tMesh = acquireMesh(trailGeo, tMat);
      tMesh.scale.setScalar(1.3 - i * 0.19);
      tMesh.position.copy(pFrom);
      group.add(tMesh);
      trails.push({ mesh: tMesh, mat: tMat });
    }

    const duration = fast ? 0.16 : 0.30;
    const evalPos = (u: number, out: THREE.Vector3) => {
      const clamped = Math.max(0, Math.min(1, u));
      out.lerpVectors(pFrom, pTo, clamped);
      out.y += Math.sin(clamped * Math.PI) * 1.15;
    };

    effects.push({
      life: 0,
      maxLife: duration,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        evalPos(ease, head.position);
        head.rotation.x += 0.25;
        head.rotation.y += 0.35;
        const fade = p > 0.85 ? (1 - p) / 0.15 : 1;
        headMat.opacity = 0.95 * fade;

        if (helixOrb && helixMat) {
          const spin = p * Math.PI * 6;
          helixOrb.position.set(
            head.position.x + Math.cos(spin) * 0.3,
            head.position.y + Math.sin(spin) * 0.3,
            head.position.z
          );
          helixOrb.rotation.y += 0.4;
          helixMat.opacity = 0.9 * fade;
        }

        for (let idx = 0; idx < trails.length; idx++) {
          const tr = trails[idx];
          evalPos(ease - (idx + 1) * 0.075, _vTmpA);
          tr.mesh.position.copy(_vTmpA);
          tr.mat.opacity = (0.74 - idx * 0.12) * fade;
        }

        if (p >= 1) {
          spawnGroundShockwave(pTo, school, 1.5);
        }
      },
      cleanup: () => {
        releaseMesh(head);
        releaseAdditiveMat(headMat);
        if (helixOrb && helixMat) {
          releaseMesh(helixOrb);
          releaseAdditiveMat(helixMat);
        }
        for (let i = 0; i < trails.length; i++) {
          releaseMesh(trails[i].mesh);
          releaseAdditiveMat(trails[i].mat);
        }
      },
    });
  };

  const spawnWeaponSlash3D = (pos: THREE.Vector3, school: MagicSchool, yawAngle = 0, scale = 1.0) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const cols = SCHOOL_HEX[school];

    const pivot = new THREE.Group();
    pivot.position.set(pos.x, pos.y + 0.15, pos.z);
    pivot.rotation.y = yawAngle;
    pivot.rotation.z = 0.48;
    pivot.rotation.x = Math.PI / 2 - 0.32;
    group.add(pivot);

    const outerMat = acquireAdditiveMat(cols.main, 0.92, true);
    const outerMesh = acquireMesh(slashGeo, outerMat);
    outerMesh.scale.setScalar(scale);
    pivot.add(outerMesh);

    let innerMesh: THREE.Mesh | null = null;
    let innerMat: THREE.MeshBasicMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = acquireAdditiveMat(cols.hot, 0.95, true);
      innerMesh = acquireMesh(slashGeo, innerMat);
      innerMesh.scale.setScalar(scale * 0.86);
      pivot.add(innerMesh);
    }

    effects.push({
      life: 0,
      maxLife: 0.34,
      tick: (p) => {
        const swing = -0.85 + p * 1.95;
        outerMesh.rotation.z = swing;
        outerMesh.scale.setScalar(scale * (0.88 + p * 0.42));
        outerMat.opacity = 0.92 * (1 - p);
        if (innerMesh && innerMat) {
          innerMesh.rotation.z = swing;
          innerMesh.scale.setScalar(scale * (0.78 + p * 0.36));
          innerMat.opacity = 0.95 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(outerMesh);
        releaseAdditiveMat(outerMat);
        if (innerMesh && innerMat) {
          releaseMesh(innerMesh);
          releaseAdditiveMat(innerMat);
        }
        group.remove(pivot);
      },
    });
  };

  /**
   * Upgraded Creature Appearance: spinning floor mandala, translucent vortex beam,
   * and counter-rotating ascending helical energy motes.
   */
  const spawnSummonPillar = (pos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const px = pos.x;
    const pz = pos.z;
    const cols = SCHOOL_HEX[school];

    const pilMat = acquireAdditiveMat(cols.main, 0.34, true);
    const pillar = acquireMesh(pillarGeo, pilMat);
    pillar.position.set(px, 1.1, pz);
    group.add(pillar);

    const mandalaMat = acquireAdditiveMat(cols.hot, 0.82, true);
    const mandala = acquireMesh(mandalaGeo, mandalaMat);
    mandala.position.set(px, 0.05, pz);
    group.add(mandala);

    const helixCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 8 : 4;
    const helixBeads: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; baseAng: number }> = [];
    for (let i = 0; i < helixCount; i++) {
      const mMat = acquireAdditiveMat(i % 2 === 0 ? cols.hot : cols.main, 0.9);
      const mMesh = acquireMesh(tetherBeadGeo, mMat);
      mMesh.scale.setScalar(0.8);
      group.add(mMesh);
      helixBeads.push({ mesh: mMesh, mat: mMat, baseAng: (i / helixCount) * Math.PI * 2 });
    }

    spawnGroundShockwave(pos, school, 1.85);

    effects.push({
      life: 0,
      maxLife: 0.56,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        const s = 1.05 - p * 0.62;
        pillar.scale.set(s, 0.68 + p * 0.78, s);
        pillar.rotation.y = p * 3.5;
        pilMat.opacity = 0.34 * (1 - p);

        mandala.scale.setScalar(0.55 + ease * 1.15);
        mandala.rotation.y = -p * Math.PI * 2.2;
        mandalaMat.opacity = 0.82 * (1 - p);

        for (let i = 0; i < helixBeads.length; i++) {
          const hb = helixBeads[i];
          const dir = i % 2 === 0 ? 1 : -1;
          const ang = hb.baseAng + dir * p * Math.PI * 3.2;
          const rad = 0.58 * (1 - p * 0.55);
          hb.mesh.position.set(
            px + Math.cos(ang) * rad,
            0.08 + ease * 1.75,
            pz + Math.sin(ang) * rad
          );
          hb.mesh.rotation.x += 0.2;
          hb.mesh.rotation.y += 0.25;
          hb.mat.opacity = 0.9 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(pillar);
        releaseAdditiveMat(pilMat);
        releaseMesh(mandala);
        releaseAdditiveMat(mandalaMat);
        for (let i = 0; i < helixBeads.length; i++) {
          releaseMesh(helixBeads[i].mesh);
          releaseAdditiveMat(helixBeads[i].mat);
        }
      },
    });
  };

  /**
   * Dedicated Creature Vanish (Death) VFX: banish mandala implosion, ascending
   * soul-ash spirit vortex, and crystalline shatter burst.
   */
  const spawnCreatureVanish3D = (pos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const px = pos.x;
    const pz = pos.z;
    const cols = SCHOOL_HEX[school];

    // Imploding banish sigil
    const sigilMat = acquireAdditiveMat(cols.main, 0.85, true);
    const sigil = acquireMesh(novaSigilGeo, sigilMat);
    sigil.position.set(px, 0.06, pz);
    group.add(sigil);

    // Ascending spirit wisps + outward shards
    const wispCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 10 : currentLevel >= GRAPHICS_LEVEL.high ? 6 : 4;
    const wisps: Array<{
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      ang0: number;
      rad0: number;
      speedY: number;
      spinDir: number;
    }> = [];
    for (let i = 0; i < wispCount; i++) {
      const wMat = acquireAdditiveMat(i % 2 === 0 ? cols.hot : cols.main, 0.92);
      const wMesh = acquireMesh(shardGeo, wMat);
      wMesh.scale.setScalar(0.55 + (i % 3) * 0.25);
      group.add(wMesh);
      wisps.push({
        mesh: wMesh,
        mat: wMat,
        ang0: (i / wispCount) * Math.PI * 2,
        rad0: 0.24 + (i % 2) * 0.22,
        speedY: 1.55 + (i % 3) * 0.45,
        spinDir: i % 2 === 0 ? 1 : -1,
      });
    }

    if (currentLevel >= GRAPHICS_LEVEL.high) {
      spawnShatterBurst(pos, school, currentLevel >= GRAPHICS_LEVEL.ultra ? 10 : 6);
    }

    effects.push({
      life: 0,
      maxLife: 0.72,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        // Sigil contracts inward as spirit leaves, then vanishes
        const sigilScale = Math.max(0.05, 1.35 * (1 - ease * 0.85));
        sigil.scale.setScalar(sigilScale);
        sigil.rotation.y = p * Math.PI * 2.5;
        sigilMat.opacity = 0.85 * (1 - p);

        for (let i = 0; i < wisps.length; i++) {
          const w = wisps[i];
          const ang = w.ang0 + w.spinDir * p * Math.PI * 2.8;
          const r = w.rad0 * (1 + Math.sin(p * Math.PI) * 0.55) * (1 - p * 0.35);
          w.mesh.position.set(
            px + Math.cos(ang) * r,
            0.2 + p * w.speedY,
            pz + Math.sin(ang) * r
          );
          w.mesh.rotation.x += 0.18;
          w.mesh.rotation.y += 0.22;
          w.mesh.scale.setScalar((0.65 + (1 - p) * 0.35) * (1 - p * 0.45));
          w.mat.opacity = 0.92 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(sigil);
        releaseAdditiveMat(sigilMat);
        for (let i = 0; i < wisps.length; i++) {
          releaseMesh(wisps[i].mesh);
          releaseAdditiveMat(wisps[i].mat);
        }
      },
    });
  };

  /**
   * Battle Start Opening Ritual: twin convergent arcane arcs from both Archons' staves
   * igniting a spinning central Cathedral Duel Seal + arena shockwave + rising sparks.
   */
  const spawnBattleStart3D = (playerPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const pFrom = playerPos.clone();
    const eFrom = enemyPos.clone();
    _vTmpC.set(0, 1.45, 0);
    const cols = SCHOOL_HEX[school];

    // Twin convergent ignition bolts toward the center
    spawnProjectileBeam(pFrom, _vTmpC, school, false);
    spawnProjectileBeam(eFrom, _vTmpC, 'chaos', false);

    // Central spinning Cathedral Duel Seal
    const outerMat = acquireAdditiveMat(cols.main, 0.72, true);
    const outerSeal = acquireMesh(duelSealGeo, outerMat);
    outerSeal.position.set(0, 1.35, 0);
    outerSeal.rotation.x = Math.PI / 2;
    group.add(outerSeal);

    const innerMat = acquireAdditiveMat(0xf4cc68, 0.74, true);
    const innerSeal = acquireMesh(duelInnerSealGeo, innerMat);
    innerSeal.position.set(0, 1.35, 0);
    innerSeal.rotation.x = Math.PI / 2;
    group.add(innerSeal);

    const hexMat = acquireAdditiveMat(cols.main, 0.62, true);
    const hexFloor = acquireMesh(mandalaGeo, hexMat);
    hexFloor.position.set(0, 0.06, 0);
    group.add(hexFloor);

    const flareCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 12 : 6;
    const flares: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; ang: number }> = [];
    for (let i = 0; i < flareCount; i++) {
      const fMat = acquireAdditiveMat(i % 2 === 0 ? cols.hot : 0xf4cc68, 0.9);
      const fMesh = acquireMesh(shardGeo, fMat);
      fMesh.scale.setScalar(0.85);
      group.add(fMesh);
      flares.push({ mesh: fMesh, mat: fMat, ang: (i / flareCount) * Math.PI * 2 });
    }

    spawnGroundShockwave(_vTmpB.set(0, 0.05, 0), school, 5.2);

    effects.push({
      life: 0,
      maxLife: 1.05,
      tick: (p) => {
        const ignition = Math.min(1, p / 0.28);
        const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
        const ease = 1 - (1 - p) * (1 - p);

        const ringScale = 0.35 + ignition * 1.1 + ease * 0.45;
        outerSeal.scale.setScalar(ringScale);
        outerSeal.rotation.z = p * Math.PI * 2.2;
        outerMat.opacity = 0.92 * ignition * fade;

        innerSeal.scale.setScalar(ringScale * 0.92);
        innerSeal.rotation.z = -p * Math.PI * 3.1;
        innerMat.opacity = 0.88 * ignition * fade;

        hexFloor.scale.setScalar(0.8 + ease * 4.4);
        hexFloor.rotation.y = p * Math.PI * 1.4;
        hexMat.opacity = 0.82 * (1 - p);

        for (let i = 0; i < flares.length; i++) {
          const fl = flares[i];
          const a = fl.ang + p * Math.PI * 1.6;
          const rad = 0.4 + ease * 3.6;
          fl.mesh.position.set(
            Math.cos(a) * rad,
            1.35 + Math.sin(p * Math.PI) * 1.1 + (i % 3) * 0.25,
            Math.sin(a) * rad
          );
          fl.mesh.rotation.x += 0.2;
          fl.mesh.rotation.y += 0.25;
          fl.mat.opacity = 0.9 * ignition * fade;
        }
      },
      cleanup: () => {
        releaseMesh(outerSeal);
        releaseAdditiveMat(outerMat);
        releaseMesh(innerSeal);
        releaseAdditiveMat(innerMat);
        releaseMesh(hexFloor);
        releaseAdditiveMat(hexMat);
        for (let i = 0; i < flares.length; i++) {
          releaseMesh(flares[i].mesh);
          releaseAdditiveMat(flares[i].mat);
        }
      },
    });
  };

  const spawnSpellNova3D = (pos: THREE.Vector3, school: MagicSchool, scale = 1.0) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const cols = SCHOOL_HEX[school];
    const outerMat = acquireAdditiveMat(cols.main, 0.88, true);
    const outerSigil = acquireMesh(novaSigilGeo, outerMat);
    outerSigil.position.set(pos.x, Math.max(0.18, pos.y * 0.65), pos.z);
    group.add(outerSigil);

    let innerSigil: THREE.Mesh | null = null;
    let innerMat: THREE.MeshBasicMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = acquireAdditiveMat(cols.hot, 0.84, true);
      innerSigil = acquireMesh(novaSigilGeo, innerMat);
      innerSigil.position.set(pos.x, Math.max(0.24, pos.y * 0.65 + 0.08), pos.z);
      innerSigil.rotation.y = Math.PI / 6;
      group.add(innerSigil);
    }

    effects.push({
      life: 0,
      maxLife: 0.58,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        const s = (0.45 + ease * 1.45) * scale;
        outerSigil.scale.setScalar(s);
        outerSigil.rotation.y = p * 2.4;
        outerSigil.position.y += 0.008;
        outerMat.opacity = 0.88 * (1 - p);
        if (innerSigil && innerMat) {
          innerSigil.scale.setScalar(s * 0.72);
          innerSigil.rotation.y = Math.PI / 6 - p * 3.1;
          innerSigil.position.y += 0.014;
          innerMat.opacity = 0.84 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(outerSigil);
        releaseAdditiveMat(outerMat);
        if (innerSigil && innerMat) {
          releaseMesh(innerSigil);
          releaseAdditiveMat(innerMat);
        }
      },
    });
  };

  const spawnShatterBurst = (pos: THREE.Vector3, school: MagicSchool, count = 10) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const cols = SCHOOL_HEX[school];
    const shardCount = currentLevel >= GRAPHICS_LEVEL.ultra ? count : Math.max(5, Math.floor(count * 0.55));
    const shards: Array<{
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      vx: number;
      vy: number;
      vz: number;
      rx: number;
      ry: number;
    }> = [];

    for (let i = 0; i < shardCount; i++) {
      const ang = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const spd = 1.6 + Math.random() * 2.4;
      const mat = acquireAdditiveMat(i % 2 === 0 ? cols.main : cols.hot, 0.9);
      const mesh = acquireMesh(shardGeo, mat);
      mesh.position.set(pos.x, pos.y + 0.55, pos.z);
      mesh.scale.setScalar(0.65 + Math.random() * 0.65);
      group.add(mesh);
      shards.push({
        mesh,
        mat,
        vx: Math.cos(ang) * spd,
        vy: 2.2 + Math.random() * 2.6,
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 10,
        ry: (Math.random() - 0.5) * 10,
      });
    }

    spawnGroundShockwave(pos, school, 1.6);

    effects.push({
      life: 0,
      maxLife: 0.68,
      tick: (p, dt) => {
        for (let i = 0; i < shards.length; i++) {
          const sh = shards[i];
          sh.vy -= 9.5 * dt;
          sh.mesh.position.x += sh.vx * dt;
          sh.mesh.position.y = Math.max(0.05, sh.mesh.position.y + sh.vy * dt);
          sh.mesh.position.z += sh.vz * dt;
          sh.mesh.rotation.x += sh.rx * dt;
          sh.mesh.rotation.y += sh.ry * dt;
          sh.mat.opacity = 0.9 * (1 - p);
        }
      },
      cleanup: () => {
        for (let i = 0; i < shards.length; i++) {
          releaseMesh(shards[i].mesh);
          releaseAdditiveMat(shards[i].mat);
        }
      },
    });
  };

  const spawnChronoAstrolabe3D = (pos: THREE.Vector3) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const px = pos.x;
    const pz = pos.z;
    const outerMat = acquireAdditiveMat(0xf4cc68, 0.9, true);
    const innerMat = acquireAdditiveMat(0x62f2e4, 0.85, true);
    const outerDial = acquireMesh(clockDialGeo, outerMat);
    outerDial.position.set(px, 0.12, pz);
    group.add(outerDial);

    const innerDial = acquireMesh(novaSigilGeo, innerMat);
    innerDial.position.set(px, 0.16, pz);
    group.add(innerDial);

    const motes: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; baseAng: number; radius: number }> = [];
    const moteCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 8 : 4;
    for (let i = 0; i < moteCount; i++) {
      const mMat = acquireAdditiveMat(i % 2 === 0 ? 0xf4cc68 : 0x62f2e4, 0.88);
      const mMesh = acquireMesh(shardGeo, mMat);
      mMesh.scale.setScalar(0.65);
      const ang = (i / moteCount) * Math.PI * 2;
      mMesh.position.set(px + Math.cos(ang) * 0.7, 0.15, pz + Math.sin(ang) * 0.7);
      group.add(mMesh);
      motes.push({ mesh: mMesh, mat: mMat, baseAng: ang, radius: 0.65 + (i % 2) * 0.22 });
    }

    effects.push({
      life: 0,
      maxLife: 0.78,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        outerDial.rotation.y = -p * Math.PI * 2.5;
        outerDial.scale.setScalar(0.75 + ease * 0.85);
        outerDial.position.y = 0.12 + p * 0.38;
        outerMat.opacity = 0.9 * (1 - p);

        innerDial.rotation.y = p * Math.PI * 3.2;
        innerDial.scale.setScalar(0.6 + ease * 0.7);
        innerDial.position.y = 0.16 + p * 0.55;
        innerMat.opacity = 0.85 * (1 - p);

        for (let i = 0; i < motes.length; i++) {
          const mt = motes[i];
          const ang = mt.baseAng - p * Math.PI * 3.0;
          mt.mesh.position.set(
            px + Math.cos(ang) * mt.radius * (1 - p * 0.35),
            0.15 + p * 1.45,
            pz + Math.sin(ang) * mt.radius * (1 - p * 0.35)
          );
          mt.mesh.rotation.y += 0.2;
          mt.mat.opacity = 0.88 * (1 - p);
        }
      },
      cleanup: () => {
        releaseMesh(outerDial);
        releaseMesh(innerDial);
        releaseAdditiveMat(outerMat);
        releaseAdditiveMat(innerMat);
        for (let i = 0; i < motes.length; i++) {
          releaseMesh(motes[i].mesh);
          releaseAdditiveMat(motes[i].mat);
        }
      },
    });
  };

  const spawnSoulTetherArc3D = (from: THREE.Vector3, to: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const pFrom = from.clone();
    const pTo = to.clone();
    const cols = SCHOOL_HEX[school];
    const beadCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 11 : currentLevel >= GRAPHICS_LEVEL.high ? 7 : 4;
    const beads: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number }> = [];
    for (let i = 0; i < beadCount; i++) {
      const t = i / Math.max(1, beadCount - 1);
      const bMat = acquireAdditiveMat(i % 2 === 0 ? cols.main : cols.hot, 0.9);
      const bMesh = acquireMesh(tetherBeadGeo, bMat);
      bMesh.scale.setScalar(i === 0 || i === beadCount - 1 ? 1.25 : 0.72);
      group.add(bMesh);
      beads.push({ mesh: bMesh, mat: bMat, t });
    }

    effects.push({
      life: 0,
      maxLife: 0.62,
      tick: (p) => {
        const pulse = Math.sin(p * Math.PI);
        for (let i = 0; i < beads.length; i++) {
          const b = beads[i];
          const u = Math.min(1, b.t * Math.min(1, p * 2.1));
          b.mesh.position.lerpVectors(pFrom, pTo, u);
          b.mesh.position.y += Math.sin(u * Math.PI) * 0.92;
          b.mesh.rotation.x += 0.18;
          b.mesh.rotation.y += 0.22;
          b.mat.opacity = (0.35 + 0.65 * pulse) * (1 - Math.max(0, (p - 0.65) / 0.35));
        }
      },
      cleanup: () => {
        for (let i = 0; i < beads.length; i++) {
          releaseMesh(beads[i].mesh);
          releaseAdditiveMat(beads[i].mat);
        }
      },
    });
  };

  const spawnResonanceApotheosis3D = (archonPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const pArchon = archonPos.clone();
    const pEnemy = enemyPos.clone();
    spawnSummonPillar(_vTmpA.set(pArchon.x, 0.05, pArchon.z), school);
    spawnSpellNova3D(_vTmpA.set(pArchon.x, 0.1, pArchon.z), school, 2.05);
    spawnGroundShockwave(_vTmpA.set(0, 0.06, 0), school, 4.4);
    if (school === 'chaos' || school === 'synth' || school === 'kinet') {
      spawnProjectileBeam(pArchon, pEnemy, school, false);
      if (currentLevel >= GRAPHICS_LEVEL.high) {
        spawnSpellNova3D(_vTmpA.set(pEnemy.x, 0.12, pEnemy.z), school, 1.85);
      }
    }
    if (school === 'vital') {
      spawnSpellNova3D(_vTmpA.set(0, 0.12, 1.75), 'vital', 2.2);
    }
  };

  const spawnPatternSigil3D = (
    pos: THREE.Vector3,
    pattern: 'triangle' | 'star' | 'circle' | 'decoy',
    school: MagicSchool
  ) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    if (pattern === 'triangle') {
      spawnSpellNova3D(pos, school, 1.45);
      spawnWeaponSlash3D(pos, school, 0, 1.15);
    } else if (pattern === 'star') {
      spawnSummonPillar(pos, school);
      spawnSpellNova3D(pos, school, 1.75);
    } else if (pattern === 'circle') {
      spawnGroundShockwave(pos, school, 2.3);
      spawnSpellNova3D(pos, 'vital', 1.4);
    } else {
      spawnChronoAstrolabe3D(pos);
      spawnGroundShockwave(pos, school, 1.7);
    }
  };

  return {
    group,
    setGraphicsLevel: (level: number) => {
      currentLevel = level;
      if (level <= GRAPHICS_LEVEL.low) {
        clearAll();
      }
    },
    spawnProjectileBeam,
    spawnGroundShockwave,
    spawnWeaponSlash3D,
    spawnSummonPillar,
    spawnCreatureVanish3D,
    spawnBattleStart3D,
    spawnSpellNova3D,
    spawnShatterBurst,
    spawnChronoAstrolabe3D,
    spawnSoulTetherArc3D,
    spawnResonanceApotheosis3D,
    spawnPatternSigil3D,
    update: (dt: number) => {
      const safeDt = Math.min(dt, 0.05);
      for (let i = effects.length - 1; i >= 0; i--) {
        const ef = effects[i];
        ef.life += safeDt;
        const p = Math.min(1, ef.life / ef.maxLife);
        ef.tick(p, safeDt);
        if (p >= 1) {
          ef.cleanup();
          effects.splice(i, 1);
        }
      }
    },
    dispose: () => {
      clearAll();
      matPool.forEach((m) => m.dispose());
      matPool.length = 0;
      meshPool.length = 0;
      orbGeo.dispose();
      trailGeo.dispose();
      ringGeo.dispose();
      novaSigilGeo.dispose();
      slashGeo.dispose();
      pillarGeo.dispose();
      shardGeo.dispose();
      clockDialGeo.dispose();
      tetherBeadGeo.dispose();
      mandalaGeo.dispose();
      duelSealGeo.dispose();
      duelInnerSealGeo.dispose();
    },
  };
}
