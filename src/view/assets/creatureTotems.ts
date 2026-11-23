import * as THREE from 'three';
import { getGraphicsDetailTier, type DetailTier } from '../../core/graphicsSettings';
import { TAROT_PALETTE, type TarotMaterialLibrary } from '../materials/tarotMaterials';

export type MagicSchool = 'kinet' | 'synth' | 'chaos' | 'vital';

export interface CreatureTotemHandle {
  id: string;
  name: string;
  school: MagicSchool;
  side: 'player' | 'enemy';
  atk: number;
  hp: number;
  group: THREE.Group;
  hitCollider: THREE.Mesh;
  badgeAnchor: THREE.Object3D;
  triggerSpawn: () => void;
  triggerAscend: () => void;
  triggerJump: () => void;
  triggerAttack: (mode?: 'melee' | 'direct', aimYawOffset?: number, speedScale?: number) => void;
  triggerHit: () => void;
  triggerDeath: () => void;
  setVeteran: (count: number) => void;
  setShielded: (shielded: boolean) => void;
  setStance: (stance: 'attack' | 'guard', exhausted?: boolean) => void;
  triggerIntercept: (dirX: number) => void;
  update: (time: number, dt?: number) => void;
  dispose: () => void;
}

function makeLathe(coords: Array<[number, number]>, segments = 12): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    coords.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );
}

/** Creates a forged, beveled flat sword/scimitar blade with crossguard and hilt grip */
function createForgedBlade(
  bladeMat: THREE.Material,
  hiltMat: THREE.Material,
  geometries: THREE.BufferGeometry[],
  length = 0.72,
  curved = false,
  detailLevel: DetailTier = 2,
  runeMat?: THREE.Material
): THREE.Group {
  const sword = new THREE.Group();

  const bladeShape = new THREE.Shape();
  if (curved) {
    bladeShape.moveTo(-0.025, 0);
    bladeShape.quadraticCurveTo(0.05, length * 0.45, 0.12, length);
    bladeShape.quadraticCurveTo(0.0, length * 0.65, 0.035, 0);
  } else {
    bladeShape.moveTo(-0.032, 0);
    bladeShape.lineTo(-0.026, length * 0.78);
    bladeShape.lineTo(0, length);
    bladeShape.lineTo(0.026, length * 0.78);
    bladeShape.lineTo(0.032, 0);
  }
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.016,
    bevelEnabled: detailLevel >= 1,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: detailLevel >= 2 ? 2 : 1,
  });
  bladeGeo.translate(0, 0, -0.008);

  const guardGeo = new THREE.BoxGeometry(0.16, 0.026, 0.045);
  const gripGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.16, 6);
  const pommelGeo = new THREE.OctahedronGeometry(0.028, 0);
  geometries.push(bladeGeo, guardGeo, gripGeo, pommelGeo);

  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.y = 0.08;
  blade.castShadow = true;
  sword.add(blade);

  // Subtle engraved glowing fuller / rune spine on High+
  if (detailLevel >= 2 && runeMat) {
    const fullerGeo = new THREE.BoxGeometry(0.014, length * 0.6, 0.022);
    geometries.push(fullerGeo);
    const fuller = new THREE.Mesh(fullerGeo, runeMat);
    fuller.position.set(curved ? 0.028 : 0, 0.08 + length * 0.36, 0);
    if (curved) fuller.rotation.z = -0.1;
    sword.add(fuller);
  }

  const guard = new THREE.Mesh(guardGeo, hiltMat);
  guard.position.y = 0.075;
  sword.add(guard);

  const grip = new THREE.Mesh(gripGeo, hiltMat);
  grip.position.y = -0.01;
  sword.add(grip);

  const pommel = new THREE.Mesh(pommelGeo, hiltMat);
  pommel.position.y = -0.1;
  sword.add(pommel);

  return sword;
}

/** Creates an angular V-tapered faceted warrior cuirass + segmented waist tassets + dorsal plating */
function createWarriorCuirass(
  armorMat: THREE.Material,
  trimMat: THREE.Material,
  clothMat: THREE.Material,
  geometries: THREE.BufferGeometry[],
  sc = 1.0,
  detailLevel: DetailTier = 2
): THREE.Group {
  const torso = new THREE.Group();

  const chestShape = new THREE.Shape();
  chestShape.moveTo(-0.15, 0);
  chestShape.lineTo(-0.24, 0.34);
  chestShape.lineTo(-0.16, 0.44);
  chestShape.lineTo(0.16, 0.44);
  chestShape.lineTo(0.24, 0.34);
  chestShape.lineTo(0.15, 0);
  chestShape.closePath();
  const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
    depth: 0.2,
    bevelEnabled: detailLevel >= 1,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: detailLevel >= 2 ? 2 : 1,
  });
  chestGeo.translate(0, 0, -0.1);

  const beltGeo = new THREE.CylinderGeometry(0.17, 0.18, 0.08, detailLevel >= 2 ? 12 : 8);
  const tassetShape = new THREE.Shape();
  tassetShape.moveTo(-0.11, 0);
  tassetShape.lineTo(0.11, 0);
  tassetShape.lineTo(0.14, -0.22);
  tassetShape.lineTo(0, -0.28);
  tassetShape.lineTo(-0.14, -0.22);
  tassetShape.closePath();
  const tassetGeo = new THREE.ExtrudeGeometry(tassetShape, {
    depth: 0.02,
    bevelEnabled: detailLevel >= 1,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });

  geometries.push(chestGeo, beltGeo, tassetGeo);

  const chest = new THREE.Mesh(chestGeo, armorMat);
  chest.position.y = 0.56 * sc;
  chest.scale.set(sc, sc, sc);
  chest.castShadow = true;
  torso.add(chest);

  const belt = new THREE.Mesh(beltGeo, trimMat);
  belt.position.y = 0.54 * sc;
  belt.scale.set(sc * 1.05, sc, sc * 0.85);
  torso.add(belt);

  const frontTasset = new THREE.Mesh(tassetGeo, clothMat);
  frontTasset.position.set(0, 0.52 * sc, 0.14 * sc);
  frontTasset.rotation.x = -0.12;
  frontTasset.scale.setScalar(sc);
  torso.add(frontTasset);

  const backTasset = new THREE.Mesh(tassetGeo, clothMat);
  backTasset.position.set(0, 0.52 * sc, -0.14 * sc);
  backTasset.rotation.x = 0.14;
  backTasset.scale.setScalar(sc);
  torso.add(backTasset);

  // High+: collar gorget, side hip tassets & dorsal trim spine visible from rear camera
  if (detailLevel >= 2) {
    const gorgetGeo = new THREE.TorusGeometry(0.16, 0.026, 6, 14);
    gorgetGeo.rotateX(Math.PI / 2);
    const spinePlateGeo = new THREE.BoxGeometry(0.06, 0.34, 0.035);
    const hipPlateGeo = new THREE.BoxGeometry(0.03, 0.18, 0.14);
    geometries.push(gorgetGeo, spinePlateGeo, hipPlateGeo);

    const gorget = new THREE.Mesh(gorgetGeo, trimMat);
    gorget.position.set(0, 0.99 * sc, 0);
    gorget.scale.setScalar(sc);
    torso.add(gorget);

    const spinePlate = new THREE.Mesh(spinePlateGeo, trimMat);
    spinePlate.position.set(0, 0.77 * sc, -0.135 * sc);
    spinePlate.scale.setScalar(sc);
    torso.add(spinePlate);

    [-1, 1].forEach((dir) => {
      const hip = new THREE.Mesh(hipPlateGeo, trimMat);
      hip.position.set(dir * 0.19 * sc, 0.45 * sc, 0);
      hip.rotation.z = dir * -0.18;
      hip.scale.setScalar(sc);
      torso.add(hip);
    });
  }

  return torso;
}

/** Builds a toothed mechanical gear wheel (for High/Ultra Synth back turbines) */
function createToothedGear(
  mat: THREE.Material,
  coreMat: THREE.Material,
  geometries: THREE.BufferGeometry[],
  radius: number,
  teeth = 10
): THREE.Group {
  const gearGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(radius, radius * 0.16, 6, 20);
  const hubGeo = new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, 0.045, 10);
  hubGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(radius * 1.82, radius * 0.14, 0.028);
  const toothGeo = new THREE.BoxGeometry(radius * 0.22, radius * 0.24, 0.032);
  geometries.push(ringGeo, hubGeo, spokeGeo, toothGeo);

  gearGroup.add(new THREE.Mesh(ringGeo, mat));
  gearGroup.add(new THREE.Mesh(hubGeo, coreMat));

  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(spokeGeo, mat);
    spoke.rotation.z = (s * Math.PI) / 3;
    gearGroup.add(spoke);
  }
  for (let t = 0; t < teeth; t++) {
    const ang = (t * Math.PI * 2) / teeth;
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.set(Math.cos(ang) * (radius * 1.12), Math.sin(ang) * (radius * 1.12), 0);
    tooth.rotation.z = ang - Math.PI / 2;
    gearGroup.add(tooth);
  }

  return gearGroup;
}

