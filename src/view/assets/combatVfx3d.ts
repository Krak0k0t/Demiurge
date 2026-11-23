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
  spawnSpellNova3D: (pos: THREE.Vector3, school: MagicSchool, scale?: number) => void;
  spawnShatterBurst: (pos: THREE.Vector3, school: MagicSchool, count?: number) => void;
  spawnChronoAstrolabe3D: (pos: THREE.Vector3) => void;
  spawnSoulTetherArc3D: (from: THREE.Vector3, to: THREE.Vector3, school: MagicSchool) => void;
  spawnResonanceApotheosis3D: (archonPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => void;
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
  const pillarGeo = new THREE.CylinderGeometry(0.4, 0.48, 2.1, 16, 1, true);
  const shardGeo = new THREE.OctahedronGeometry(0.09, 0);
  const clockDialGeo = new THREE.RingGeometry(0.62, 0.72, 24);
  clockDialGeo.rotateX(-Math.PI / 2);
  const tetherBeadGeo = new THREE.OctahedronGeometry(0.085, 0);

  const effects: ActiveEffect[] = [];

  const makeAdditiveMat = (hex: number, opacity = 0.9, doubleSide = false) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: 1.45,
      roughness: 0.22,
      metalness: 0.0,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    });

  const clearAll = () => {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].cleanup();
    }
    effects.length = 0;
  };

  const spawnGroundShockwave = (pos: THREE.Vector3, school: MagicSchool, maxRadius = 2.0) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const cols = SCHOOL_HEX[school];
    const outerMat = makeAdditiveMat(cols.main, 0.88, true);
    const outerRing = new THREE.Mesh(ringGeo, outerMat);
    outerRing.position.set(pos.x, 0.05, pos.z);
    group.add(outerRing);

    let innerRing: THREE.Mesh | null = null;
    let innerMat: THREE.MeshStandardMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = makeAdditiveMat(cols.hot, 0.78, true);
      innerRing = new THREE.Mesh(ringGeo, innerMat);
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
        group.remove(outerRing);
        outerMat.dispose();
        if (innerRing && innerMat) {
          group.remove(innerRing);
          innerMat.dispose();
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
    const cols = SCHOOL_HEX[school];
    const headMat = makeAdditiveMat(cols.hot, 0.95);
    const head = new THREE.Mesh(orbGeo, headMat);
    head.position.copy(from);
    group.add(head);

    let helixOrb: THREE.Mesh | null = null;
    let helixMat: THREE.MeshStandardMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      helixMat = makeAdditiveMat(cols.main, 0.9);
      helixOrb = new THREE.Mesh(shardGeo, helixMat);
      helixOrb.position.copy(from);
      group.add(helixOrb);
    }

    const trails: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = [];
    const trailCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 5 : currentLevel >= GRAPHICS_LEVEL.high ? 3 : 1;
    for (let i = 0; i < trailCount; i++) {
      const tMat = makeAdditiveMat(cols.main, 0.74 - i * 0.12);
      const tMesh = new THREE.Mesh(trailGeo, tMat);
      tMesh.scale.setScalar(1.3 - i * 0.19);
      tMesh.position.copy(from);
      group.add(tMesh);
      trails.push({ mesh: tMesh, mat: tMat });
    }

    const duration = fast ? 0.16 : 0.30;
    const evalPos = (u: number, out: THREE.Vector3) => {
      const clamped = Math.max(0, Math.min(1, u));
      out.lerpVectors(from, to, clamped);
      out.y += Math.sin(clamped * Math.PI) * 1.15;
    };

    const tmp = new THREE.Vector3();
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

        trails.forEach((tr, idx) => {
          evalPos(ease - (idx + 1) * 0.075, tmp);
          tr.mesh.position.copy(tmp);
          tr.mat.opacity = (0.74 - idx * 0.12) * fade;
        });

        if (p >= 1) {
          spawnGroundShockwave(to, school, 1.5);
        }
      },
      cleanup: () => {
        group.remove(head);
        headMat.dispose();
        if (helixOrb && helixMat) {
          group.remove(helixOrb);
          helixMat.dispose();
        }
        trails.forEach((t) => {
          group.remove(t.mesh);
          t.mat.dispose();
        });
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

    const outerMat = makeAdditiveMat(cols.main, 0.92, true);
    const outerMesh = new THREE.Mesh(slashGeo, outerMat);
    outerMesh.scale.setScalar(scale);
    pivot.add(outerMesh);

    let innerMesh: THREE.Mesh | null = null;
    let innerMat: THREE.MeshStandardMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = makeAdditiveMat(cols.hot, 0.95, true);
      innerMesh = new THREE.Mesh(slashGeo, innerMat);
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
        group.remove(pivot);
        outerMat.dispose();
        if (innerMat) innerMat.dispose();
      },
    });
  };

  const spawnSummonPillar = (pos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const cols = SCHOOL_HEX[school];
    const pilMat = makeAdditiveMat(cols.main, 0.28, true);
    const pillar = new THREE.Mesh(pillarGeo, pilMat);
    pillar.position.set(pos.x, 1.05, pos.z);
    group.add(pillar);

    spawnGroundShockwave(pos, school, 1.65);

    effects.push({
      life: 0,
      maxLife: 0.38,
      tick: (p) => {
        const s = 1 - p * 0.55;
        pillar.scale.set(s, 0.75 + p * 0.65, s);
        pilMat.opacity = 0.28 * (1 - p);
      },
      cleanup: () => {
        group.remove(pillar);
        pilMat.dispose();
      },
    });
  };

  const spawnSpellNova3D = (pos: THREE.Vector3, school: MagicSchool, scale = 1.0) => {
    if (currentLevel < GRAPHICS_LEVEL.high) return;
    const cols = SCHOOL_HEX[school];
    const outerMat = makeAdditiveMat(cols.main, 0.88, true);
    const outerSigil = new THREE.Mesh(novaSigilGeo, outerMat);
    outerSigil.position.set(pos.x, Math.max(0.18, pos.y * 0.65), pos.z);
    group.add(outerSigil);

    let innerSigil: THREE.Mesh | null = null;
    let innerMat: THREE.MeshStandardMaterial | null = null;
    if (currentLevel >= GRAPHICS_LEVEL.ultra) {
      innerMat = makeAdditiveMat(cols.hot, 0.84, true);
      innerSigil = new THREE.Mesh(novaSigilGeo, innerMat);
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
        group.remove(outerSigil);
        outerMat.dispose();
        if (innerSigil && innerMat) {
          group.remove(innerSigil);
          innerMat.dispose();
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
      mat: THREE.MeshStandardMaterial;
      vx: number;
      vy: number;
      vz: number;
      rx: number;
      ry: number;
    }> = [];

    for (let i = 0; i < shardCount; i++) {
      const ang = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const spd = 1.6 + Math.random() * 2.4;
      const mat = makeAdditiveMat(i % 2 === 0 ? cols.main : cols.hot, 0.9);
      const mesh = new THREE.Mesh(shardGeo, mat);
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
        shards.forEach((sh) => {
          group.remove(sh.mesh);
          sh.mat.dispose();
        });
      },
    });
  };

  const spawnChronoAstrolabe3D = (pos: THREE.Vector3) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const outerMat = makeAdditiveMat(0xf4cc68, 0.9, true);
    const innerMat = makeAdditiveMat(0x62f2e4, 0.85, true);
    const outerDial = new THREE.Mesh(clockDialGeo, outerMat);
    outerDial.position.set(pos.x, 0.12, pos.z);
    group.add(outerDial);

    const innerDial = new THREE.Mesh(novaSigilGeo, innerMat);
    innerDial.position.set(pos.x, 0.16, pos.z);
    group.add(innerDial);

    const motes: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; baseAng: number; radius: number }> = [];
    const moteCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 8 : 4;
    for (let i = 0; i < moteCount; i++) {
      const mMat = makeAdditiveMat(i % 2 === 0 ? 0xf4cc68 : 0x62f2e4, 0.88);
      const mMesh = new THREE.Mesh(shardGeo, mMat);
      mMesh.scale.setScalar(0.65);
      const ang = (i / moteCount) * Math.PI * 2;
      mMesh.position.set(pos.x + Math.cos(ang) * 0.7, 0.15, pos.z + Math.sin(ang) * 0.7);
      group.add(mMesh);
      motes.push({ mesh: mMesh, mat: mMat, baseAng: ang, radius: 0.65 + (i % 2) * 0.22 });
    }

    effects.push({
      life: 0,
      maxLife: 0.78,
      tick: (p) => {
        const ease = 1 - (1 - p) * (1 - p);
        outerDial.rotation.y = -p * Math.PI * 2.5; // counter-clockwise rewind spin
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
            pos.x + Math.cos(ang) * mt.radius * (1 - p * 0.35),
            0.15 + p * 1.45,
            pos.z + Math.sin(ang) * mt.radius * (1 - p * 0.35)
          );
          mt.mesh.rotation.y += 0.2;
          mt.mat.opacity = 0.88 * (1 - p);
        }
      },
      cleanup: () => {
        group.remove(outerDial, innerDial);
        outerMat.dispose();
        innerMat.dispose();
        motes.forEach((m) => {
          group.remove(m.mesh);
          m.mat.dispose();
        });
      },
    });
  };

  const spawnSoulTetherArc3D = (from: THREE.Vector3, to: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    const cols = SCHOOL_HEX[school];
    const beadCount = currentLevel >= GRAPHICS_LEVEL.ultra ? 11 : currentLevel >= GRAPHICS_LEVEL.high ? 7 : 4;
    const beads: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; t: number }> = [];
    for (let i = 0; i < beadCount; i++) {
      const t = i / Math.max(1, beadCount - 1);
      const bMat = makeAdditiveMat(i % 2 === 0 ? cols.main : cols.hot, 0.9);
      const bMesh = new THREE.Mesh(tetherBeadGeo, bMat);
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
          b.mesh.position.lerpVectors(from, to, u);
          b.mesh.position.y += Math.sin(u * Math.PI) * 0.92;
          b.mesh.rotation.x += 0.18;
          b.mesh.rotation.y += 0.22;
          b.mat.opacity = (0.35 + 0.65 * pulse) * (1 - Math.max(0, (p - 0.65) / 0.35));
        }
      },
      cleanup: () => {
        beads.forEach((b) => {
          group.remove(b.mesh);
          b.mat.dispose();
        });
      },
    });
  };

  const spawnResonanceApotheosis3D = (archonPos: THREE.Vector3, enemyPos: THREE.Vector3, school: MagicSchool) => {
    if (currentLevel <= GRAPHICS_LEVEL.low) return;
    spawnSummonPillar(new THREE.Vector3(archonPos.x, 0.05, archonPos.z), school);
    spawnSpellNova3D(new THREE.Vector3(archonPos.x, 0.1, archonPos.z), school, 2.05);
    spawnGroundShockwave(new THREE.Vector3(0, 0.06, 0), school, 4.4);
    if (school === 'chaos' || school === 'synth' || school === 'kinet') {
      spawnProjectileBeam(archonPos, enemyPos, school, false);
      if (currentLevel >= GRAPHICS_LEVEL.high) {
        spawnSpellNova3D(new THREE.Vector3(enemyPos.x, 0.12, enemyPos.z), school, 1.85);
      }
    }
    if (school === 'vital') {
      spawnSpellNova3D(new THREE.Vector3(0, 0.12, 1.75), 'vital', 2.2);
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
    spawnSpellNova3D,
    spawnShatterBurst,
    spawnChronoAstrolabe3D,
    spawnSoulTetherArc3D,
    spawnResonanceApotheosis3D,
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
      orbGeo.dispose();
      trailGeo.dispose();
      ringGeo.dispose();
      novaSigilGeo.dispose();
      slashGeo.dispose();
      pillarGeo.dispose();
      shardGeo.dispose();
      clockDialGeo.dispose();
      tetherBeadGeo.dispose();
    },
  };
}
