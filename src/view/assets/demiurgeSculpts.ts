import * as THREE from 'three';
import { getGraphicsDetailTier, type DetailTier } from '../../core/graphicsSettings';
import { TAROT_PALETTE, type TarotMaterialLibrary } from '../materials/tarotMaterials';

export interface DemiurgeModelHandle {
  group: THREE.Group;
  hitCollider: THREE.Mesh;
  staffOriginWorld: THREE.Vector3;
  setOverloadVisual: (overload: boolean) => void;
  setResonanceLevel: (level: number) => void;
  setSoulTetherVisual: (active: boolean) => void;
  triggerCastFlare: () => void;
  triggerHitRecoil: () => void;
  triggerDefeatShatter: () => void;
  update: (time: number, dt?: number) => void;
  dispose: () => void;
}

function makeLatheProfile(coords: Array<[number, number]>, segments = 16): THREE.LatheGeometry {
  const pts = coords.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

export function buildDemiurgeSculpt(
  role: 'player' | 'enemy',
  mats: TarotMaterialLibrary,
  contactTex: THREE.Texture,
  stageIndex = 0,
  detailLevel: DetailTier = getGraphicsDetailTier()
): DemiurgeModelHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  const isPlayer = role === 'player';
  const stage = Math.max(0, Math.min(6, stageIndex));

  // Stage-tailored materials for the 7 unique tournament opponents
  const enemyRobeByStage = [
    mats.royalIndigoClothMat, // S1 Lyra (Kinet)
    mats.bluedSteelMat,       // S2 Torin (Synth)
    mats.emeraldArmorMat,     // S3 Vespera (Vital)
    mats.obsidianClothMat,    // S4 Ignis-Chancellor (Chaos Boss)
    mats.royalIndigoClothMat, // S5 Magister Vael (Kinet Rift)
    mats.darkBronzeMat,       // S6 Chronos-Forged Prime (Synth)
    mats.obsidianClothMat,    // S7 Archdemiurge Corvin (Final Boss)
  ];
  const enemyArmorByStage = [
    mats.bluedSteelMat,
    mats.bronzeMat,
    mats.emeraldArmorMat,
    mats.crimsonArmorMat,
    mats.fluoriteMat,
    mats.goldMat,
    mats.crimsonArmorMat,
  ];
  const enemyTrimByStage = [
    mats.goldMat,
    mats.goldMat,
    mats.bronzeMat,
    mats.bronzeMat,
    mats.bluedSteelMat,
    mats.goldMat,
    mats.goldMat,
  ];
  const enemyEyeByStage = [
    mats.cyanEyeMat,
    mats.cyanEyeMat,
    mats.venomGreenMat,
    mats.crimsonEyeMat,
    mats.cyanEyeMat,
    mats.flameEmissiveMat,
    mats.crimsonEyeMat,
  ];

  const robeMat = isPlayer ? mats.royalIndigoClothMat : enemyRobeByStage[stage];
  const armorMat = isPlayer ? mats.bluedSteelMat : enemyArmorByStage[stage];
  const trimMat = isPlayer ? mats.goldMat : enemyTrimByStage[stage];
  const eyeMat = isPlayer ? mats.cyanEyeMat : enemyEyeByStage[stage];
  const shatterPieces: Array<{ obj: THREE.Object3D; vx: number; vy: number; vz: number; rx: number; rz: number }> = [];
  const registerShatter = (obj: THREE.Object3D, vx: number, vy: number, vz: number, rx = 4.2, rz = 3.5) => {
    shatterPieces.push({ obj, vx, vy, vz, rx, rz });
  };

  // Soft radial contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.3, 2.3);
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

  const animRig = new THREE.Group();
  group.add(animRig);

  let overloadRing: THREE.Mesh | null = null;
  let overloadRingMat: THREE.MeshStandardMaterial | null = null;
  let tetherRing: THREE.Mesh | null = null;
  let tetherRingMat: THREE.MeshStandardMaterial | null = null;
  if (isPlayer && detailLevel >= 2) {
    const ringGeo = new THREE.TorusGeometry(0.92, 0.026, 6, 28);
    ringGeo.rotateX(Math.PI / 2);
    geometries.push(ringGeo);
    overloadRingMat = new THREE.MeshStandardMaterial({
      color: TAROT_PALETTE.overload,
      emissive: TAROT_PALETTE.overload,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    customMats.push(overloadRingMat);
    overloadRing = new THREE.Mesh(ringGeo, overloadRingMat);
    overloadRing.position.y = 0.04;
    overloadRing.visible = false;
    group.add(overloadRing);
  }

  if (isPlayer) {
    const tGeo = new THREE.TorusGeometry(0.76, 0.022, 6, 24);
    tGeo.rotateX(Math.PI / 2);
    geometries.push(tGeo);
    tetherRingMat = new THREE.MeshStandardMaterial({
      color: 0x7be6db,
      emissive: 0x7be6db,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    customMats.push(tetherRingMat);
    tetherRing = new THREE.Mesh(tGeo, tetherRingMat);
    tetherRing.position.y = 0.1;
    tetherRing.visible = false;
    group.add(tetherRing);
  }

  // Invisible raycast volume for instant Hover Stat Inspector
  const colliderGeo = new THREE.CylinderGeometry(0.95, 1.05, 3.15, 8);
  geometries.push(colliderGeo);
  const colliderMat = new THREE.MeshStandardMaterial({
    colorWrite: false,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  customMats.push(colliderMat);
  const hitCollider = new THREE.Mesh(colliderGeo, colliderMat);
  hitCollider.position.set(0, 1.58, 0.05);
  hitCollider.userData.hoverTarget = { kind: 'archon', side: role };
  group.add(hitCollider);

  const latheSegs = detailLevel >= 2 ? 20 : detailLevel === 1 ? 14 : 10;

  // 1. Sculpted Greaves / Armored Boots (connected beneath flared robe)
  const bootGeo = makeLatheProfile(
    [
      [0.0, 0.0],
      [0.14, 0.0],
      [0.13, 0.14],
      [0.1, 0.28],
      [0.115, 0.44],
      [0.0, 0.44],
    ],
    detailLevel >= 2 ? 12 : 8
  );
  geometries.push(bootGeo);
  [-0.2, 0.2].forEach((bx) => {
    const boot = new THREE.Mesh(bootGeo, armorMat);
    boot.position.set(bx, 0, 0.08);
    boot.scale.set(0.95, 1, 1.35);
    boot.castShadow = true;
    animRig.add(boot);
  });

  // 2. Tailored Flared Surcoat / Battle Robe (smooth spline LatheGeometry)
  const robeGeo = makeLatheProfile(
    [
      [0.64, 0.04],
      [0.54, 0.28],
      [0.42, 0.58],
      [0.32, 0.88],
      [0.29, 1.02],
      [0.37, 1.24],
      [0.41, 1.48],
      [0.34, 1.66],
      [0.16, 1.74],
      [0.0, 1.74],
    ],
    latheSegs
  );
  geometries.push(robeGeo);
  const robe = new THREE.Mesh(robeGeo, robeMat);
  robe.scale.set(1.06, 1, 0.86);
  robe.castShadow = true;
  robe.receiveShadow = true;
  animRig.add(robe);

  // Layered waist belt + armored tassets
  const beltGeo = makeLatheProfile(
    [
      [0.29, 0.94],
      [0.34, 0.99],
      [0.34, 1.09],
      [0.3, 1.13],
    ],
    16
  );
  geometries.push(beltGeo);
  const belt = new THREE.Mesh(beltGeo, trimMat);
  belt.scale.set(1.08, 1, 0.88);
  animRig.add(belt);

  // Front embroidered stole / tabard (beveled ExtrudeGeometry)
  const tabardShape = new THREE.Shape();
  tabardShape.moveTo(-0.14, 0.98);
  tabardShape.lineTo(0.14, 0.98);
  tabardShape.lineTo(0.19, 0.2);
  tabardShape.lineTo(0, 0.06);
  tabardShape.lineTo(-0.19, 0.2);
  tabardShape.closePath();
  const tabardGeo = new THREE.ExtrudeGeometry(tabardShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geometries.push(tabardGeo);
  const tabard = new THREE.Mesh(tabardGeo, mats.agedLeatherMat);
  tabard.position.set(0, 0, 0.28);
  tabard.rotation.x = -0.22;
  animRig.add(tabard);

  // 3. Upper Torso Armor & Sculpted Cuirass + Draped Cape
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.05;
  animRig.add(torsoGroup);

  const cuirassGeo = makeLatheProfile(
    [
      [0.29, 0.0],
      [0.39, 0.28],
      [0.43, 0.5],
      [0.36, 0.65],
      [0.16, 0.72],
      [0.0, 0.72],
    ],
    16
  );
  geometries.push(cuirassGeo);
  const cuirass = new THREE.Mesh(cuirassGeo, armorMat);
  cuirass.scale.set(1.08, 1, 0.84);
  cuirass.castShadow = true;
  torsoGroup.add(cuirass);

  // Subtle recessed chest jewel bezel (non-glaring)
  const coreMat = isPlayer ? mats.etherCoreMat.clone() : mats.chaosCoreMat.clone();
  customMats.push(coreMat);
  const bezelGeo = new THREE.TorusGeometry(0.1, 0.024, 8, 18);
  const gemGeo = new THREE.OctahedronGeometry(0.08, 1);
  geometries.push(bezelGeo, gemGeo);
  const chestBezel = new THREE.Mesh(bezelGeo, trimMat);
  chestBezel.position.set(0, 0.42, 0.34);
  torsoGroup.add(chestBezel);
  const chestGem = new THREE.Mesh(gemGeo, coreMat);
  chestGem.position.set(0, 0.42, 0.34);
  chestGem.scale.set(0.9, 1.25, 0.55);
  torsoGroup.add(chestGem);

  // Sculpted Draped Cape with bevel & gold embroidery strip
  const capeShape = new THREE.Shape();
  capeShape.moveTo(-0.34, 0.68);
  capeShape.quadraticCurveTo(0, 0.74, 0.34, 0.68);
  capeShape.quadraticCurveTo(0.56, -0.1, 0.64, -0.94);
  capeShape.lineTo(0.28, -0.84);
  capeShape.lineTo(0, -1.0);
  capeShape.lineTo(-0.28, -0.84);
  capeShape.lineTo(-0.64, -0.94);
  capeShape.quadraticCurveTo(-0.56, -0.1, -0.34, 0.68);
  const capeGeo = new THREE.ExtrudeGeometry(capeShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geometries.push(capeGeo);
  const cape = new THREE.Mesh(capeGeo, robeMat);
  cape.position.set(0, 0.02, -0.28);
  cape.rotation.x = 0.14;
  cape.castShadow = true;
  torsoGroup.add(cape);

  // Curved gold cape hem trim & back emblem
  const spineRibbonGeo = new THREE.BoxGeometry(0.065, 1.25, 0.025);
  const claspGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.035, 6);
  geometries.push(spineRibbonGeo, claspGeo);
  const spineRibbon = new THREE.Mesh(spineRibbonGeo, trimMat);
  spineRibbon.position.set(0, -0.02, -0.34);
  spineRibbon.rotation.x = 0.14;
  torsoGroup.add(spineRibbon);

  const clasp = new THREE.Mesh(claspGeo, trimMat);
  clasp.rotation.x = Math.PI / 2;
  clasp.position.set(0, 0.52, -0.29);
  torsoGroup.add(clasp);

  // High sculpted gorget collar
  const gorgetGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.22, detailLevel >= 2 ? 14 : 8, 1, true, Math.PI * 0.45, Math.PI * 1.1);
  geometries.push(gorgetGeo);
  const gorget = new THREE.Mesh(gorgetGeo, trimMat);
  gorget.position.set(0, 0.68, -0.04);
  torsoGroup.add(gorget);

  // High / Ultra Baroque Rear Silhouette: Layered Robe Hem Armor, Belt Medallions, Back Conduit Reliquary
  let backWheel: THREE.Mesh | null = null;
  if (detailLevel >= 1) {
    // Gold robe lower hem trim ring (wraps 360 around bottom skirt)
    const hemTrimGeo = new THREE.TorusGeometry(0.61, 0.022, 6, detailLevel >= 2 ? 28 : 16);
    hemTrimGeo.rotateX(Math.PI / 2);
    geometries.push(hemTrimGeo);
    const hemTrim = new THREE.Mesh(hemTrimGeo, trimMat);
    hemTrim.position.y = 0.08;
    hemTrim.scale.set(1.06, 0.86, 1);
    animRig.add(hemTrim);

    // Side armored hip tassets + belt tarot seal buckle
    const sideTassetGeo = new THREE.BoxGeometry(0.14, 0.44, 0.24);
    geometries.push(sideTassetGeo);
    [-1, 1].forEach((dir) => {
      const st = new THREE.Mesh(sideTassetGeo, armorMat);
      st.position.set(dir * 0.42, 0.84, 0.02);
      st.rotation.z = -dir * 0.2;
      animRig.add(st);
    });
  }

  if (detailLevel >= 2) {
    // Segmented Spine Vertebrae Plates along back of cape + Twin Shoulder Clasp Chains
    const plateGeo = new THREE.BoxGeometry(0.16, 0.08, 0.05);
    const hemBorderGeo = new THREE.BoxGeometry(0.032, 1.38, 0.032);
    const studGeo = new THREE.OctahedronGeometry(0.038, 0);
    geometries.push(plateGeo, hemBorderGeo, studGeo);

    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(plateGeo, armorMat);
      plate.position.set(0, 0.36 - i * 0.22, -0.34 - i * 0.028);
      plate.rotation.x = 0.14;
      plate.scale.set(1 + i * 0.12, 1, 1);
      torsoGroup.add(plate);
      registerShatter(plate, 0, 2.2 - i * 0.3, -2.8);
    }

    [-1, 1].forEach((dir) => {
      const border = new THREE.Mesh(hemBorderGeo, trimMat);
      border.position.set(dir * 0.45, -0.14, -0.34);
      border.rotation.x = 0.14;
      border.rotation.z = dir * -0.17;
      torsoGroup.add(border);

      const stud = new THREE.Mesh(studGeo, coreMat);
      stud.position.set(dir * 0.25, 0.56, -0.25);
      torsoGroup.add(stud);
    });

    // Back Arcane Astrolabe Conduit Frame (Heroic rear focal piece for Player Archon!)
    const conduitHousingGeo = new THREE.TorusGeometry(0.24, 0.03, 8, 20);
    const conduitCoreGeo = new THREE.OctahedronGeometry(0.11, 0);
    geometries.push(conduitHousingGeo, conduitCoreGeo);

    const conduitHousing = new THREE.Mesh(conduitHousingGeo, trimMat);
    conduitHousing.position.set(0, 0.38, -0.36);
    torsoGroup.add(conduitHousing);
    registerShatter(conduitHousing, 0, 3.6, -3.2);

    const conduitCore = new THREE.Mesh(conduitCoreGeo, coreMat);
    conduitCore.position.set(0, 0.38, -0.36);
    conduitCore.scale.set(1, 1, 0.55);
    torsoGroup.add(conduitCore);

    if (detailLevel >= 3) {
      const innerGearGeo = new THREE.TorusGeometry(0.16, 0.016, 6, 12);
      geometries.push(innerGearGeo);
      backWheel = new THREE.Mesh(innerGearGeo, trimMat);
      backWheel.position.set(0, 0.38, -0.39);
      torsoGroup.add(backWheel);
    }
  }

  // 4. Layered Crescent Pauldrons (ExtrudeGeometry arcs, NOT spherical bowling balls!)
  const pauldronShape = new THREE.Shape();
  pauldronShape.moveTo(-0.18, -0.12);
  pauldronShape.quadraticCurveTo(0, 0.22, 0.24, 0.02);
  pauldronShape.quadraticCurveTo(0.18, -0.14, 0, -0.16);
  pauldronShape.closePath();
  const pauldronGeo = new THREE.ExtrudeGeometry(pauldronShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  pauldronGeo.center();
  geometries.push(pauldronGeo);

  // Connected articulated arms (shoulder -> upper arm -> forearm -> gauntlet)
  const upperArmGeo = new THREE.CapsuleGeometry(0.075, 0.24, 5, 8);
  const forearmGeo = new THREE.CapsuleGeometry(0.068, 0.24, 5, 8);
  const gauntletGeo = new THREE.CapsuleGeometry(0.07, 0.08, 4, 8);
  geometries.push(upperArmGeo, forearmGeo, gauntletGeo);

  const staffSide = isPlayer ? 1 : -1;

  [-1, 1].forEach((dir) => {
    const pPlate = new THREE.Mesh(pauldronGeo, trimMat);
    pPlate.position.set(dir * 0.45, 0.6, 0);
    pPlate.scale.set(dir, 1.1, 1.15);
    pPlate.rotation.z = -dir * 0.25;
    pPlate.castShadow = true;
    torsoGroup.add(pPlate);
    registerShatter(pPlate, dir * 2.8, 3.4, 0.9);

    const pSub = new THREE.Mesh(pauldronGeo, armorMat);
    pSub.position.set(dir * 0.48, 0.48, 0);
    pSub.scale.set(dir * 0.85, 0.85, 1.0);
    pSub.rotation.z = -dir * 0.38;
    torsoGroup.add(pSub);
    registerShatter(pSub, dir * 3.1, 2.2, -0.6);

    const armRoot = new THREE.Group();
    armRoot.position.set(dir * 0.44, 0.5, 0.02);
    torsoGroup.add(armRoot);

    const upper = new THREE.Mesh(upperArmGeo, robeMat);
    upper.position.set(dir * 0.08, -0.14, 0.04);
    upper.rotation.z = dir * 0.24;
    upper.rotation.x = -0.22;
    armRoot.add(upper);

    const forearm = new THREE.Mesh(forearmGeo, armorMat);
    const isWeaponArm = dir === staffSide;
    forearm.position.set(dir * 0.16, -0.24, isWeaponArm ? 0.26 : 0.28);
    forearm.rotation.x = isWeaponArm ? -1.18 : -1.05;
    armRoot.add(forearm);

    const gauntlet = new THREE.Mesh(gauntletGeo, trimMat);
    gauntlet.position.set(dir * 0.18, isWeaponArm ? -0.17 : -0.16, isWeaponArm ? 0.44 : 0.46);
    armRoot.add(gauntlet);

    if (detailLevel >= 2) {
      const couterGeo = new THREE.OctahedronGeometry(0.065, 0);
      geometries.push(couterGeo);
      const couter = new THREE.Mesh(couterGeo, trimMat);
      couter.position.set(dir * 0.12, -0.26, 0.06);
      couter.scale.set(0.85, 0.85, 1.35);
      armRoot.add(couter);
    }
  });

  // 5. Sculpted Head / Helm / Mask (Zero box faces!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.88, 0.03);
  torsoGroup.add(headGroup);

  const headGeo = makeLatheProfile(
    [
      [0.0, -0.18],
      [0.09, -0.15],
      [0.14, -0.04],
      [0.165, 0.08],
      [0.15, 0.2],
      [0.08, 0.27],
      [0.0, 0.285],
    ],
    14
  );
  geometries.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, isPlayer ? mats.porcelainMaskMat : armorMat);
  headMesh.scale.set(0.92, 1.0, 1.12);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Recessed visor shadow band + crisp eye slits
  const visorSlitGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.045, 12, 1, true, -0.85, 1.7);
  const eyeGeo = new THREE.OctahedronGeometry(0.022, 1);
  geometries.push(visorSlitGeo, eyeGeo);
  const visorSlit = new THREE.Mesh(visorSlitGeo, mats.voidMat);
  visorSlit.position.set(0, 0.06, 0.015);
  visorSlit.rotation.y = Math.PI * 0.5;
  visorSlit.scale.set(1.12, 1, 0.94);
  headGroup.add(visorSlit);

  [-0.055, 0.055].forEach((ex) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.06, 0.168);
    eye.scale.set(1.4, 0.7, 0.6);
    headGroup.add(eye);
  });

  if (isPlayer) {
    // Draped Archmage Hood wrapping head cleanly + 3-pronged gold Tarot crown
    const hoodGeo = makeLatheProfile(
      [
        [0.19, -0.14],
        [0.21, 0.04],
        [0.195, 0.22],
        [0.12, 0.34],
        [0.02, 0.44],
        [0.0, 0.45],
      ],
      14
    );
    geometries.push(hoodGeo);
    const hood = new THREE.Mesh(hoodGeo, robeMat);
    hood.position.set(0, 0.02, -0.05);
    hood.rotation.x = -0.35;
    hood.scale.set(1.02, 1.0, 1.18);
    hood.castShadow = true;
    headGroup.add(hood);

    const crownShape = new THREE.Shape();
    crownShape.moveTo(-0.16, 0);
    crownShape.lineTo(-0.19, 0.18);
    crownShape.lineTo(-0.07, 0.09);
    crownShape.lineTo(0, 0.26);
    crownShape.lineTo(0.07, 0.09);
    crownShape.lineTo(0.19, 0.18);
    crownShape.lineTo(0.16, 0);
    crownShape.closePath();
    const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    });
    geometries.push(crownGeo);
    const crown = new THREE.Mesh(crownGeo, mats.goldMat);
    crown.position.set(0, 0.14, 0.13);
    crown.rotation.x = -0.15;
    headGroup.add(crown);
  } else {
    // Enemy Warlord: Fluted steel nasal crest + sweeping curved TubeGeometry horns
    const crestGeo = new THREE.BoxGeometry(0.035, 0.24, 0.24);
    geometries.push(crestGeo);
    const crest = new THREE.Mesh(crestGeo, trimMat);
    crest.position.set(0, 0.22, 0.02);
    headGroup.add(crest);

    [-1, 1].forEach((dir) => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(dir * 0.12, 0.15, 0.0),
        new THREE.Vector3(dir * 0.26, 0.28, -0.04),
        new THREE.Vector3(dir * 0.24, 0.48, 0.05),
        new THREE.Vector3(dir * 0.15, 0.58, 0.12),
      ]);
      const hornGeo = new THREE.TubeGeometry(hornCurve, 14, 0.036, 8, false);
      geometries.push(hornGeo);
      const horn = new THREE.Mesh(hornGeo, mats.boneIvoryMat);
      horn.castShadow = true;
      headGroup.add(horn);
    });
  }

  // 6. Sleek Architectural Bronze Astrolabe Ring & Stage-Unique Boss Crown/Back Attachments
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 0.88, -0.22);
  torsoGroup.add(haloGroup);
  const haloGeo = new THREE.TorusGeometry(0.62, 0.024, 8, detailLevel >= 2 ? 44 : 22);
  geometries.push(haloGeo);
  const haloRing = new THREE.Mesh(haloGeo, trimMat);
  haloGroup.add(haloRing);
  registerShatter(haloGroup, 0, 4.6, -2.1, 3.0, 5.2);

  if (detailLevel >= 2) {
    // 6 cardinal crystal nodes set around the halo aureole
    const nodeGeo = new THREE.OctahedronGeometry(0.052, 0);
    const prongGeo = new THREE.ConeGeometry(0.024, 0.14, 4);
    geometries.push(nodeGeo, prongGeo);
    const nodeCount = detailLevel >= 3 ? 8 : 4;
    for (let i = 0; i < nodeCount; i++) {
      const ang = (i / nodeCount) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, i % 2 === 0 ? coreMat : trimMat);
      node.position.set(Math.cos(ang) * 0.62, Math.sin(ang) * 0.62, 0);
      node.scale.set(0.75, 1.35, 0.75);
      node.rotation.z = ang - Math.PI / 2;
      haloGroup.add(node);

      if (detailLevel >= 3) {
        const prong = new THREE.Mesh(prongGeo, trimMat);
        prong.position.set(Math.cos(ang) * 0.71, Math.sin(ang) * 0.71, 0);
        prong.rotation.z = ang - Math.PI / 2;
        haloGroup.add(prong);
      }
    }
  }

  let secondHaloRing: THREE.Mesh | null = null;
  const orbitingShards: THREE.Mesh[] = [];

  if (!isPlayer) {
    if (stage === 0) {
      // Stage 1: Initiate Lyra — Swept Falcon Wing-Vaned Silver Circlet
      const wingVaneShape = new THREE.Shape();
      wingVaneShape.moveTo(0, 0);
      wingVaneShape.quadraticCurveTo(0.16, 0.22, 0.28, 0.34);
      wingVaneShape.lineTo(0.1, 0.08);
      wingVaneShape.closePath();
      const wingVaneGeo = new THREE.ExtrudeGeometry(wingVaneShape, { depth: 0.018, bevelEnabled: false });
      geometries.push(wingVaneGeo);
      [-1, 1].forEach((dir) => {
        const vane = new THREE.Mesh(wingVaneGeo, mats.goldMat);
        vane.position.set(dir * 0.13, 0.12, 0.02);
        vane.scale.x = dir;
        vane.rotation.y = dir * -0.4;
        headGroup.add(vane);
        registerShatter(vane, dir * 2.4, 4.2, 1.2);
      });
    } else if (stage === 1) {
      // Stage 2: Warden Torin — Crenelated Bronze Bastion Crown & Gear Halo
      const battlementGeo = new THREE.BoxGeometry(0.06, 0.14, 0.05);
      geometries.push(battlementGeo);
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const merlon = new THREE.Mesh(battlementGeo, mats.goldMat);
        merlon.position.set(Math.cos(ang) * 0.14, 0.26, Math.sin(ang) * 0.14);
        merlon.rotation.y = -ang;
        headGroup.add(merlon);
        registerShatter(merlon, Math.cos(ang) * 2.8, 4.5, Math.sin(ang) * 2.8);
      }
    } else if (stage === 2) {
      // Stage 3: Vespera of Thorns — Sweeping Stag-Thorn Antlers + Emerald Gem
      [-1, 1].forEach((dir) => {
        const mainAntler = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.08, 0.18, 0),
          new THREE.Vector3(dir * 0.24, 0.36, -0.05),
          new THREE.Vector3(dir * 0.34, 0.56, 0.08),
        ]);
        const branchAntler = new THREE.CatmullRomCurve3([
          new THREE.Vector3(dir * 0.22, 0.34, -0.03),
          new THREE.Vector3(dir * 0.16, 0.52, 0.14),
        ]);
        const g1 = new THREE.TubeGeometry(mainAntler, 12, 0.024, 6, false);
        const g2 = new THREE.TubeGeometry(branchAntler, 8, 0.018, 5, false);
        geometries.push(g1, g2);
        const m1 = new THREE.Mesh(g1, mats.goldMat);
        const m2 = new THREE.Mesh(g2, mats.goldMat);
        headGroup.add(m1, m2);
        registerShatter(m1, dir * 2.6, 4.4, 0.8);
        registerShatter(m2, dir * 1.9, 5.0, 1.5);
      });
    } else if (stage === 3) {
      // Stage 4: Ignis-Chancellor (Chaos Boss) — Spiked Flame Crown + Dorsal Cinder Spires
      const spikeGeo = new THREE.ConeGeometry(0.045, 0.28, 4);
      geometries.push(spikeGeo);
      for (let k = -2; k <= 2; k++) {
        const spike = new THREE.Mesh(spikeGeo, k === 0 ? mats.chaosCoreMat : mats.goldMat);
        spike.position.set(k * 0.075, 0.27 - Math.abs(k) * 0.03, 0.09);
        spike.rotation.z = -k * 0.18;
        headGroup.add(spike);
        registerShatter(spike, k * 1.3, 5.1, 1.9);
      }
      const innerFlameRingGeo = new THREE.TorusGeometry(0.46, 0.025, 6, 28);
      geometries.push(innerFlameRingGeo);
      secondHaloRing = new THREE.Mesh(innerFlameRingGeo, mats.chaosCoreMat);
      haloGroup.add(secondHaloRing);
    } else if (stage === 4) {
      // Stage 5: Magister Vael — High Archmage Miter & 3 Floating Rift Obelisks
      const miterGeo = new THREE.ConeGeometry(0.15, 0.38, 6);
      geometries.push(miterGeo);
      const miter = new THREE.Mesh(miterGeo, mats.royalIndigoClothMat);
      miter.position.set(0, 0.34, -0.02);
      headGroup.add(miter);
      registerShatter(miter, 0, 5.5, 0.6);

      const prismGeo = new THREE.OctahedronGeometry(0.11, 0);
      geometries.push(prismGeo);
      for (let i = 0; i < 3; i++) {
        const shard = new THREE.Mesh(prismGeo, mats.etherCoreMat);
        shard.scale.set(0.65, 1.75, 0.65);
        haloGroup.add(shard);
        orbitingShards.push(shard);
      }
    } else if (stage === 5) {
      // Stage 6: Chronos-Forged Prime — Dual Armillary Astrolabe Rings + Prism Sun-Crest
      const armillaryGeo = new THREE.TorusGeometry(0.84, 0.02, 8, 40);
      geometries.push(armillaryGeo);
      secondHaloRing = new THREE.Mesh(armillaryGeo, mats.goldMat);
      secondHaloRing.rotation.y = Math.PI * 0.25;
      haloGroup.add(secondHaloRing);

      const sunGeo = new THREE.OctahedronGeometry(0.12, 0);
      geometries.push(sunGeo);
      const sunCrest = new THREE.Mesh(sunGeo, mats.goldMat);
      sunCrest.position.set(0, 0.33, 0.05);
      headGroup.add(sunCrest);
      registerShatter(sunCrest, 0, 5.6, 1.4);
    } else {
      // Stage 7: Archdemiurge Corvin (Final Boss) — 5-Spired Obsidian & Gold Crown, Void Mantle & Double Halo
      const spireGeo = new THREE.ConeGeometry(0.048, 0.36, 4);
      geometries.push(spireGeo);
      for (let k = -2; k <= 2; k++) {
        const sp = new THREE.Mesh(spireGeo, mats.goldMat);
        const hScale = 1.25 - Math.abs(k) * 0.22;
        sp.scale.set(1, hScale, 1);
        sp.position.set(k * 0.085, 0.32 - Math.abs(k) * 0.03, 0.1);
        sp.rotation.z = -k * 0.2;
        headGroup.add(sp);
        registerShatter(sp, k * 1.4, 5.8, 2.0);
      }

      const outerHaloGeo = new THREE.TorusGeometry(0.92, 0.028, 8, 44);
      geometries.push(outerHaloGeo);
      secondHaloRing = new THREE.Mesh(outerHaloGeo, mats.goldMat);
      haloGroup.add(secondHaloRing);

      const wingBladeShape = new THREE.Shape();
      wingBladeShape.moveTo(0, 0);
      wingBladeShape.bezierCurveTo(0.35, 0.55, 0.85, 0.62, 1.15, 0.42);
      wingBladeShape.lineTo(0.65, -0.25);
      wingBladeShape.lineTo(0, -0.18);
      wingBladeShape.closePath();
      const wingBladeGeo = new THREE.ExtrudeGeometry(wingBladeShape, {
        depth: 0.024,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 1,
      });
      geometries.push(wingBladeGeo);
      [-1, 1].forEach((dir) => {
        const wb = new THREE.Mesh(wingBladeGeo, mats.obsidianClothMat);
        wb.position.set(dir * 0.24, 0.56, -0.24);
        wb.scale.set(dir, 1, 1);
        wb.rotation.y = dir * -0.35;
        wb.castShadow = true;
        torsoGroup.add(wb);
        registerShatter(wb, dir * 3.8, 3.6, -1.8);
      });
    }
  }
  registerShatter(headGroup, 0.6, 5.2, 1.5, 5.0, 4.0);
  registerShatter(chestGem, 0, 3.8, 3.2, 6.0, 6.0);

  // 7. Right-Hand Gripped Forged Crescent Halberd-Staff
  const weaponX = staffSide * 0.62;
  const shaftGeo = new THREE.CylinderGeometry(0.028, 0.038, 2.55, 10);
  const crescentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.24, 0.04),
    new THREE.Vector3(0, 0, 0.26),
    new THREE.Vector3(0, 0.24, 0.04),
  ]);
  const crescentGeo = new THREE.TubeGeometry(crescentCurve, 14, 0.026, 8, false);
  const spearTipGeo = new THREE.ConeGeometry(0.065, 0.36, 4);
  const staffGemGeo = new THREE.OctahedronGeometry(0.11, 0);
  geometries.push(shaftGeo, crescentGeo, spearTipGeo, staffGemGeo);

  const staffGroup = new THREE.Group();
  staffGroup.position.set(weaponX, 0, 0.46);
  animRig.add(staffGroup);

  const staff = new THREE.Mesh(shaftGeo, mats.darkBronzeMat);
  staff.position.y = 1.28;
  staff.castShadow = true;
  staffGroup.add(staff);

  const crescent = new THREE.Mesh(crescentGeo, trimMat);
  crescent.position.y = 2.54;
  staffGroup.add(crescent);

  const spearTip = new THREE.Mesh(spearTipGeo, mats.bluedSteelMat);
  spearTip.position.y = 2.86;
  staffGroup.add(spearTip);

  const orb = new THREE.Mesh(staffGemGeo, coreMat);
  orb.position.y = 2.54;
  staffGroup.add(orb);

  let staffGimbalA: THREE.Mesh | null = null;
  let staffGimbalB: THREE.Mesh | null = null;
  if (detailLevel >= 2) {
    const gimbalGeo = new THREE.TorusGeometry(0.18, 0.014, 6, 20);
    const ferruleGeo = new THREE.CylinderGeometry(0.055, 0.036, 0.14, 8);
    geometries.push(gimbalGeo, ferruleGeo);
    staffGimbalA = new THREE.Mesh(gimbalGeo, trimMat);
    staffGimbalA.position.y = 2.54;
    staffGroup.add(staffGimbalA);

    const ferrule = new THREE.Mesh(ferruleGeo, trimMat);
    ferrule.position.y = 2.24;
    staffGroup.add(ferrule);

    if (detailLevel >= 3) {
      staffGimbalB = new THREE.Mesh(gimbalGeo, trimMat);
      staffGimbalB.position.y = 2.54;
      staffGimbalB.scale.setScalar(0.8);
      staffGimbalB.rotation.x = Math.PI / 3;
      staffGroup.add(staffGimbalB);
    }
  }

  // 8. Off-Hand: Readable Tarot Grimoire (Player) or Forged Kite Shield (Enemy)
  const offHandGroup = new THREE.Group();
  offHandGroup.position.set(-staffSide * 0.62, 1.38, 0.5);
  animRig.add(offHandGroup);

  if (isPlayer) {
    const coverGeo = new THREE.BoxGeometry(0.24, 0.34, 0.03);
    const pageGeo = new THREE.PlaneGeometry(0.22, 0.3);
    geometries.push(coverGeo, pageGeo);
    const pageMat = new THREE.MeshStandardMaterial({
      map: mats.grimoireTex,
      roughness: 0.78,
      metalness: 0.04,
    });
    customMats.push(pageMat);

    const leftCover = new THREE.Mesh(coverGeo, mats.agedLeatherMat);
    leftCover.position.x = -0.11;
    leftCover.rotation.y = 0.36;
    const rightCover = new THREE.Mesh(coverGeo, mats.agedLeatherMat);
    rightCover.position.x = 0.11;
    rightCover.rotation.y = -0.36;
    const leftPage = new THREE.Mesh(pageGeo, pageMat);
    leftPage.position.set(-0.105, 0, 0.02);
    leftPage.rotation.y = 0.36;
    const rightPage = new THREE.Mesh(pageGeo, pageMat);
    rightPage.position.set(0.105, 0, 0.02);
    rightPage.rotation.y = -0.36;
    offHandGroup.add(leftCover, rightCover, leftPage, rightPage);
    if (detailLevel >= 2) {
      const spineGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.35, 8);
      geometries.push(spineGeo);
      const bookSpine = new THREE.Mesh(spineGeo, trimMat);
      bookSpine.position.z = -0.02;
      offHandGroup.add(bookSpine);
    }
    offHandGroup.rotation.x = -0.42;
  } else {
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.32);
    shieldShape.lineTo(0.24, 0.24);
    shieldShape.quadraticCurveTo(0.24, -0.08, 0, -0.36);
    shieldShape.quadraticCurveTo(-0.24, -0.08, -0.24, 0.24);
    shieldShape.closePath();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: detailLevel >= 2 ? 2 : 1,
    });
    geometries.push(shieldGeo);
    const shield = new THREE.Mesh(shieldGeo, armorMat);
    const shieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), trimMat);
    geometries.push(shieldBoss.geometry);
    shieldBoss.position.z = 0.06;
    offHandGroup.add(shield, shieldBoss);
    if (detailLevel >= 2) {
      const rimGeo = new THREE.TorusGeometry(0.16, 0.016, 6, 16);
      const crossVGeo = new THREE.BoxGeometry(0.032, 0.48, 0.02);
      const crossHGeo = new THREE.BoxGeometry(0.32, 0.032, 0.02);
      geometries.push(rimGeo, crossVGeo, crossHGeo);
      const shieldRim = new THREE.Mesh(rimGeo, trimMat);
      shieldRim.position.z = 0.045;
      const crossV = new THREE.Mesh(crossVGeo, trimMat);
      crossV.position.set(0, -0.04, 0.042);
      const crossH = new THREE.Mesh(crossHGeo, trimMat);
      crossH.position.set(0, 0.08, 0.042);
      offHandGroup.add(shieldRim, crossV, crossH);
    }
    offHandGroup.rotation.y = 0.35;
  }

  // Orbiting Tarot Seals / Arcane Plates around Archon waist-shoulder aura (High+)
  const orbitingTarotSeals: THREE.Group[] = [];
  if (detailLevel >= 2) {
    const sealFrameGeo = new THREE.BoxGeometry(0.12, 0.18, 0.016);
    const sealCoreGeo = new THREE.OctahedronGeometry(0.042, 0);
    geometries.push(sealFrameGeo, sealCoreGeo);
    const sealCount = detailLevel >= 3 ? 4 : 2;
    for (let s = 0; s < sealCount; s++) {
      const seal = new THREE.Group();
      const plate = new THREE.Mesh(sealFrameGeo, trimMat);
      const gem = new THREE.Mesh(sealCoreGeo, coreMat);
      gem.position.z = 0.014;
      seal.add(plate, gem);
      torsoGroup.add(seal);
      orbitingTarotSeals.push(seal);
      registerShatter(seal, Math.cos(s * 1.5) * 3.0, 4.0, Math.sin(s * 1.5) * 3.0);
    }
  }

  // 5 Resonance Crown Spheres floating around player Archon shoulders/halo
  const resonanceOrbs: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = [];
  if (isPlayer) {
    const resOrbGeo = new THREE.OctahedronGeometry(0.068, 1);
    geometries.push(resOrbGeo);
    for (let r = 0; r < 5; r++) {
      const rMat = new THREE.MeshStandardMaterial({
        color: 0x3a3245,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.35,
        metalness: 0.72,
      });
      customMats.push(rMat);
      const rMesh = new THREE.Mesh(resOrbGeo, rMat);
      torsoGroup.add(rMesh);
      resonanceOrbs.push({ mesh: rMesh, mat: rMat });
      registerShatter(rMesh, (r - 2) * 1.4, 4.6, 1.2);
    }
  }

  registerShatter(staffGroup, staffSide * 3.4, 3.9, 1.6, 4.5, 4.2);
  registerShatter(offHandGroup, -staffSide * 3.2, 3.5, 1.8, 4.0, 4.8);

  const staffOriginWorld = new THREE.Vector3();
  let shattered = false;
  let shatterTime = 0;
  let castFlare = 0;
  let hitRecoil = 0;
  let overloadOn = false;
  let tetherOn = false;
  let resonanceLevel = 0;

  return {
    group,
    hitCollider,
    staffOriginWorld,
    setOverloadVisual: (overload: boolean) => {
      if (!isPlayer) return;
      overloadOn = overload;
      const targetHex = overload ? TAROT_PALETTE.overload : TAROT_PALETTE.ether;
      coreMat.color.setHex(targetHex);
      coreMat.emissive.setHex(overload ? 0x8f2414 : 0x2f7d75);
      coreMat.emissiveIntensity = overload ? 1.1 : 0.72;
      if (overloadRing) overloadRing.visible = overload;
    },
    setResonanceLevel: (level: number) => {
      if (!isPlayer) return;
      resonanceLevel = Math.max(0, Math.min(5, level));
      const full = resonanceLevel >= 5;
      resonanceOrbs.forEach((o, idx) => {
        const lit = idx < resonanceLevel;
        o.mat.color.setHex(lit ? (full ? 0xffeb99 : 0x7be6db) : 0x2b2535);
        o.mat.emissive.setHex(lit ? (full ? 0xd99b26 : 0x28968b) : 0x000000);
        o.mat.emissiveIntensity = lit ? (full ? 1.35 : 0.78) : 0;
      });
    },
    setSoulTetherVisual: (active: boolean) => {
      if (!isPlayer) return;
      tetherOn = active;
      if (tetherRing) tetherRing.visible = active;
    },
    triggerCastFlare: () => {
      castFlare = 1.0;
    },
    triggerHitRecoil: () => {
      hitRecoil = 1.0;
    },
    triggerDefeatShatter: () => {
      if (shattered) return;
      shattered = true;
      shatterTime = 0;
    },
    update: (time: number, dt = 0.016) => {
      const safeDt = Math.min(dt, 0.05);
      if (shattered) {
        if (overloadRing) overloadRing.visible = false;
        if (tetherRing) tetherRing.visible = false;
        shatterTime += safeDt;
        const p = Math.min(1, shatterTime / 1.05);
        shatterPieces.forEach((sp) => {
          sp.obj.position.x += sp.vx * safeDt;
          sp.obj.position.y += sp.vy * safeDt;
          sp.obj.position.z += sp.vz * safeDt;
          sp.vy -= 11.5 * safeDt;
          sp.obj.rotation.x += sp.rx * safeDt;
          sp.obj.rotation.z += sp.rz * safeDt;
          const sc = Math.max(0.01, 1 - p * 0.92);
          sp.obj.scale.setScalar(sc);
        });
        robe.scale.y = Math.max(0.1, 1 - p * 0.85);
        shadowMat.opacity = Math.max(0, 0.72 * (1 - p));
        return;
      }

      if (castFlare > 0) {
        castFlare = Math.max(0, castFlare - safeDt * 2.6);
      }
      if (hitRecoil > 0) {
        hitRecoil = Math.max(0, hitRecoil - safeDt * 3.4);
      }

      const breath = Math.sin(time * 2.0 + (isPlayer ? 0 : 1.7));
      torsoGroup.position.y = 1.05 + breath * 0.018;
      animRig.rotation.x = THREE.MathUtils.damp(
        animRig.rotation.x,
        castFlare * 0.14 - hitRecoil * 0.24,
        14,
        safeDt
      );
      animRig.rotation.z = Math.sin(hitRecoil * Math.PI * 3) * 0.08 * hitRecoil;
      torsoGroup.rotation.x = THREE.MathUtils.damp(
        torsoGroup.rotation.x,
        castFlare * 0.1 - hitRecoil * 0.14,
        14,
        safeDt
      );
      headGroup.rotation.y = Math.sin(time * 0.75 + (isPlayer ? 0 : 2.0)) * 0.09;
      headGroup.rotation.x = breath * 0.035;
      haloRing.rotation.z = time * (isPlayer ? 0.28 : -0.28);
      if (backWheel) {
        backWheel.rotation.z = -time * 0.95;
      }
      if (secondHaloRing) {
        secondHaloRing.rotation.z = -time * 0.42;
        secondHaloRing.rotation.x = Math.sin(time * 0.6) * 0.18;
      }
      if (orbitingShards.length > 0) {
        orbitingShards.forEach((sh, i) => {
          const ang = time * 0.9 + (i * Math.PI * 2) / orbitingShards.length;
          sh.position.set(Math.cos(ang) * 0.82, Math.sin(ang) * 0.82, 0);
          sh.rotation.y = time * 1.4 + i;
        });
      }
      if (orbitingTarotSeals.length > 0) {
        orbitingTarotSeals.forEach((seal, i) => {
          const ang = time * (0.65 + castFlare * 1.9) + (i * Math.PI * 2) / orbitingTarotSeals.length;
          seal.position.set(
            Math.cos(ang) * 0.84,
            0.34 + Math.sin(time * 2.2 + i * 1.4) * 0.09,
            Math.sin(ang) * 0.62
          );
          seal.rotation.y = -ang + Math.PI * 0.5;
        });
      }
      if (overloadRing && overloadRingMat && overloadOn) {
        overloadRing.rotation.y = time * 1.25;
        overloadRing.scale.setScalar(1 + Math.sin(time * 4.2) * 0.05);
        overloadRingMat.opacity = 0.5 + Math.sin(time * 5.2) * 0.22;
      }
      if (tetherRing && tetherRingMat && tetherOn) {
        tetherRing.rotation.y = -time * 1.6;
        tetherRing.scale.setScalar(1 + Math.sin(time * 5.0) * 0.07);
        tetherRingMat.opacity = 0.55 + Math.sin(time * 6.0) * 0.25;
      }
      if (resonanceOrbs.length > 0) {
        const full = resonanceLevel >= 5;
        const spinSpeed = full ? 1.9 : 0.72;
        resonanceOrbs.forEach((o, idx) => {
          const ang = -Math.PI * 0.75 + (idx / 4) * Math.PI * 1.5 + (full ? time * spinSpeed : Math.sin(time * 0.8) * 0.14);
          const radius = full ? 0.76 + Math.sin(time * 4.5 + idx) * 0.04 : 0.68;
          o.mesh.position.set(
            Math.sin(ang) * radius,
            1.18 + Math.cos(ang * 0.6) * 0.18 + Math.sin(time * 2.4 + idx * 0.9) * 0.04,
            -0.16 + Math.cos(ang) * 0.18
          );
          o.mesh.rotation.y = time * 1.6 + idx;
          const lit = idx < resonanceLevel;
          o.mesh.scale.setScalar(lit ? (full ? 1.28 + Math.sin(time * 5 + idx) * 0.12 : 1.05) : 0.62);
        });
      }
      orb.rotation.y = time * (1.2 + castFlare * 4.5);
      orb.scale.setScalar(1 + castFlare * 0.45);
      coreMat.emissiveIntensity = (overloadOn ? 1.1 : 0.72) + castFlare * 1.1;
      staffGroup.rotation.x = THREE.MathUtils.damp(staffGroup.rotation.x, castFlare * 0.34, 12, safeDt);
      if (staffGimbalA) {
        staffGimbalA.rotation.y = time * 1.6;
        staffGimbalA.rotation.x = Math.sin(time * 1.1) * 0.4;
      }
      if (staffGimbalB) {
        staffGimbalB.rotation.z = -time * 2.0;
        staffGimbalB.rotation.y = Math.cos(time * 0.9) * 0.45;
      }
      offHandGroup.position.y = 1.38 + Math.cos(time * 2.1) * 0.03;
      orb.getWorldPosition(staffOriginWorld);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
    },
  };
}