export function buildCreatureTotem(
  id: string,
  name: string,
  school: MagicSchool,
  side: 'player' | 'enemy',
  atk: number,
  hp: number,
  mats: TarotMaterialLibrary,
  contactTex: THREE.Texture,
  detailLevel: DetailTier = getGraphicsDetailTier()
): CreatureTotemHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  const tag = `${name} ${id}`.toLowerCase();
  const eyeMat =
    school === 'chaos'
      ? mats.crimsonEyeMat
      : school === 'vital' && tag.includes('venom')
        ? mats.cyanEyeMat
        : side === 'enemy' && school !== 'kinet'
          ? mats.crimsonEyeMat
          : mats.cyanEyeMat;

  const schoolGlowMat =
    school === 'kinet'
      ? mats.etherCoreMat
      : school === 'chaos'
        ? mats.chaosCoreMat
        : school === 'vital'
          ? mats.vitalAmberMat
          : mats.runeEmissiveMat;

  // Invisible hit volume for 3D Hover Stat Inspector raycasting
  const colliderGeo = new THREE.CylinderGeometry(0.56, 0.62, 1.75, 8);
  geometries.push(colliderGeo);
  const colliderMat = new THREE.MeshStandardMaterial({
    colorWrite: false,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  customMats.push(colliderMat);
  const hitCollider = new THREE.Mesh(colliderGeo, colliderMat);
  hitCollider.position.set(0, 0.9, 0);
  hitCollider.userData.hoverTarget = { kind: 'creature', uid: id };
  group.add(hitCollider);

  // Soft radial contact shadow
  const shadowGeo = new THREE.PlaneGeometry(1.65, 1.65);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshStandardMaterial({
    map: contactTex,
    color: 0x000000,
    roughness: 1,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  customMats.push(shadowMat);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Carved antique pedestal disc (LOD-scaled)
  const baseGeo = makeLathe(
    [
      [0.0, 0.0],
      [0.54, 0.0],
      [0.5, 0.05],
      [0.44, 0.09],
      [0.0, 0.09],
    ],
    detailLevel >= 2 ? 16 : detailLevel === 1 ? 12 : 8
  );
  geometries.push(baseGeo);
  const base = new THREE.Mesh(baseGeo, mats.darkBronzeMat);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  if (detailLevel >= 1) {
    const plinthTrimGeo = new THREE.TorusGeometry(0.455, 0.016, 6, detailLevel >= 2 ? 20 : 12);
    plinthTrimGeo.rotateX(Math.PI / 2);
    geometries.push(plinthTrimGeo);
    const plinthTrim = new THREE.Mesh(plinthTrimGeo, mats.goldMat);
    plinthTrim.position.y = 0.088;
    group.add(plinthTrim);
  }

  if (detailLevel >= 2) {
    const inlayRingGeo = new THREE.RingGeometry(0.32, 0.37, 20);
    inlayRingGeo.rotateX(-Math.PI / 2);
    const studGeo = new THREE.OctahedronGeometry(0.026, 0);
    geometries.push(inlayRingGeo, studGeo);
    const inlayRing = new THREE.Mesh(inlayRingGeo, schoolGlowMat);
    inlayRing.position.y = 0.094;
    group.add(inlayRing);

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const stud = new THREE.Mesh(studGeo, mats.goldMat);
      stud.position.set(Math.cos(a) * 0.48, 0.065, Math.sin(a) * 0.48);
      group.add(stud);
    }
  }

  const animPivot = new THREE.Group();
  animPivot.position.y = 0.09;
  group.add(animPivot);

  const leftWings: THREE.Object3D[] = [];
  const rightWings: THREE.Object3D[] = [];
  const floatParts: Array<{ obj: THREE.Object3D; baseY: number; phase: number; radius: number; angle0: number }> = [];
  let spinPart: THREE.Object3D | null = null;
  let counterSpinPart: THREE.Object3D | null = null;
  let headRig: THREE.Object3D | null = null;
  let tailRig: THREE.Object3D | null = null;

  if (school === 'kinet') {
    // WINGED VALKYRIE ARCHER-LANCER / ZEPHYR MONK / ARBITER
    const isVortex = tag.includes('vortex') || atk >= 5;
    const sc = isVortex ? 1.1 : 1.0;

    // Armored greaves
    const legGeo = new THREE.CapsuleGeometry(0.05, 0.34, 4, detailLevel >= 2 ? 10 : 6);
    geometries.push(legGeo);
    [-0.11 * sc, 0.11 * sc].forEach((lx) => {
      const leg = new THREE.Mesh(legGeo, mats.bluedSteelMat);
      leg.position.set(lx, 0.24 * sc, 0);
      leg.castShadow = true;
      animPivot.add(leg);
    });

    if (detailLevel >= 2) {
      const kneeGeo = new THREE.OctahedronGeometry(0.052, 0);
      geometries.push(kneeGeo);
      [-0.11 * sc, 0.11 * sc].forEach((lx) => {
        const knee = new THREE.Mesh(kneeGeo, mats.goldMat);
        knee.position.set(lx, 0.32 * sc, 0.055 * sc);
        knee.scale.set(0.9, 1.2, 0.7);
        animPivot.add(knee);
      });
    }

    animPivot.add(
      createWarriorCuirass(mats.goldMat, mats.bronzeMat, mats.royalIndigoClothMat, geometries, sc * 0.92, detailLevel)
    );

    const chestGemGeo = new THREE.OctahedronGeometry(0.055, detailLevel >= 2 ? 1 : 0);
    geometries.push(chestGemGeo);
    const chestGem = new THREE.Mesh(chestGemGeo, mats.etherCoreMat);
    chestGem.position.set(0, 0.78 * sc, 0.14 * sc);
    animPivot.add(chestGem);

    if (detailLevel >= 2) {
      const backGem = new THREE.Mesh(chestGemGeo, mats.etherCoreMat);
      backGem.position.set(0, 0.8 * sc, -0.14 * sc);
      backGem.scale.setScalar(0.82);
      animPivot.add(backGem);

      // Twin flowing Astral Streamer Ribbons down the back (visible from 42° rear camera!)
      const streamerShape = new THREE.Shape();
      streamerShape.moveTo(0, 0);
      streamerShape.quadraticCurveTo(0.09, -0.28, 0.14, -0.68);
      streamerShape.lineTo(0.04, -0.58);
      streamerShape.quadraticCurveTo(0.01, -0.25, -0.04, 0);
      streamerShape.closePath();
      const streamerGeo = new THREE.ExtrudeGeometry(streamerShape, {
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 1,
      });
      geometries.push(streamerGeo);
      [-1, 1].forEach((dir) => {
        const st = new THREE.Mesh(streamerGeo, mats.royalIndigoClothMat);
        st.position.set(dir * 0.08 * sc, 0.92 * sc, -0.15 * sc);
        st.scale.set(dir * sc, sc, 1);
        st.rotation.x = 0.24;
        animPivot.add(st);
      });
    }

    // Connected arms + Forged Astral Halberd-Lance
    const upperArmGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 6);
    const forearmGeo = new THREE.CapsuleGeometry(0.036, 0.2, 4, 6);
    const lanceShaftGeo = new THREE.CylinderGeometry(0.016, 0.02, 1.48, detailLevel >= 2 ? 10 : 6);
    const lanceHead = createForgedBlade(
      mats.bluedSteelMat,
      mats.goldMat,
      geometries,
      0.38,
      false,
      detailLevel,
      mats.etherCoreMat
    );
    geometries.push(upperArmGeo, forearmGeo, lanceShaftGeo);

    [-1, 1].forEach((dir) => {
      const ua = new THREE.Mesh(upperArmGeo, mats.royalIndigoClothMat);
      ua.position.set(dir * 0.26 * sc, 0.78 * sc, 0.02);
      ua.rotation.z = dir * 0.32;
      animPivot.add(ua);

      const fa = new THREE.Mesh(forearmGeo, mats.bluedSteelMat);
      fa.position.set(dir * 0.31 * sc, 0.68 * sc, 0.16 * sc);
      fa.rotation.x = -1.1;
      animPivot.add(fa);

      if (detailLevel >= 1) {
        const shoulderWingGeo = new THREE.BoxGeometry(0.14 * sc, 0.045 * sc, 0.16 * sc);
        geometries.push(shoulderWingGeo);
        const sw = new THREE.Mesh(shoulderWingGeo, mats.goldMat);
        sw.position.set(dir * 0.26 * sc, 0.91 * sc, 0);
        sw.rotation.z = -dir * 0.36;
        animPivot.add(sw);
      }
    });

    const lanceShaft = new THREE.Mesh(lanceShaftGeo, mats.bronzeMat);
    lanceShaft.position.set(0.32 * sc, 0.88 * sc, 0.26 * sc);
    lanceShaft.rotation.x = 0.22;
    animPivot.add(lanceShaft);

    lanceHead.position.set(0.32 * sc, 1.56 * sc, 0.41 * sc);
    lanceHead.rotation.x = 0.22;
    animPivot.add(lanceHead);

    if (detailLevel >= 2) {
      const focusRingGeo = new THREE.TorusGeometry(0.095, 0.014, 6, 16);
      geometries.push(focusRingGeo);
      const focusRing = new THREE.Mesh(focusRingGeo, mats.etherCoreMat);
      focusRing.position.set(0.32 * sc, 1.54 * sc, 0.41 * sc);
      focusRing.rotation.x = 0.22;
      animPivot.add(focusRing);
    }

    // Sculpted Winged Valkyrie Visor Helm
    const head = new THREE.Group();
    head.position.set(0, 1.08 * sc, 0.02);
    animPivot.add(head);
    headRig = head;

    const helmGeo = makeLathe(
      [
        [0.0, -0.13],
        [0.095, -0.09],
        [0.125, 0.02],
        [0.12, 0.14],
        [0.075, 0.21],
        [0.0, 0.23],
      ],
      detailLevel >= 2 ? 14 : 8
    );
    const crestGeo = new THREE.BoxGeometry(0.03, 0.16, 0.22);
    const nasalGeo = new THREE.BoxGeometry(0.028, 0.12, 0.04);
    const visorSlitGeo = new THREE.CylinderGeometry(0.128, 0.128, 0.036, 10, 1, true, -0.75, 1.5);
    const eyeGeo = new THREE.OctahedronGeometry(0.016, 1);
    geometries.push(helmGeo, crestGeo, nasalGeo, visorSlitGeo, eyeGeo);

    const helm = new THREE.Mesh(helmGeo, mats.bluedSteelMat);
    helm.scale.set(0.92, 1.0, 1.08);
    helm.castShadow = true;
    head.add(helm);

    const crest = new THREE.Mesh(crestGeo, mats.goldMat);
    crest.position.set(0, 0.18, -0.02);
    head.add(crest);

    const nasal = new THREE.Mesh(nasalGeo, mats.goldMat);
    nasal.position.set(0, 0.01, 0.13);
    head.add(nasal);

    const visor = new THREE.Mesh(visorSlitGeo, mats.voidMat);
    visor.position.set(0, 0.03, 0.01);
    visor.rotation.y = Math.PI * 0.5;
    head.add(visor);

    [-0.048, 0.048].forEach((ex) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.03, 0.125);
      head.add(eye);
    });

    // Swept Wing Crest Ears on Helm
    const earWingShape = new THREE.Shape();
    earWingShape.moveTo(0, 0);
    earWingShape.quadraticCurveTo(0.1, 0.16, 0.18, 0.24);
    earWingShape.lineTo(0.05, 0.06);
    earWingShape.closePath();
    const earWingGeo = new THREE.ExtrudeGeometry(earWingShape, { depth: 0.014, bevelEnabled: false });
    geometries.push(earWingGeo);
    [-1, 1].forEach((dir) => {
      const ew = new THREE.Mesh(earWingGeo, mats.goldMat);
      ew.position.set(dir * 0.11, 0.06, -0.01);
      ew.scale.x = dir;
      ew.rotation.y = dir * -0.45;
      head.add(ew);
    });

    // Multi-layered Feathered Pinion Wings (LOD-scaled!)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.05);
    wingShape.bezierCurveTo(0.28, 0.42, 0.65, 0.48, 0.9, 0.34);
    wingShape.quadraticCurveTo(0.75, 0.14, 0.62, 0.08);
    wingShape.quadraticCurveTo(0.5, -0.06, 0.38, -0.04);
    wingShape.quadraticCurveTo(0.24, -0.18, 0, -0.08);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.025,
      bevelEnabled: detailLevel >= 1,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: detailLevel >= 2 ? 2 : 1,
    });
    geometries.push(wingGeo);

    let pinionGeo: THREE.ExtrudeGeometry | null = null;
    if (detailLevel >= 2) {
      const pShape = new THREE.Shape();
      pShape.moveTo(0, 0);
      pShape.quadraticCurveTo(0.26, 0.14, 0.56, 0.06);
      pShape.lineTo(0.14, -0.07);
      pShape.closePath();
      pinionGeo = new THREE.ExtrudeGeometry(pShape, {
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 1,
      });
      geometries.push(pinionGeo);
    }

    [-1, 1].forEach((dir) => {
      const upperPivot = new THREE.Group();
      upperPivot.position.set(dir * 0.14, 0.9 * sc, -0.1);
      const upperWing = new THREE.Mesh(wingGeo, mats.goldMat);
      upperWing.scale.set(dir * sc, sc, 1);
      upperWing.castShadow = true;
      upperPivot.add(upperWing);

      if (pinionGeo) {
        for (let p = 0; p < 3; p++) {
          const pinion = new THREE.Mesh(pinionGeo, p % 2 === 0 ? mats.porcelainMaskMat : mats.bluedSteelMat);
          pinion.scale.set(dir * (0.95 - p * 0.14) * sc, (0.95 - p * 0.1) * sc, 1);
          pinion.position.set(dir * (0.2 + p * 0.12) * sc, (0.12 - p * 0.08) * sc, -0.02);
          pinion.rotation.z = dir * (-0.18 - p * 0.2);
          upperPivot.add(pinion);
        }
      }
      animPivot.add(upperPivot);

      const lowerPivot = new THREE.Group();
      lowerPivot.position.set(dir * 0.12, 0.72 * sc, -0.11);
      const lowerWing = new THREE.Mesh(wingGeo, mats.porcelainMaskMat);
      lowerWing.scale.set(dir * 0.72 * sc, 0.72 * sc, 1);
      lowerWing.rotation.z = dir * -0.4;
      lowerPivot.add(lowerWing);
      animPivot.add(lowerPivot);

      if (dir < 0) leftWings.push(upperPivot, lowerPivot);
      else rightWings.push(upperPivot, lowerPivot);
    });

    if (isVortex || detailLevel >= 3) {
      const haloGeo = new THREE.TorusGeometry(0.32, 0.018, 6, detailLevel >= 2 ? 28 : 16);
      geometries.push(haloGeo);
      const halo = new THREE.Mesh(haloGeo, mats.goldMat);
      halo.position.set(0, 1.12 * sc, -0.18);
      animPivot.add(halo);
      spinPart = halo;

      if (detailLevel >= 3) {
        const innerHaloGeo = new THREE.TorusGeometry(0.22, 0.012, 6, 20);
        const moteGeo = new THREE.OctahedronGeometry(0.036, 0);
        geometries.push(innerHaloGeo, moteGeo);
        const innerHalo = new THREE.Mesh(innerHaloGeo, mats.etherCoreMat);
        innerHalo.position.set(0, 1.12 * sc, -0.2);
        animPivot.add(innerHalo);
        counterSpinPart = innerHalo;

        for (let m = 0; m < 3; m++) {
          const mote = new THREE.Mesh(moteGeo, mats.etherCoreMat);
          animPivot.add(mote);
          floatParts.push({
            obj: mote,
            baseY: (0.85 + m * 0.2) * sc,
            phase: m * 2.1,
            radius: 0.42 * sc,
            angle0: (m * Math.PI * 2) / 3,
          });
        }
      }
    }
  } else if (school === 'synth') {
    // CLOCKWORK PALADIN / CHRONO-STRIKER / ASTROLABE SENTINEL / CHRONO-SMITH
    const isBlade = tag.includes('blade');
    const isGolem = tag.includes('golem') || hp >= 5;
    const sc = isGolem ? 1.12 : 1.0;

    // Armored Greaves & Sabatons
    const legGeo = makeLathe(
      [
        [0.0, 0.0],
        [0.105, 0.0],
        [0.09, 0.18],
        [0.08, 0.34],
        [0.1, 0.48],
        [0.0, 0.48],
      ],
      detailLevel >= 2 ? 12 : 6
    );
    geometries.push(legGeo);
    [-0.15 * sc, 0.15 * sc].forEach((lx) => {
      const leg = new THREE.Mesh(legGeo, mats.bluedSteelMat);
      leg.position.set(lx, 0, 0.02);
      leg.scale.set(1, sc, 1.2);
      leg.castShadow = true;
      animPivot.add(leg);
    });

    if (detailLevel >= 1) {
      const poleynGeo = new THREE.OctahedronGeometry(0.062, 0);
      geometries.push(poleynGeo);
      [-0.15 * sc, 0.15 * sc].forEach((lx) => {
        const poleyn = new THREE.Mesh(poleynGeo, mats.goldMat);
        poleyn.position.set(lx, 0.33 * sc, 0.095 * sc);
        poleyn.scale.set(1.0, 1.2, 0.7);
        animPivot.add(poleyn);
      });
    }

    animPivot.add(
      createWarriorCuirass(mats.bronzeMat, mats.goldMat, mats.bluedSteelMat, geometries, sc, detailLevel)
    );

    // Recessed Brass Chronometer Chest Medallion
    const dialBezelGeo = new THREE.TorusGeometry(0.085, 0.018, 8, detailLevel >= 2 ? 20 : 12);
    const dialCoreGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.025, 10);
    geometries.push(dialBezelGeo, dialCoreGeo);
    const dialBezel = new THREE.Mesh(dialBezelGeo, mats.goldMat);
    dialBezel.position.set(0, 0.8 * sc, 0.145 * sc);
    animPivot.add(dialBezel);
    const dialCore = new THREE.Mesh(dialCoreGeo, mats.etherCoreMat);
    dialCore.rotation.x = Math.PI / 2;
    dialCore.position.set(0, 0.8 * sc, 0.14 * sc);
    animPivot.add(dialCore);

    // Visored Knight Greathelm
    const head = new THREE.Group();
    head.position.set(0, 1.16 * sc, 0.02);
    animPivot.add(head);
    headRig = head;

    const helmGeo = makeLathe(
      [
        [0.0, -0.13],
        [0.115, -0.1],
        [0.135, 0.02],
        [0.13, 0.15],
        [0.07, 0.21],
        [0.0, 0.22],
      ],
      detailLevel >= 2 ? 12 : 8
    );
    const crestShape = new THREE.Shape();
    crestShape.moveTo(-0.08, 0);
    crestShape.quadraticCurveTo(0, 0.2, 0.13, 0.07);
    crestShape.lineTo(0.05, -0.02);
    crestShape.closePath();
    const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
      depth: 0.028,
      bevelEnabled: detailLevel >= 1,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    });
    crestGeo.rotateY(Math.PI / 2);
    const visorSlitGeo = new THREE.CylinderGeometry(0.138, 0.138, 0.036, 8, 1, true, -0.8, 1.6);
    const eyeGeo = new THREE.OctahedronGeometry(0.016, 1);
    geometries.push(helmGeo, crestGeo, visorSlitGeo, eyeGeo);

    const helm = new THREE.Mesh(helmGeo, mats.bluedSteelMat);
    helm.castShadow = true;
    head.add(helm);

    const crest = new THREE.Mesh(crestGeo, mats.goldMat);
    crest.position.set(-0.014, 0.15, 0);
    head.add(crest);

    const visorSlit = new THREE.Mesh(visorSlitGeo, mats.voidMat);
    visorSlit.position.set(0, 0.02, 0.01);
    visorSlit.rotation.y = Math.PI * 0.5;
    head.add(visorSlit);

    [-0.048, 0.048].forEach((ex) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.02, 0.136);
      head.add(eye);
    });

    if (detailLevel >= 2) {
      const earGearGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8);
      earGearGeo.rotateZ(Math.PI / 2);
      geometries.push(earGearGeo);
      [-0.132, 0.132].forEach((ex) => {
        const earGear = new THREE.Mesh(earGearGeo, mats.goldMat);
        earGear.position.set(ex, 0.02, -0.01);
        head.add(earGear);
      });
    }

    // Beveled Multi-Tier Shoulder Pauldrons + Connected Arms
    const pauldronShape = new THREE.Shape();
    pauldronShape.moveTo(-0.13, -0.09);
    pauldronShape.quadraticCurveTo(0, 0.15, 0.16, 0.0);
    pauldronShape.lineTo(0.04, -0.11);
    pauldronShape.closePath();
    const pauldronGeo = new THREE.ExtrudeGeometry(pauldronShape, {
      depth: 0.18,
      bevelEnabled: detailLevel >= 1,
      bevelThickness: 0.016,
      bevelSize: 0.014,
      bevelSegments: detailLevel >= 2 ? 2 : 1,
    });
    pauldronGeo.center();
    const upperArmGeo = new THREE.CapsuleGeometry(0.048, 0.2, 4, 6);
    const forearmGeo = new THREE.CapsuleGeometry(0.044, 0.22, 4, 6);
    geometries.push(pauldronGeo, upperArmGeo, forearmGeo);

    [-1, 1].forEach((dir) => {
      const p = new THREE.Mesh(pauldronGeo, mats.goldMat);
      p.position.set(dir * 0.32 * sc, 0.94 * sc, 0);
      p.scale.set(dir, 1.0, 1.05);
      p.rotation.z = -dir * 0.32;
      p.castShadow = true;
      animPivot.add(p);

      // High+: layered blued-steel inner trim flange + shoulder piston strut
      if (detailLevel >= 2) {
        const subP = new THREE.Mesh(pauldronGeo, mats.bluedSteelMat);
        subP.position.set(dir * 0.35 * sc, 0.86 * sc, 0);
        subP.scale.set(dir * 0.85, 0.72, 0.92);
        subP.rotation.z = -dir * 0.45;
        animPivot.add(subP);
      }

      const ua = new THREE.Mesh(upperArmGeo, mats.bronzeMat);
      ua.position.set(dir * 0.32 * sc, 0.78 * sc, 0.02);
      ua.rotation.z = dir * 0.25;
      animPivot.add(ua);

      const fa = new THREE.Mesh(forearmGeo, mats.bluedSteelMat);
      fa.position.set(dir * 0.38 * sc, 0.66 * sc, 0.18 * sc);
      fa.rotation.x = -1.15;
      animPivot.add(fa);
    });

    if (isBlade) {
      [-0.4 * sc, 0.4 * sc].forEach((bx) => {
        const saber = createForgedBlade(
          mats.bluedSteelMat,
          mats.goldMat,
          geometries,
          0.74 * sc,
          true,
          detailLevel,
          mats.etherCoreMat
        );
        saber.position.set(bx, 0.64 * sc, 0.3 * sc);
        saber.rotation.x = 0.68;
        saber.rotation.z = bx < 0 ? 0.2 : -0.2;
        animPivot.add(saber);
      });
    } else {
      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(0, 0.34);
      shieldShape.lineTo(0.22, 0.24);
      shieldShape.quadraticCurveTo(0.22, -0.08, 0, -0.36);
      shieldShape.quadraticCurveTo(-0.22, -0.08, -0.22, 0.24);
      shieldShape.closePath();
      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
        depth: 0.04,
        bevelEnabled: detailLevel >= 1,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: detailLevel >= 2 ? 2 : 1,
      });
      const bossGeo = new THREE.OctahedronGeometry(0.07, detailLevel >= 2 ? 1 : 0);
      const shaftGeo = new THREE.CylinderGeometry(0.02, 0.024, 1.4, detailLevel >= 2 ? 10 : 6);
      const axeShape = new THREE.Shape();
      axeShape.moveTo(0, 0.22);
      axeShape.quadraticCurveTo(0.22, 0.12, 0.18, -0.18);
      axeShape.lineTo(0, -0.1);
      axeShape.closePath();
      const axeGeo = new THREE.ExtrudeGeometry(axeShape, {
        depth: 0.022,
        bevelEnabled: detailLevel >= 1,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 1,
      });
      geometries.push(shieldGeo, bossGeo, shaftGeo, axeGeo);

      const shield = new THREE.Mesh(shieldGeo, mats.bluedSteelMat);
      shield.position.set(-0.4 * sc, 0.64 * sc, 0.26 * sc);
      shield.rotation.y = 0.62;
      shield.castShadow = true;
      animPivot.add(shield);

      if (detailLevel >= 2) {
        const shieldRim = new THREE.Mesh(shieldGeo, mats.goldMat);
        shieldRim.position.set(-0.39 * sc, 0.64 * sc, 0.245 * sc);
        shieldRim.rotation.y = 0.62;
        shieldRim.scale.set(1.08, 1.06, 0.55);
        animPivot.add(shieldRim);
      }

      const boss = new THREE.Mesh(bossGeo, mats.goldMat);
      boss.position.set(-0.43 * sc, 0.64 * sc, 0.31 * sc);
      animPivot.add(boss);

      const shaft = new THREE.Mesh(shaftGeo, mats.darkBronzeMat);
      shaft.position.set(0.4 * sc, 0.8 * sc, 0.26 * sc);
      shaft.rotation.x = 0.18;
      animPivot.add(shaft);

      const axe = new THREE.Mesh(axeGeo, mats.goldMat);
      axe.position.set(0.4 * sc, 1.32 * sc, 0.36 * sc);
      axe.rotation.y = -Math.PI * 0.5;
      axe.rotation.x = 0.18;
      animPivot.add(axe);
    }

    // Back Clockwork Assembly (Simple ring on Low/Med, Full Toothed Turbine + Pistons on High/Ultra!)
    if (detailLevel >= 2) {
      const drumGeo = new THREE.CylinderGeometry(0.16 * sc, 0.18 * sc, 0.12 * sc, 12);
      drumGeo.rotateX(Math.PI / 2);
      geometries.push(drumGeo);
      const drum = new THREE.Mesh(drumGeo, mats.darkBronzeMat);
      drum.position.set(0, 0.82 * sc, -0.15 * sc);
      animPivot.add(drum);

      const turbine = createToothedGear(mats.goldMat, mats.etherCoreMat, geometries, 0.21 * sc, 10);
      turbine.position.set(0, 0.84 * sc, -0.22 * sc);
      animPivot.add(turbine);
      spinPart = turbine;

      // Twin angled brass dorsal exhaust chimneys
      const pipeGeo = new THREE.CylinderGeometry(0.024, 0.03, 0.24 * sc, 8);
      geometries.push(pipeGeo);
      [-1, 1].forEach((dir) => {
        const pipe = new THREE.Mesh(pipeGeo, mats.bronzeMat);
        pipe.position.set(dir * 0.13 * sc, 1.03 * sc, -0.18 * sc);
        pipe.rotation.z = -dir * 0.32;
        pipe.rotation.x = -0.25;
        animPivot.add(pipe);
      });

      if (detailLevel >= 3) {
        const subGear = createToothedGear(mats.bluedSteelMat, mats.goldMat, geometries, 0.125 * sc, 8);
        subGear.position.set(0.14 * sc, 0.98 * sc, -0.23 * sc);
        animPivot.add(subGear);
        counterSpinPart = subGear;

        const astrolabeGeo = new THREE.TorusGeometry(0.32 * sc, 0.012, 6, 24);
        geometries.push(astrolabeGeo);
        const astrolabe = new THREE.Mesh(astrolabeGeo, mats.etherCoreMat);
        astrolabe.position.set(0, 0.84 * sc, -0.24 * sc);
        animPivot.add(astrolabe);
      }
    } else {
      const gearGeo = new THREE.TorusGeometry(0.18, 0.022, 6, 12);
      geometries.push(gearGeo);
      const gear = new THREE.Mesh(gearGeo, mats.goldMat);
      gear.position.set(0, 0.84 * sc, -0.18 * sc);
      animPivot.add(gear);
      spinPart = gear;
    }
  } else if (school === 'chaos') {
    const isHound = tag.includes('hound');

    if (isHound) {
      // QUADRUPED CINDER HOUND
      const torsoGeo = makeLathe(
        [
          [0.0, -0.42],
          [0.14, -0.34],
          [0.125, -0.14],
          [0.18, 0.12],
          [0.2, 0.32],
          [0.13, 0.44],
          [0.0, 0.46],
        ],
        detailLevel >= 2 ? 14 : 8
      );
      torsoGeo.rotateX(Math.PI / 2);
      geometries.push(torsoGeo);
      const torso = new THREE.Mesh(torsoGeo, mats.obsidianClothMat);
      torso.position.set(0, 0.48, 0);
      torso.rotation.x = -0.14;
      torso.castShadow = true;
      animPivot.add(torso);

      const thighGeo = new THREE.CapsuleGeometry(0.052, 0.22, 4, 6);
      const shinGeo = new THREE.CapsuleGeometry(0.036, 0.2, 4, 6);
      geometries.push(thighGeo, shinGeo);
      [
        [-0.15, 0.36, 0.26, -0.22, 0.2],
        [0.15, 0.36, 0.26, -0.22, 0.2],
        [-0.15, 0.34, -0.28, 0.32, -0.28],
        [0.15, 0.34, -0.28, 0.32, -0.28],
      ].forEach(([lx, ly, lz, rx1, rx2]) => {
        const thigh = new THREE.Mesh(thighGeo, mats.crimsonArmorMat);
        thigh.position.set(lx, ly, lz);
        thigh.rotation.x = rx1;
        animPivot.add(thigh);

        const shin = new THREE.Mesh(shinGeo, mats.darkBronzeMat);
        shin.position.set(lx, 0.14, lz + (lz > 0 ? 0.06 : -0.04));
        shin.rotation.x = rx2;
        animPivot.add(shin);
      });

      // Dorsal bone-blade spine crest (more blades + magma vents on High+)
      const spineCount = detailLevel >= 2 ? 5 : 3;
      const spineGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
      geometries.push(spineGeo);
      for (let s = 0; s < spineCount; s++) {
        const sp = new THREE.Mesh(spineGeo, s % 2 === 0 ? mats.bronzeMat : mats.chaosCoreMat);
        sp.position.set(0, 0.68 - s * 0.03, 0.2 - s * 0.14);
        sp.rotation.x = -0.52;
        animPivot.add(sp);
      }

      if (detailLevel >= 2) {
        const collarGeo = new THREE.TorusGeometry(0.15, 0.025, 6, 14);
        const ribGeo = new THREE.BoxGeometry(0.39, 0.04, 0.05);
        geometries.push(collarGeo, ribGeo);
        const collar = new THREE.Mesh(collarGeo, mats.bronzeMat);
        collar.position.set(0, 0.56, 0.3);
        collar.rotation.x = 0.3;
        animPivot.add(collar);

        for (let r = 0; r < 3; r++) {
          const rib = new THREE.Mesh(ribGeo, mats.crimsonArmorMat);
          rib.position.set(0, 0.49, 0.12 - r * 0.14);
          animPivot.add(rib);
        }
      }

      const head = new THREE.Group();
      head.position.set(0, 0.66, 0.44);
      animPivot.add(head);
      headRig = head;

      const craniumGeo = makeLathe(
        [
          [0.0, -0.14],
          [0.12, -0.06],
          [0.13, 0.06],
          [0.085, 0.2],
          [0.04, 0.3],
          [0.0, 0.31],
        ],
        8
      );
      craniumGeo.rotateX(Math.PI / 2);
      const eyeGeo = new THREE.OctahedronGeometry(0.02, 1);
      geometries.push(craniumGeo, eyeGeo);

      const cranium = new THREE.Mesh(craniumGeo, mats.boneIvoryMat);
      cranium.scale.set(1.0, 0.85, 1.0);
      cranium.castShadow = true;
      head.add(cranium);

      [-1, 1].forEach((dir) => {
        const hornCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.08, 0.08, -0.04),
          new THREE.Vector3(dir * 0.16, 0.18, -0.18),
          new THREE.Vector3(dir * 0.12, 0.22, -0.32),
        ]);
        const hornGeo = new THREE.TubeGeometry(hornCurve, 10, 0.024, 6, false);
        geometries.push(hornGeo);
        head.add(new THREE.Mesh(hornGeo, mats.bronzeMat));

        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(dir * 0.065, 0.04, 0.11);
        head.add(eye);
      });

      const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.46, -0.4),
        new THREE.Vector3(0.06, 0.62, -0.62),
        new THREE.Vector3(-0.04, 0.8, -0.74),
      ]);
      const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.026, 6, false);
      geometries.push(tailGeo);
      const tail = new THREE.Mesh(tailGeo, mats.crimsonArmorMat);
      animPivot.add(tail);
      tailRig = tail;

      if (detailLevel >= 2) {
        const tipGeo = new THREE.OctahedronGeometry(0.048, 0);
        geometries.push(tipGeo);
        const tip = new THREE.Mesh(tipGeo, mats.chaosCoreMat);
        tip.position.set(-0.04, 0.81, -0.75);
        tail.add(tip);
      }

      if (detailLevel >= 3) {
        const emberGeo = new THREE.OctahedronGeometry(0.04, 0);
        geometries.push(emberGeo);
        for (let m = 0; m < 3; m++) {
          const ember = new THREE.Mesh(emberGeo, mats.chaosCoreMat);
          animPivot.add(ember);
          floatParts.push({
            obj: ember,
            baseY: 0.72 + m * 0.08,
            phase: m * 2.1,
            radius: 0.46,
            angle0: (m * Math.PI * 2) / 3,
          });
        }
      }
    } else {
      // ABYSSAL DEMON WARLORD / IFRIT / PYRE COLOSSUS / ASH PYROMANCER
      const isLord = tag.includes('lord') || atk >= 5;
      const sc = isLord ? 1.15 : 1.0;

      // Armored Demon Greaves
      const legGeo = makeLathe(
        [
          [0.0, 0.0],
          [0.105, 0.0],
          [0.085, 0.22],
          [0.1, 0.48],
          [0.0, 0.48],
        ],
        detailLevel >= 2 ? 12 : 6
      );
      geometries.push(legGeo);
      [-0.15 * sc, 0.15 * sc].forEach((lx) => {
        const leg = new THREE.Mesh(legGeo, mats.fluoriteMat);
        leg.position.set(lx, 0, 0);
        leg.scale.set(1, sc, 1.2);
        leg.castShadow = true;
        animPivot.add(leg);
      });

      if (detailLevel >= 1) {
        const kneeSpurGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
        geometries.push(kneeSpurGeo);
        [-0.15 * sc, 0.15 * sc].forEach((lx) => {
          const spur = new THREE.Mesh(kneeSpurGeo, mats.bronzeMat);
          spur.position.set(lx, 0.34 * sc, 0.1 * sc);
          spur.rotation.x = 0.65;
          animPivot.add(spur);
        });
      }

      animPivot.add(
        createWarriorCuirass(mats.crimsonArmorMat, mats.bronzeMat, mats.obsidianClothMat, geometries, sc, detailLevel)
      );

      const coreGeo = new THREE.OctahedronGeometry(0.068, detailLevel >= 2 ? 1 : 0);
      geometries.push(coreGeo);
      const core = new THREE.Mesh(coreGeo, mats.chaosCoreMat);
      core.position.set(0, 0.8 * sc, 0.145 * sc);
      core.scale.set(0.9, 1.3, 0.5);
      animPivot.add(core);

      // High+: Volcanic Dorsal Crystal Crown & Exposed Back Magma Spine (huge silhouette boost from behind!)
      if (detailLevel >= 2) {
        const backSpineGeo = new THREE.OctahedronGeometry(0.055, 0);
        const shardGeo = new THREE.ConeGeometry(0.052, 0.36 * sc, 4);
        geometries.push(backSpineGeo, shardGeo);

        const backSpine = new THREE.Mesh(backSpineGeo, mats.chaosCoreMat);
        backSpine.position.set(0, 0.8 * sc, -0.155 * sc);
        backSpine.scale.set(0.9, 1.8, 0.55);
        animPivot.add(backSpine);

        [-1, 1].forEach((dir) => {
          const upperShard = new THREE.Mesh(shardGeo, mats.fluoriteMat);
          upperShard.position.set(dir * 0.18 * sc, 1.02 * sc, -0.17 * sc);
          upperShard.rotation.z = -dir * 0.45;
          upperShard.rotation.x = -0.32;
          upperShard.castShadow = true;
          animPivot.add(upperShard);

          const lowerShard = new THREE.Mesh(shardGeo, mats.chaosCoreMat);
          lowerShard.position.set(dir * 0.13 * sc, 0.82 * sc, -0.18 * sc);
          lowerShard.scale.setScalar(0.75);
          lowerShard.rotation.z = -dir * 0.72;
          lowerShard.rotation.x = -0.4;
          animPivot.add(lowerShard);
        });
      }

      // Jagged Shoulder Blades + Connected Arms + Forged Curved Scimitars
      const pauldronShape = new THREE.Shape();
      pauldronShape.moveTo(-0.14, -0.1);
      pauldronShape.lineTo(0.08, 0.22);
      pauldronShape.lineTo(0.22, 0.02);
      pauldronShape.lineTo(0.04, -0.12);
      pauldronShape.closePath();
      const pauldronGeo = new THREE.ExtrudeGeometry(pauldronShape, {
        depth: 0.18,
        bevelEnabled: detailLevel >= 1,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: detailLevel >= 2 ? 2 : 1,
      });
      pauldronGeo.center();
      const upperArmGeo = new THREE.CapsuleGeometry(0.048, 0.2, 4, 6);
      const forearmGeo = new THREE.CapsuleGeometry(0.044, 0.22, 4, 6);
      geometries.push(pauldronGeo, upperArmGeo, forearmGeo);

      [-1, 1].forEach((dir) => {
        const p = new THREE.Mesh(pauldronGeo, mats.bronzeMat);
        p.position.set(dir * 0.34 * sc, 0.94 * sc, 0);
        p.scale.set(dir, 1.0, 1.0);
        p.rotation.z = -dir * 0.32;
        p.castShadow = true;
        animPivot.add(p);

        const ua = new THREE.Mesh(upperArmGeo, mats.fluoriteMat);
        ua.position.set(dir * 0.34 * sc, 0.78 * sc, 0.02);
        ua.rotation.z = dir * 0.26;
        animPivot.add(ua);

        const fa = new THREE.Mesh(forearmGeo, mats.crimsonArmorMat);
        fa.position.set(dir * 0.4 * sc, 0.66 * sc, 0.18 * sc);
        fa.rotation.x = -1.15;
        animPivot.add(fa);

        const sword = createForgedBlade(
          mats.bluedSteelMat,
          mats.bronzeMat,
          geometries,
          0.74 * sc,
          true,
          detailLevel,
          mats.chaosCoreMat
        );
        sword.position.set(dir * 0.42 * sc, 0.64 * sc, 0.3 * sc);
        sword.rotation.x = 0.65;
        sword.rotation.z = dir * -0.18;
        animPivot.add(sword);
      });

      // Sculpted Horned Demon Warhelm
      const head = new THREE.Group();
      head.position.set(0, 1.16 * sc, 0.03);
      animPivot.add(head);
      headRig = head;

      const helmGeo = makeLathe(
        [
          [0.0, -0.13],
          [0.105, -0.1],
          [0.13, 0.02],
          [0.125, 0.14],
          [0.065, 0.21],
          [0.0, 0.22],
        ],
        detailLevel >= 2 ? 12 : 8
      );
      const crestGeo = new THREE.BoxGeometry(0.03, 0.15, 0.18);
      const visorSlitGeo = new THREE.CylinderGeometry(0.134, 0.134, 0.036, 8, 1, true, -0.8, 1.6);
      const eyeGeo = new THREE.OctahedronGeometry(0.017, 1);
      geometries.push(helmGeo, crestGeo, visorSlitGeo, eyeGeo);

      const helm = new THREE.Mesh(helmGeo, mats.fluoriteMat);
      helm.castShadow = true;
      head.add(helm);

      const crest = new THREE.Mesh(crestGeo, mats.bronzeMat);
      crest.position.set(0, 0.17, 0);
      head.add(crest);

      const visorSlit = new THREE.Mesh(visorSlitGeo, mats.voidMat);
      visorSlit.position.set(0, 0.03, 0.01);
      visorSlit.rotation.y = Math.PI * 0.5;
      head.add(visorSlit);

      [-0.048, 0.048].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.03, 0.134);
        head.add(eye);
      });

      [-1, 1].forEach((dir) => {
        const hornCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.09, 0.13, 0.0),
          new THREE.Vector3(dir * 0.22, 0.24, -0.02),
          new THREE.Vector3(dir * 0.19, 0.42, 0.09),
        ]);
        const hornGeo = new THREE.TubeGeometry(hornCurve, detailLevel >= 2 ? 14 : 8, 0.026, 6, false);
        geometries.push(hornGeo);
        head.add(new THREE.Mesh(hornGeo, mats.boneIvoryMat));
      });

      if (detailLevel >= 3) {
        const cinderGeo = new THREE.OctahedronGeometry(0.042, 0);
        geometries.push(cinderGeo);
        for (let m = 0; m < 4; m++) {
          const cinder = new THREE.Mesh(cinderGeo, m % 2 === 0 ? mats.chaosCoreMat : mats.fluoriteMat);
          animPivot.add(cinder);
          floatParts.push({
            obj: cinder,
            baseY: (0.76 + (m % 2) * 0.26) * sc,
            phase: m * 1.55,
            radius: 0.48 * sc,
            angle0: (m * Math.PI) / 2,
          });
        }
      }
    }
  } else {
    // VITAL: Sculpted Basilisk Serpent vs Woodland Stag Sovereign vs Jeweled Scarab
    if (tag.includes('venom')) {
      const coilPoints: THREE.Vector3[] = [];
      const turns = 2.4;
      const steps = detailLevel >= 2 ? 32 : 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        if (t < 0.72) {
          const ang = (t / 0.72) * Math.PI * 2 * turns;
          const r = 0.38 - (t / 0.72) * 0.24;
          const y = 0.08 + (t / 0.72) * 0.42;
          coilPoints.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
        } else {
          const u = (t - 0.72) / 0.28;
          coilPoints.push(new THREE.Vector3(0, 0.5 + u * 0.56, Math.sin(u * Math.PI) * 0.14));
        }
      }
      const serpentCurve = new THREE.CatmullRomCurve3(coilPoints);
      const serpentGeo = new THREE.TubeGeometry(serpentCurve, detailLevel >= 2 ? 48 : 28, 0.085, 8, false);
      geometries.push(serpentGeo);
      const serpentBody = new THREE.Mesh(serpentGeo, mats.emeraldArmorMat);
      serpentBody.castShadow = true;
      animPivot.add(serpentBody);

      // Dorsal spine scales & venom nodes on High+
      if (detailLevel >= 2) {
        const finGeo = new THREE.ConeGeometry(0.036, 0.14, 4);
        geometries.push(finGeo);
        for (let f = 0; f < 5; f++) {
          const u = 0.48 + f * 0.095;
          const p = serpentCurve.getPoint(u);
          const fin = new THREE.Mesh(finGeo, f % 2 === 0 ? mats.goldMat : mats.venomGreenMat);
          fin.position.set(p.x, p.y + 0.08, p.z - 0.05);
          fin.rotation.x = -0.45;
          animPivot.add(fin);
        }
      }

      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(0, -0.18);
      hoodShape.quadraticCurveTo(0.28, -0.04, 0.22, 0.16);
      hoodShape.quadraticCurveTo(0, 0.24, -0.22, 0.16);
      hoodShape.quadraticCurveTo(-0.28, -0.04, 0, -0.18);
      const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
        depth: 0.03,
        bevelEnabled: detailLevel >= 1,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: detailLevel >= 2 ? 2 : 1,
      });
      geometries.push(hoodGeo);
      const hood = new THREE.Mesh(hoodGeo, mats.goldMat);
      hood.position.set(0, 0.9, -0.02);
      hood.rotation.x = 0.18;
      animPivot.add(hood);

      const head = new THREE.Group();
      head.position.set(0, 1.08, 0.12);
      animPivot.add(head);
      headRig = head;

      const snoutGeo = makeLathe(
        [
          [0.0, -0.12],
          [0.11, -0.06],
          [0.11, 0.06],
          [0.07, 0.2],
          [0.03, 0.28],
          [0.0, 0.29],
        ],
        detailLevel >= 2 ? 10 : 6
      );
      snoutGeo.rotateX(Math.PI / 2);
      const fangGeo = new THREE.ConeGeometry(0.018, 0.09, 4);
      const eyeGeo = new THREE.OctahedronGeometry(0.018, 1);
      geometries.push(snoutGeo, fangGeo, eyeGeo);

      const snout = new THREE.Mesh(snoutGeo, mats.emeraldArmorMat);
      snout.scale.set(1.05, 0.72, 1.0);
      head.add(snout);

      [-0.04, 0.04].forEach((fx) => {
        const fang = new THREE.Mesh(fangGeo, mats.boneIvoryMat);
        fang.position.set(fx, -0.055, 0.21);
        fang.rotation.x = Math.PI;
        head.add(fang);

        const eye = new THREE.Mesh(eyeGeo, mats.venomGreenMat);
        eye.position.set(fx * 1.6, 0.04, 0.12);
        head.add(eye);
      });

      if (detailLevel >= 3) {
        const sporeGeo = new THREE.OctahedronGeometry(0.034, 0);
        geometries.push(sporeGeo);
        for (let m = 0; m < 3; m++) {
          const sp = new THREE.Mesh(sporeGeo, mats.venomGreenMat);
          animPivot.add(sp);
          floatParts.push({
            obj: sp,
            baseY: 0.78 + m * 0.12,
            phase: m * 2.0,
            radius: 0.42,
            angle0: (m * Math.PI * 2) / 3,
          });
        }
      }
    } else if (tag.includes('stag')) {
      const bodyGeo = makeLathe(
        [
          [0.0, -0.38],
          [0.14, -0.3],
          [0.13, -0.08],
          [0.17, 0.16],
          [0.19, 0.34],
          [0.12, 0.44],
          [0.0, 0.45],
        ],
        detailLevel >= 2 ? 14 : 8
      );
      bodyGeo.rotateX(Math.PI / 2);
      const legGeo = new THREE.CapsuleGeometry(0.036, 0.34, 4, 6);
      const neckCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.52, 0.32),
        new THREE.Vector3(0, 0.74, 0.4),
        new THREE.Vector3(0, 0.94, 0.42),
      ]);
      const neckGeo = new THREE.TubeGeometry(neckCurve, 10, 0.08, 8, false);
      geometries.push(bodyGeo, legGeo, neckGeo);

      const body = new THREE.Mesh(bodyGeo, mats.emeraldArmorMat);
      body.position.set(0, 0.5, 0);
      body.castShadow = true;
      animPivot.add(body);

      if (detailLevel >= 2) {
        const saddleGeo = new THREE.BoxGeometry(0.36, 0.12, 0.42);
        const crestLeafGeo = new THREE.OctahedronGeometry(0.06, 0);
        geometries.push(saddleGeo, crestLeafGeo);
        const saddle = new THREE.Mesh(saddleGeo, mats.goldMat);
        saddle.position.set(0, 0.59, 0.02);
        animPivot.add(saddle);

        const chestCore = new THREE.Mesh(crestLeafGeo, mats.vitalAmberMat);
        chestCore.position.set(0, 0.54, 0.42);
        animPivot.add(chestCore);
      }

      [
        [-0.13, 0.22, 0.26],
        [0.13, 0.22, 0.26],
        [-0.13, 0.22, -0.26],
        [0.13, 0.22, -0.26],
      ].forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, mats.bronzeMat);
        leg.position.set(lx, ly, lz);
        animPivot.add(leg);
      });

      const neck = new THREE.Mesh(neckGeo, mats.agedLeatherMat);
      animPivot.add(neck);

      const head = new THREE.Group();
      head.position.set(0, 0.98, 0.44);
      animPivot.add(head);
      headRig = head;

      const skullGeo = makeLathe(
        [
          [0.0, -0.1],
          [0.1, -0.04],
          [0.095, 0.06],
          [0.055, 0.18],
          [0.025, 0.26],
          [0.0, 0.27],
        ],
        8
      );
      skullGeo.rotateX(Math.PI / 2);
      const eyeGeo = new THREE.OctahedronGeometry(0.018, 1);
      geometries.push(skullGeo, eyeGeo);

      const skull = new THREE.Mesh(skullGeo, mats.boneIvoryMat);
      skull.scale.set(0.95, 0.85, 1.0);
      head.add(skull);

      [-0.055, 0.055].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, mats.vitalAmberMat);
        eye.position.set(ex, 0.03, 0.08);
        head.add(eye);
      });

      [-1, 1].forEach((dir) => {
        const mainBeam = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.05, 0.08, -0.02),
          new THREE.Vector3(dir * 0.18, 0.24, -0.08),
          new THREE.Vector3(dir * 0.28, 0.42, 0.02),
          new THREE.Vector3(dir * 0.22, 0.56, 0.1),
        ]);
        const tine = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.18, 0.24, -0.08),
          new THREE.Vector3(dir * 0.14, 0.4, 0.06),
        ]);
        const beamGeo = new THREE.TubeGeometry(mainBeam, detailLevel >= 2 ? 14 : 8, 0.018, 6, false);
        const tineGeo = new THREE.TubeGeometry(tine, 8, 0.014, 5, false);
        geometries.push(beamGeo, tineGeo);
        head.add(new THREE.Mesh(beamGeo, mats.goldMat));
        head.add(new THREE.Mesh(tineGeo, mats.goldMat));

        if (detailLevel >= 2) {
          const blossomGeo = new THREE.OctahedronGeometry(0.034, 0);
          geometries.push(blossomGeo);
          const bl = new THREE.Mesh(blossomGeo, mats.vitalAmberMat);
          bl.position.set(dir * 0.28, 0.42, 0.02);
          head.add(bl);
        }
      });

      if (detailLevel >= 3) {
        const pollenGeo = new THREE.OctahedronGeometry(0.032, 0);
        geometries.push(pollenGeo);
        for (let m = 0; m < 3; m++) {
          const p = new THREE.Mesh(pollenGeo, mats.vitalAmberMat);
          animPivot.add(p);
          floatParts.push({
            obj: p,
            baseY: 0.86 + m * 0.14,
            phase: m * 2.1,
            radius: 0.45,
            angle0: (m * Math.PI * 2) / 3,
          });
        }
      }
    } else {
      // JEWELED SCARAB SENTINEL / AMBER SWARM / SUNLIT BLOOM / THORN DRUID
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0.28);
      wingShape.quadraticCurveTo(0.28, 0.2, 0.24, -0.14);
      wingShape.quadraticCurveTo(0.14, -0.34, 0, -0.36);
      wingShape.closePath();
      const elytraGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.12,
        bevelEnabled: detailLevel >= 1,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: detailLevel >= 2 ? 2 : 1,
      });
      elytraGeo.rotateX(Math.PI / 2);

      const thoraxGeo = makeLathe(
        [
          [0.0, 0.0],
          [0.24, 0.02],
          [0.26, 0.12],
          [0.18, 0.2],
          [0.0, 0.22],
        ],
        detailLevel >= 2 ? 14 : 8
      );
      const gemGeo = new THREE.OctahedronGeometry(0.09, detailLevel >= 2 ? 1 : 0);
      geometries.push(elytraGeo, thoraxGeo, gemGeo);

      [-1, 1].forEach((dir) => {
        const wing = new THREE.Mesh(elytraGeo, mats.emeraldArmorMat);
        wing.scale.set(dir, 1, 1);
        wing.position.set(dir * 0.04, 0.46, -0.02);
        wing.rotation.z = -dir * 0.16;
        wing.castShadow = true;
        animPivot.add(wing);

        // High+: Translucent membranous lower wings tucked under elytra that gently flutter!
        if (detailLevel >= 2) {
          const innerPivot = new THREE.Group();
          innerPivot.position.set(dir * 0.08, 0.52, -0.04);
          const innerWing = new THREE.Mesh(elytraGeo, mats.vitalAmberMat);
          innerWing.scale.set(dir * 0.85, 0.35, 1.15);
          innerWing.rotation.z = -dir * 0.36;
          innerPivot.add(innerWing);
          animPivot.add(innerPivot);
          if (dir < 0) leftWings.push(innerPivot);
          else rightWings.push(innerPivot);
        }
      });

      const thorax = new THREE.Mesh(thoraxGeo, mats.bronzeMat);
      thorax.position.set(0, 0.34, 0.18);
      thorax.scale.set(1.0, 0.85, 0.85);
      animPivot.add(thorax);

      const jewel = new THREE.Mesh(gemGeo, mats.vitalAmberMat);
      jewel.position.set(0, 0.54, 0.12);
      jewel.scale.set(1.0, 0.6, 1.3);
      animPivot.add(jewel);

      if (detailLevel >= 2) {
        const nodeGeo = new THREE.OctahedronGeometry(0.045, 0);
        geometries.push(nodeGeo);
        [-0.14, 0, 0.14].forEach((nz, idx) => {
          const node = new THREE.Mesh(nodeGeo, idx === 1 ? mats.goldMat : mats.vitalAmberMat);
          node.position.set(0, 0.54 - Math.abs(nz) * 0.25, -0.18 + nz);
          animPivot.add(node);
        });
      }

      const femurGeo = new THREE.CapsuleGeometry(0.026, 0.2, 4, 6);
      const tibiaGeo = new THREE.CapsuleGeometry(0.02, 0.22, 4, 6);
      geometries.push(femurGeo, tibiaGeo);
      for (let i = 0; i < 3; i++) {
        const lz = 0.22 - i * 0.22;
        [-1, 1].forEach((dir) => {
          const femur = new THREE.Mesh(femurGeo, mats.goldMat);
          femur.position.set(dir * 0.3, 0.34, lz);
          femur.rotation.z = dir * 1.1;
          animPivot.add(femur);

          const tibia = new THREE.Mesh(tibiaGeo, mats.darkBronzeMat);
          tibia.position.set(dir * 0.44, 0.16, lz);
          tibia.rotation.z = -dir * 0.18;
          animPivot.add(tibia);
        });
      }

      const head = new THREE.Group();
      head.position.set(0, 0.38, 0.38);
      animPivot.add(head);
      headRig = head;

      const headGeo = makeLathe(
        [
          [0.0, -0.08],
          [0.095, -0.07],
          [0.132, -0.01],
          [0.115, 0.055],
          [0.055, 0.085],
          [0.0, 0.092],
        ],
        detailLevel >= 2 ? 12 : 8
      );
      headGeo.rotateX(Math.PI / 2);
      const mandibleShape = new THREE.Shape();
      mandibleShape.moveTo(0, 0);
      mandibleShape.quadraticCurveTo(0.075, 0.04, 0.05, 0.14);
      mandibleShape.lineTo(0.02, 0.12);
      mandibleShape.quadraticCurveTo(0.04, 0.05, 0, 0.02);
      mandibleShape.closePath();
      const mandibleGeo = new THREE.ExtrudeGeometry(mandibleShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 1,
      });
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.02, 0.08),
        new THREE.Vector3(0, 0.08, 0.22),
        new THREE.Vector3(0, 0.2, 0.28),
      ]);
      const hornGeo = new THREE.TubeGeometry(hornCurve, 8, 0.022, 6, false);
      const eyeGeo = new THREE.OctahedronGeometry(0.022, 1);
      geometries.push(headGeo, mandibleGeo, hornGeo, eyeGeo);

      const headMesh = new THREE.Mesh(headGeo, mats.darkBronzeMat);
      headMesh.scale.set(1.12, 0.78, 1.18);
      head.add(headMesh);
      head.add(new THREE.Mesh(hornGeo, mats.goldMat));
      [-1, 1].forEach((dir) => {
        const mandible = new THREE.Mesh(mandibleGeo, mats.bronzeMat);
        mandible.position.set(dir * 0.045, -0.025, 0.07);
        mandible.rotation.x = Math.PI * 0.5;
        mandible.scale.x = dir;
        head.add(mandible);
      });

      [-0.075, 0.075].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, mats.vitalAmberMat);
        eye.position.set(ex, 0.02, 0.09);
        head.add(eye);
      });

      if (detailLevel >= 3) {
        const haloGeo = new THREE.TorusGeometry(0.26, 0.014, 6, 20);
        const sporeGeo = new THREE.OctahedronGeometry(0.032, 0);
        geometries.push(haloGeo, sporeGeo);
        const halo = new THREE.Mesh(haloGeo, mats.goldMat);
        halo.position.set(0, 0.78, -0.05);
        animPivot.add(halo);
        spinPart = halo;

        for (let m = 0; m < 3; m++) {
          const sp = new THREE.Mesh(sporeGeo, mats.vitalAmberMat);
          animPivot.add(sp);
          floatParts.push({
            obj: sp,
            baseY: 0.72 + m * 0.1,
            phase: m * 2.1,
            radius: 0.42,
            angle0: (m * Math.PI * 2) / 3,
          });
        }
      }
    }
  }

  // Universal High/Ultra School Craftsmanship Accents (visible from both combat and rear angles)
  if (detailLevel >= 2) {
    const accentPaudronGeo = new THREE.OctahedronGeometry(0.082, 0);
    geometries.push(accentPaudronGeo);
    [-1, 1].forEach((dir) => {
      const crest = new THREE.Mesh(accentPaudronGeo, school === 'chaos' ? mats.darkBronzeMat : mats.goldMat);
      crest.position.set(dir * 0.27, 0.94, -0.02);
      crest.scale.set(0.85, 1.35, 0.7);
      crest.rotation.z = -dir * 0.42;
      animPivot.add(crest);
    });

    if (school === 'kinet') {
      const aetherArcGeo = new THREE.TorusGeometry(0.24, 0.015, 6, 16, Math.PI * 1.25);
      geometries.push(aetherArcGeo);
      const aetherArc = new THREE.Mesh(aetherArcGeo, mats.etherCoreMat);
      aetherArc.position.set(0, 0.96, -0.18);
      aetherArc.rotation.z = -Math.PI * 0.125;
      animPivot.add(aetherArc);
    } else if (school === 'synth') {
      const ventGeo = new THREE.CylinderGeometry(0.036, 0.046, 0.22, 6);
      geometries.push(ventGeo);
      [-0.12, 0.12].forEach((vx) => {
        const vent = new THREE.Mesh(ventGeo, mats.goldMat);
        vent.position.set(vx, 0.98, -0.16);
        vent.rotation.x = -0.28;
        animPivot.add(vent);
      });
    } else if (school === 'chaos') {
      const ridgeGeo = new THREE.ConeGeometry(0.042, 0.2, 4);
      geometries.push(ridgeGeo);
      for (let r = 0; r < 3; r++) {
        const spike = new THREE.Mesh(ridgeGeo, r === 0 ? mats.chaosCoreMat : mats.goldMat);
        spike.position.set(0, 0.98 - r * 0.16, -0.18 - r * 0.02);
        spike.rotation.x = -0.95;
        animPivot.add(spike);
      }
    } else if (school === 'vital') {
      const frondGeo = new THREE.OctahedronGeometry(0.068, 0);
      geometries.push(frondGeo);
      [-1, 1].forEach((dir) => {
        const frond = new THREE.Mesh(frondGeo, mats.vitalAmberMat);
        frond.position.set(dir * 0.2, 1.04, -0.12);
        frond.scale.set(0.55, 1.8, 0.55);
        frond.rotation.z = -dir * 0.55;
        animPivot.add(frond);
      });
    }
  }

  // Royal 4-Point Veteran / Ascended Aura Crown
  const vetGeo = new THREE.TorusGeometry(0.32, 0.022, 6, 24);
  const vetPointGeo = new THREE.ConeGeometry(0.038, 0.12, 4);
  geometries.push(vetGeo, vetPointGeo);
  const vetMat = new THREE.MeshStandardMaterial({
    color: TAROT_PALETTE.gold,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x5c4212,
    emissiveIntensity: 0.35,
  });
  customMats.push(vetMat);
  const vetHalo = new THREE.Group();
  const vetRingMesh = new THREE.Mesh(vetGeo, vetMat);
  vetRingMesh.rotation.x = Math.PI / 2;
  vetHalo.add(vetRingMesh);
  for (let p = 0; p < 4; p++) {
    const a = (p * Math.PI) / 2;
    const spire = new THREE.Mesh(vetPointGeo, vetMat);
    spire.position.set(Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32);
    vetHalo.add(spire);
  }
  vetHalo.position.y = 1.56;
  vetHalo.visible = false;
  animPivot.add(vetHalo);

  // Shield Aura Ring
  const shieldRingGeo = new THREE.RingGeometry(0.6, 0.67, 28);
  shieldRingGeo.rotateX(-Math.PI / 2);
  geometries.push(shieldRingGeo);
  const shieldRingMat = new THREE.MeshStandardMaterial({
    color: 0x1e4c47,
    emissive: TAROT_PALETTE.ether,
    emissiveIntensity: 1.2,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  customMats.push(shieldRingMat);
  const shieldRing = new THREE.Mesh(shieldRingGeo, shieldRingMat);
  shieldRing.position.y = 0.04;
  shieldRing.visible = false;
  group.add(shieldRing);

  // Guard Stance Protective Front Arc + High/Ultra Translucent Energy Barrier
  const guardArcGeo = new THREE.RingGeometry(0.42, 0.52, 16, 1, -Math.PI * 0.42, Math.PI * 0.84);
  guardArcGeo.rotateX(-Math.PI / 2);
  guardArcGeo.rotateY(-Math.PI / 2);
  geometries.push(guardArcGeo);
  const guardArcMat = new THREE.MeshStandardMaterial({
    color: 0x285f70,
    emissive: 0x7be3ff,
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  customMats.push(guardArcMat);
  const guardArc = new THREE.Mesh(guardArcGeo, guardArcMat);
  guardArc.position.set(0, 0.055, 0.14);
  guardArc.visible = false;
  group.add(guardArc);

  let guardBarrier: THREE.Mesh | null = null;
  let guardBarrierMat: THREE.MeshStandardMaterial | null = null;
  if (detailLevel >= 2) {
    const barrierGeo = new THREE.CylinderGeometry(
      0.55,
      0.55,
      0.92,
      14,
      1,
      true,
      -Math.PI * 0.34,
      Math.PI * 0.68
    );
    geometries.push(barrierGeo);
    guardBarrierMat = new THREE.MeshStandardMaterial({
      color: 0x163f3b,
      emissive: 0x62e8dc,
      emissiveIntensity: 1.15,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    customMats.push(guardBarrierMat);
    guardBarrier = new THREE.Mesh(barrierGeo, guardBarrierMat);
    guardBarrier.position.set(0, 0.56, 0.12);
    guardBarrier.visible = false;
    group.add(guardBarrier);
  }

  const badgeAnchor = new THREE.Object3D();
  badgeAnchor.position.set(0, side === 'enemy' ? 1.84 : 1.62, 0);
  group.add(badgeAnchor);

  const phaseOffset = atk * 0.9 + hp * 0.5;
  let jumpHeight = 0;
  let jumpVel = 0;
  let lungeX = 0;
  let lungeTargetX = 0;
  let lungeZ = 0;
  let lungeTilt = 0;
  let lungeYawOffset = 0;
  let attackActive = false;
  let attackElapsed = 0;
  let attackPeakZ = 1.45;
  let attackSpeed = 1.0;
  let interceptTimer = 0;
  let spawnTimer = 0;
  let ascendTimer = 0;
  let hitShake = 0;
  let scaleY = 1.0;
  let dying = false;
  let deathTimer = 0;
  const deathFadeMats: Array<{ mat: THREE.Material; baseOpacity: number }> = [];
  let currentStance: 'attack' | 'guard' = 'attack';
  let isExhausted = false;
  const deathSpinDir = side === 'player' ? 1 : -1;

  const SPAWN_DURATION = 0.5;
  const DEATH_DURATION = 0.6;
  const ATTACK_WINDUP = 0.2;
  const ATTACK_DASH = 0.1;
  const ATTACK_RETURN = 0.2;
  const ATTACK_TOTAL = ATTACK_WINDUP + ATTACK_DASH + ATTACK_RETURN;

  return {
    id,
    name,
    school,
    side,
    atk,
    hp,
    group,
    hitCollider,
    badgeAnchor,
    triggerSpawn: () => {
      spawnTimer = SPAWN_DURATION;
      scaleY = 1.0;
      jumpHeight = 0;
      jumpVel = 0;
      group.scale.set(0.01, 0.01, 0.01);
      animPivot.position.y = -0.25;
    },
    triggerAscend: () => {
      ascendTimer = 0.52;
      jumpVel = 5.4;
      scaleY = 1.28;
    },
    triggerJump: () => {
      jumpVel = 5.2;
      scaleY = 1.24;
    },
    triggerAttack: (mode = 'melee', aimYawOffset = 0, speedScale = 1.0) => {
      lungeX = 0;
      lungeTargetX = 0;
      lungeYawOffset = aimYawOffset;
      attackActive = true;
      attackElapsed = 0;
      attackSpeed = Math.max(0.5, speedScale);
      attackPeakZ = mode === 'direct' ? 0.52 : 1.45;
      interceptTimer = 0;
    },
    triggerIntercept: (dirX: number) => {
      attackActive = false;
      lungeX = 0;
      lungeTargetX = dirX * 1.35;
      lungeZ = 0.35;
      interceptTimer = 0.32;
      lungeTilt = 0.18;
      scaleY = 1.12;
    },
    triggerHit: () => {
      lungeZ = -0.34;
      lungeTilt = -0.28;
      scaleY = 0.72;
      hitShake = 0.28;
    },
    triggerDeath: () => {
      if (dying) return;
      dying = true;
      deathTimer = 0;
      attackActive = false;
      lungeZ = -0.22;

      if (deathFadeMats.length === 0) {
        const clonedCache = new Map<THREE.Material, THREE.Material>();
        group.traverse((obj) => {
          if (obj === hitCollider) return;
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          const applyClone = (orig: THREE.Material): THREE.Material => {
            const existing = clonedCache.get(orig);
            if (existing) return existing;
            const cloned = orig.clone();
            cloned.transparent = true;
            clonedCache.set(orig, cloned);
            customMats.push(cloned);
            deathFadeMats.push({ mat: cloned, baseOpacity: orig.opacity ?? 1 });
            return cloned;
          };
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(applyClone);
          } else {
            mesh.material = applyClone(mesh.material);
          }
        });
      }
    },
    setVeteran: (count: number) => {
      vetHalo.visible = count > 0;
    },
    setShielded: (shielded: boolean) => {
      shieldRing.visible = shielded;
    },
    setStance: (stance: 'attack' | 'guard', exhausted = false) => {
      currentStance = stance;
      isExhausted = exhausted;
      guardArc.visible = stance === 'guard';
      if (guardBarrier) guardBarrier.visible = stance === 'guard';
    },
    update: (time: number, dt = 0.016) => {
      const safeDt = Math.min(dt, 0.05);

      if (dying) {
        deathTimer += safeDt;
        const p = Math.min(1, deathTimer / DEATH_DURATION);
        const fade = Math.max(0, 1 - p);
        const s = Math.max(0.05, 1 - p * 0.55);
        group.scale.set(1, 1, 1);
        animPivot.scale.set(s, s * (1 - p * 0.25), s);
        animPivot.position.y = 0.09 - p * 0.34;
        animPivot.position.z = THREE.MathUtils.damp(animPivot.position.z, -0.52, 8, safeDt);
        animPivot.rotation.x = -p * 1.25;
        animPivot.rotation.z = deathSpinDir * p * 0.72;
        for (let i = 0; i < deathFadeMats.length; i++) {
          const entry = deathFadeMats[i];
          entry.mat.opacity = entry.baseOpacity * fade;
        }
        shadow.scale.setScalar(s);
        shadowMat.opacity = 0.72 * fade;
        return;
      }

      if (jumpHeight > 0 || jumpVel !== 0) {
        jumpHeight += jumpVel * safeDt;
        jumpVel -= 18.0 * safeDt;
        if (jumpHeight <= 0) {
          jumpHeight = 0;
          jumpVel = 0;
          scaleY = 0.78;
        }
      }

      if (spawnTimer > 0) {
        spawnTimer = Math.max(0, spawnTimer - safeDt);
      }
      if (ascendTimer > 0) {
        ascendTimer = Math.max(0, ascendTimer - safeDt);
      }
      if (hitShake > 0) {
        hitShake = Math.max(0, hitShake - safeDt);
      }

      const restZ = currentStance === 'guard' ? -0.14 : 0;
      const restTilt = isExhausted ? -0.22 : currentStance === 'guard' ? -0.06 : 0.04;

      if (attackActive) {
        attackElapsed += safeDt * attackSpeed;
        if (attackElapsed < ATTACK_WINDUP) {
          // Phase 1 (0.2s): Wind-up — step back & tilt ready
          const u = attackElapsed / ATTACK_WINDUP;
          const ease = u * (2 - u);
          lungeZ = -0.52 * ease;
          lungeTilt = -0.26 * ease;
          scaleY = 1.0 - 0.1 * ease;
        } else if (attackElapsed < ATTACK_WINDUP + ATTACK_DASH) {
          // Phase 2 (0.1s): Dash lunge to target
          const u = (attackElapsed - ATTACK_WINDUP) / ATTACK_DASH;
          const ease = u * u;
          lungeZ = THREE.MathUtils.lerp(-0.52, attackPeakZ, ease);
          lungeTilt = THREE.MathUtils.lerp(-0.26, 0.34, ease);
          scaleY = THREE.MathUtils.lerp(0.9, 1.18, ease);
        } else if (attackElapsed < ATTACK_TOTAL) {
          // Phase 3+4 (0.2s): Return smoothly to lane slot
          const u = (attackElapsed - (ATTACK_WINDUP + ATTACK_DASH)) / ATTACK_RETURN;
          const ease = 1 - Math.pow(1 - u, 2);
          lungeZ = THREE.MathUtils.lerp(attackPeakZ, restZ, ease);
          lungeTilt = THREE.MathUtils.lerp(0.34, restTilt, ease);
          lungeYawOffset = THREE.MathUtils.lerp(lungeYawOffset, 0, ease);
          scaleY = THREE.MathUtils.lerp(1.18, 1.0, ease);
        } else {
          attackActive = false;
          lungeZ = restZ;
          lungeTilt = restTilt;
          lungeYawOffset = 0;
          scaleY = 1.0;
        }
      } else if (interceptTimer > 0) {
        interceptTimer -= safeDt;
        lungeX = THREE.MathUtils.damp(lungeX, lungeTargetX, 18, safeDt);
        lungeZ = THREE.MathUtils.damp(lungeZ, 0.95, 20, safeDt);
        lungeTilt = THREE.MathUtils.damp(lungeTilt, 0.32, 16, safeDt);
      } else {
        lungeX = THREE.MathUtils.damp(lungeX, 0, 12, safeDt);
        lungeZ = THREE.MathUtils.damp(lungeZ, restZ, 12, safeDt);
        lungeTilt = THREE.MathUtils.damp(lungeTilt, restTilt, 12, safeDt);
        lungeYawOffset = THREE.MathUtils.damp(lungeYawOffset, 0, 12, safeDt);
      }

      // Ground-up Spawn emergence: scale 0 -> 1 over 0.50s with magic settle
      const spawnProgress = spawnTimer > 0 ? 1 - spawnTimer / SPAWN_DURATION : 1;
      const spawnEase = 1 - Math.pow(1 - spawnProgress, 3);
      const groupAppear = Math.max(0.01, spawnEase);
      group.scale.set(groupAppear, groupAppear, groupAppear);

      const targetScaleY = currentStance === 'guard' ? 0.94 : 1.0;
      if (!attackActive) {
        scaleY = THREE.MathUtils.damp(scaleY, targetScaleY, 10, safeDt);
      }

      const breathe = 1 + Math.sin(time * 2.5 + phaseOffset) * 0.022;
      const xzScale = 1 / Math.sqrt(Math.max(0.5, scaleY));
      animPivot.scale.set(xzScale, scaleY * breathe, xzScale);

      const bob = Math.sin(time * 2.0 + phaseOffset) * 0.04;
      const spawnGroundRise = spawnTimer > 0 ? (1 - spawnEase) * -0.28 : 0;
      animPivot.position.y =
        0.09 + jumpHeight + spawnGroundRise + (school === 'kinet' && !isExhausted ? bob + 0.06 : bob * 0.25);
      const recoilX = hitShake > 0 ? Math.sin(hitShake * 62) * (hitShake / 0.28) * 0.1 : 0;
      animPivot.position.x = lungeX + recoilX;
      animPivot.position.z = lungeZ;
      animPivot.rotation.x = lungeTilt;
      const spinOffset =
        (spawnTimer > 0 ? (1 - spawnEase) * Math.PI * 0.5 : 0) +
        (ascendTimer > 0 ? (ascendTimer / 0.52) * Math.PI * 2 : 0);
      animPivot.rotation.y = Math.sin(time * 0.85 + phaseOffset) * 0.06 + spinOffset + lungeYawOffset;
      animPivot.rotation.z = hitShake > 0 ? Math.sin(hitShake * 48) * (hitShake / 0.28) * 0.14 : 0;

      const flap = Math.sin(time * 5.0 + phaseOffset) * 0.28;
      leftWings.forEach((w, idx) => {
        w.rotation.y = 0.24 + flap * (idx === 0 ? 1 : 0.7);
      });
      rightWings.forEach((w, idx) => {
        w.rotation.y = -0.24 - flap * (idx === 0 ? 1 : 0.7);
      });
      if (spinPart) spinPart.rotation.z = time * 1.35;
      if (counterSpinPart) counterSpinPart.rotation.z = -time * 2.1;
      if (headRig) {
        headRig.rotation.y = Math.sin(time * 1.2 + phaseOffset) * 0.12;
        headRig.rotation.x = Math.cos(time * 1.8 + phaseOffset) * 0.04;
      }
      if (tailRig) {
        tailRig.rotation.z = Math.sin(time * 4.2 + phaseOffset) * 0.2;
      }
      for (let i = 0; i < floatParts.length; i++) {
        const fp = floatParts[i];
        const a = fp.angle0 + time * 1.5;
        fp.obj.position.set(
          Math.cos(a) * fp.radius,
          fp.baseY + Math.sin(time * 3.1 + fp.phase) * 0.08,
          Math.sin(a) * fp.radius
        );
        fp.obj.rotation.set(time * 1.8, time * 1.2, 0);
      }

      if (vetHalo.visible) vetHalo.rotation.z = time * 1.1;
      if (shieldRing.visible) shieldRing.rotation.y = -time * 1.4;
      if (guardArc.visible) guardArc.material.opacity = 0.52 + 0.25 * Math.sin(time * 3.5);
      if (guardBarrier && guardBarrierMat && guardBarrier.visible) {
        guardBarrierMat.opacity = 0.17 + 0.08 * Math.sin(time * 4.0 + phaseOffset);
      }

      const shadowScale = Math.max(0.15, (1 - jumpHeight * 0.35) * groupAppear);
      shadow.scale.setScalar(shadowScale);
      shadowMat.opacity = 0.72 * shadowScale;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
    },
  };
}
