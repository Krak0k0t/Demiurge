import * as THREE from 'three';
import { type DetailTier } from '../../core/graphicsSettings';
import { TAROT_PALETTE, type TarotMaterialLibrary } from '../materials/tarotMaterials';
import type { DemiurgeModelHandle } from './demiurgeSculpts';

function ensureTangents(geo: THREE.BufferGeometry): void {
  if (geo.index && geo.attributes.uv && geo.attributes.normal) {
    geo.computeTangents();
  }
}

function makeLatheProfile(coords: Array<[number, number]>, segments = 16): THREE.LatheGeometry {
  const pts = coords.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  ensureTangents(geo);
  return geo;
}

/**
 * Builds a harmonic pleated fluted lower cassock geometry so lighting creates
 * rich vertical chiaroscuro folds instead of a smooth cone.
 */
function buildPleatedCassockGeometry(
  rings: Array<{ r: number; y: number; pleatAmp: number }>,
  radialSegs: number,
  pleats = 14,
  scaleX = 1.06,
  scaleZ = 0.88
): THREE.BufferGeometry {
  const rows = rings.length;
  const cols = radialSegs + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const indices: number[] = [];

  for (let row = 0; row < rows; row++) {
    const { r, y, pleatAmp } = rings[row];
    const v = row / Math.max(1, rows - 1);
    for (let col = 0; col < cols; col++) {
      const u = col / radialSegs;
      const theta = u * Math.PI * 2;
      const fold = Math.sin(theta * pleats) * pleatAmp + Math.cos(theta * 2) * (pleatAmp * 0.35);
      const effR = Math.max(0.01, r + fold);
      const idx = row * cols + col;
      positions[idx * 3] = Math.sin(theta) * effR * scaleX;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = Math.cos(theta) * effR * scaleZ;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < radialSegs; col++) {
      const a = row * cols + col;
      const b = a + 1;
      const c = (row + 1) * cols + col;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  ensureTangents(geo);
  return geo;
}

/**
 * Builds a true curved 3D sculpted cape/mantle shell wrapping around shoulders
 * and billowing backward with multi-fold vertical pleats.
 */
function buildSculptedMantleGeometry(
  uSegs: number,
  vSegs: number,
  innerOffsetZ = 0,
  widthScale = 1.0,
  vMax = 1.0
): THREE.BufferGeometry {
  const cols = uSegs + 1;
  const rows = vSegs + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const indices: number[] = [];

  for (let row = 0; row < rows; row++) {
    const v = (row / vSegs) * vMax; // 0 = shoulder collar, vMax = hem
    const easeV = Math.pow(v, 0.92);
    const y = 0.68 - easeV * 1.66;
    const widthHalf = (0.36 + easeV * 0.44) * widthScale;
    const baseZ = -0.14 - Math.sin(v * Math.PI * 0.52) * 0.44 - v * 0.12;
    const wrapCup = 0.24 - v * 0.11;
    const pleatDepth = 0.015 + v * 0.052;

    for (let col = 0; col < cols; col++) {
      const u = col / uSegs; // 0..1 across width
      const s = u * 2 - 1; // -1..+1
      const absS = Math.abs(s);

      // Taper hem slightly into an imperial pointed swallowtail silhouette
      const swallowtailDrop = (1 - absS * absS) * 0.14 * v;
      const collarLift = (1 - absS) * 0.04 * (1 - v);

      const x = s * widthHalf;
      const pleat = Math.cos(s * Math.PI * 3.5) * pleatDepth;
      const z = baseZ + absS * absS * wrapCup + pleat + innerOffsetZ;

      const idx = row * cols + col;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y - swallowtailDrop + collarLift;
      positions[idx * 3 + 2] = z;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let row = 0; row < vSegs; row++) {
    for (let col = 0; col < uSegs; col++) {
      const a = row * cols + col;
      const b = a + 1;
      const c = (row + 1) * cols + col;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  ensureTangents(geo);
  return geo;
}

/** Builds gently curved open vellum pages so the grimoire reads as real bound parchment. */
function buildCurvedVellumPageGeometry(width = 0.225, height = 0.315): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 8, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const normX = (x + width * 0.5) / Math.max(0.0001, width); // 0..1 across page width
    const arch = Math.sin(normX * Math.PI) * 0.022;
    pos.setZ(i, pos.getZ(i) + arch);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  ensureTangents(geo);
  return geo;
}

/** Builds a tapering cathedral war-banneret cloth hanging from the halberd crossbar. */
function buildCurvedBanneretGeometry(width = 0.22, height = 0.64): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 4, 8);
  geo.translate(0, -height * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = Math.abs(y) / height; // 0 top .. 1 hem
    const swallow = 1 - Math.abs(x / (width * 0.5));
    const waveZ = Math.sin(v * Math.PI * 1.65) * 0.032 + swallow * 0.014;
    const taperX = x * (1 - v * 0.24);
    pos.setX(i, taperX);
    pos.setZ(i, waveZ);
    if (v > 0.85) {
      pos.setY(i, y - swallow * 0.075);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  ensureTangents(geo);
  return geo;
}

/** Builds an articulated 5-fingered armored gauntlet hand */
function buildArticulatedGauntlet(
  plateMat: THREE.Material,
  goldMat: THREE.Material,
  geometries: THREE.BufferGeometry[],
  sideSign: 1 | -1,
  pose: 'grip_staff' | 'cradle_book',
  detailLevel: DetailTier
): THREE.Group {
  const hand = new THREE.Group();

  const palmGeo = new THREE.BoxGeometry(0.095, 0.09, 0.052);
  const knuckleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.096, 6);
  knuckleGeo.rotateZ(Math.PI / 2);
  const fingerGeo = new THREE.CapsuleGeometry(0.012, 0.055, 3, 5);
  const thumbGeo = new THREE.CapsuleGeometry(0.013, 0.042, 3, 5);
  geometries.push(palmGeo, knuckleGeo, fingerGeo, thumbGeo);

  const palm = new THREE.Mesh(palmGeo, plateMat);
  palm.castShadow = true;
  hand.add(palm);

  const knuckleBar = new THREE.Mesh(knuckleGeo, goldMat);
  knuckleBar.position.set(0, 0.036, 0.018);
  hand.add(knuckleBar);

  // Thumb
  const thumb = new THREE.Mesh(thumbGeo, goldMat);
  thumb.position.set(-sideSign * 0.055, 0.01, 0.03);
  thumb.rotation.z = sideSign * 0.65;
  thumb.rotation.x = pose === 'grip_staff' ? -0.65 : -0.35;
  hand.add(thumb);

  // Four articulated fingers (grouped cleanly on medium+, full 4 on high+)
  const fingerCount = detailLevel >= 2 ? 4 : 2;
  for (let f = 0; f < fingerCount; f++) {
    const t = f / (fingerCount - 1) - 0.5;
    const finger = new THREE.Mesh(fingerGeo, f % 2 === 0 ? plateMat : goldMat);
    finger.position.set(
      t * 0.072,
      pose === 'grip_staff' ? 0.025 : 0.032,
      pose === 'grip_staff' ? 0.052 : 0.045
    );
    finger.rotation.x = pose === 'grip_staff' ? 1.15 : 0.58;
    hand.add(finger);
  }

  return hand;
}

export function buildPlayerArchonSculpt(
  mats: TarotMaterialLibrary,
  contactTex: THREE.Texture,
  detailLevel: DetailTier
): DemiurgeModelHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const customMats: THREE.Material[] = [];

  const velvetMat = mats.sovereignVelvetMat;
  const silkMat = mats.crimsonSilkMat;
  const steelMat = mats.heroSteelPlateMat;
  const goldMat = mats.heroGoldTrimMat;
  const visageMat = mats.heroVisageMat;
  const eyeMat = mats.cyanEyeMat;

  const coreMat = mats.etherCoreMat.clone();
  customMats.push(coreMat);

  const shatterPieces: Array<{ obj: THREE.Object3D; vx: number; vy: number; vz: number; rx: number; rz: number }> = [];
  const registerShatter = (obj: THREE.Object3D, vx: number, vy: number, vz: number, rx = 4.2, rz = 3.5) => {
    shatterPieces.push({ obj, vx, vy, vz, rx, rz });
  };

  // 0. Contact shadow, Overload/Soul-Tether arena rings & hover collider
  const shadowGeo = new THREE.PlaneGeometry(2.45, 2.45);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshStandardMaterial({
    map: contactTex,
    color: 0x000000,
    roughness: 1,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    opacity: 0.74,
  });
  customMats.push(shadowMat);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  let overloadRing: THREE.Mesh | null = null;
  let overloadRingMat: THREE.MeshStandardMaterial | null = null;
  if (detailLevel >= 2) {
    const ringGeo = new THREE.TorusGeometry(0.98, 0.026, 6, 32);
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

  const tetherGeo = new THREE.TorusGeometry(0.8, 0.022, 6, 26);
  tetherGeo.rotateX(Math.PI / 2);
  geometries.push(tetherGeo);
  const tetherRingMat = new THREE.MeshStandardMaterial({
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
  const tetherRing = new THREE.Mesh(tetherGeo, tetherRingMat);
  tetherRing.position.y = 0.1;
  tetherRing.visible = false;
  group.add(tetherRing);

  const colliderGeo = new THREE.CylinderGeometry(0.95, 1.08, 3.25, 8);
  geometries.push(colliderGeo);
  const colliderMat = new THREE.MeshStandardMaterial({
    colorWrite: false,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
  });
  customMats.push(colliderMat);
  const hitCollider = new THREE.Mesh(colliderGeo, colliderMat);
  hitCollider.position.set(0, 1.62, 0.05);
  hitCollider.userData.hoverTarget = { kind: 'archon', side: 'player' };
  group.add(hitCollider);

  const animRig = new THREE.Group();
  group.add(animRig);

  // 1. Sculpted Armored Boots, Greaves, Knee Poleyns & Ankle Clasps
  const bootGeo = makeLatheProfile(
    [
      [0.0, 0.0],
      [0.145, 0.0],
      [0.135, 0.12],
      [0.105, 0.26],
      [0.12, 0.46],
      [0.0, 0.46],
    ],
    detailLevel >= 2 ? 14 : 8
  );
  const sabatonCapGeo = new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const poleynGeo = new THREE.OctahedronGeometry(0.075, 0);
  const shinRidgeGeo = new THREE.BoxGeometry(0.036, 0.32, 0.044);
  const poleynWingGeo = new THREE.BoxGeometry(0.055, 0.085, 0.022);
  const ankleRingGeo = new THREE.TorusGeometry(0.115, 0.016, 6, 14);
  ankleRingGeo.rotateX(Math.PI / 2);
  geometries.push(bootGeo, sabatonCapGeo, poleynGeo, shinRidgeGeo, poleynWingGeo, ankleRingGeo);

  [-0.2, 0.2].forEach((bx) => {
    const side = Math.sign(bx) || 1;
    const boot = new THREE.Mesh(bootGeo, steelMat);
    boot.position.set(bx, 0, 0.09);
    boot.scale.set(0.94, 1, 1.36);
    boot.castShadow = true;
    boot.receiveShadow = true;
    animRig.add(boot);

    const sabaton = new THREE.Mesh(sabatonCapGeo, goldMat);
    sabaton.position.set(bx, 0.02, 0.21);
    sabaton.scale.set(0.95, 0.65, 1.25);
    sabaton.castShadow = true;
    animRig.add(sabaton);

    const shinRidge = new THREE.Mesh(shinRidgeGeo, goldMat);
    shinRidge.position.set(bx, 0.23, 0.205);
    shinRidge.rotation.x = -0.06;
    shinRidge.castShadow = true;
    animRig.add(shinRidge);

    const poleyn = new THREE.Mesh(poleynGeo, goldMat);
    poleyn.position.set(bx, 0.39, 0.19);
    poleyn.scale.set(0.85, 1.28, 0.68);
    poleyn.castShadow = true;
    animRig.add(poleyn);

    const poleynWing = new THREE.Mesh(poleynWingGeo, steelMat);
    poleynWing.position.set(bx + side * 0.095, 0.39, 0.14);
    poleynWing.rotation.y = side * 0.45;
    poleynWing.castShadow = true;
    animRig.add(poleynWing);

    const ankleRing = new THREE.Mesh(ankleRingGeo, goldMat);
    ankleRing.position.set(bx, 0.14, 0.1);
    animRig.add(ankleRing);
  });

  // 2. Sculpted Multi-Fold Pleated Cassock, Crimson Lining Skirt & Gold Hem Filigree
  const radialSegs = detailLevel >= 2 ? 32 : detailLevel === 1 ? 24 : 16;
  const cassockGeo = buildPleatedCassockGeometry(
    [
      { r: 0.65, y: 0.05, pleatAmp: 0.032 },
      { r: 0.58, y: 0.24, pleatAmp: 0.028 },
      { r: 0.48, y: 0.48, pleatAmp: 0.022 },
      { r: 0.37, y: 0.74, pleatAmp: 0.014 },
      { r: 0.31, y: 0.94, pleatAmp: 0.006 },
      { r: 0.3, y: 1.06, pleatAmp: 0.002 },
    ],
    radialSegs,
    14,
    1.08,
    0.9
  );
  const underskirtGeo = makeLatheProfile(
    [
      [0.64, 0.03],
      [0.57, 0.18],
      [0.44, 0.45],
      [0.29, 0.96],
    ],
    detailLevel >= 2 ? 20 : 12
  );
  const hemRingGeo = new THREE.TorusGeometry(0.65, 0.022, 8, detailLevel >= 2 ? 36 : 20);
  hemRingGeo.rotateX(Math.PI / 2);
  geometries.push(cassockGeo, underskirtGeo, hemRingGeo);

  const cassock = new THREE.Mesh(cassockGeo, velvetMat);
  cassock.castShadow = true;
  cassock.receiveShadow = true;
  animRig.add(cassock);

  const underskirt = new THREE.Mesh(underskirtGeo, silkMat);
  underskirt.scale.set(1.02, 1, 0.85);
  animRig.add(underskirt);

  const hemRing = new THREE.Mesh(hemRingGeo, goldMat);
  hemRing.position.y = 0.065;
  hemRing.scale.set(1.08, 0.9, 1);
  animRig.add(hemRing);

  // Embossed Tarot Waist Belt, Buckle Medallion, Articulated Hip Tassets & Swinging Brass Censer
  const beltGeo = makeLatheProfile(
    [
      [0.295, 0.93],
      [0.345, 0.98],
      [0.35, 1.09],
      [0.31, 1.14],
    ],
    detailLevel >= 2 ? 20 : 12
  );
  const tabardShape = new THREE.Shape();
  tabardShape.moveTo(-0.145, 0.98);
  tabardShape.lineTo(0.145, 0.98);
  tabardShape.lineTo(0.195, 0.22);
  tabardShape.lineTo(0, 0.07);
  tabardShape.lineTo(-0.195, 0.22);
  tabardShape.closePath();
  const tabardGeo = new THREE.ExtrudeGeometry(tabardShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: detailLevel >= 2 ? 2 : 1,
  });
  const buckleGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.04, 8);
  buckleGeo.rotateX(Math.PI / 2);
  const buckleCoreGeo = new THREE.OctahedronGeometry(0.05, 0);
  geometries.push(beltGeo, tabardGeo, buckleGeo, buckleCoreGeo);

  const belt = new THREE.Mesh(beltGeo, goldMat);
  belt.scale.set(1.08, 1, 0.9);
  belt.castShadow = true;
  belt.receiveShadow = true;
  animRig.add(belt);

  const frontTabardBacking = new THREE.Mesh(tabardGeo, silkMat);
  frontTabardBacking.position.set(0, 0, 0.29);
  frontTabardBacking.rotation.x = -0.22;
  frontTabardBacking.scale.set(1.12, 1.03, 0.7);
  frontTabardBacking.castShadow = true;
  frontTabardBacking.receiveShadow = true;
  animRig.add(frontTabardBacking);

  const frontTabard = new THREE.Mesh(tabardGeo, velvetMat);
  frontTabard.position.set(0, 0.02, 0.305);
  frontTabard.rotation.x = -0.22;
  frontTabard.castShadow = true;
  frontTabard.receiveShadow = true;
  animRig.add(frontTabard);

  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.position.set(0, 1.03, 0.325);
  buckle.castShadow = true;
  animRig.add(buckle);

  const buckleCore = new THREE.Mesh(buckleCoreGeo, mats.heroArcaneCrystalMat);
  buckleCore.position.set(0, 1.03, 0.348);
  buckleCore.scale.set(0.9, 1.2, 0.6);
  animRig.add(buckleCore);

  // Articulated Hip Tassets (2 overlapping lames per hip)
  const tassetGeo = new THREE.BoxGeometry(0.13, 0.24, 0.26);
  const tassetTrimGeo = new THREE.BoxGeometry(0.138, 0.042, 0.27);
  geometries.push(tassetGeo, tassetTrimGeo);
  [-1, 1].forEach((dir) => {
    for (let l = 0; l < 2; l++) {
      const lame = new THREE.Mesh(tassetGeo, steelMat);
      lame.position.set(dir * (0.41 + l * 0.04), 0.9 - l * 0.19, 0.01);
      lame.rotation.z = -dir * (0.22 + l * 0.05);
      lame.castShadow = true;
      lame.receiveShadow = true;
      animRig.add(lame);

      const trim = new THREE.Mesh(tassetTrimGeo, goldMat);
      trim.position.set(dir * (0.425 + l * 0.04), 0.8 - l * 0.19, 0.01);
      trim.rotation.z = -dir * (0.22 + l * 0.05);
      trim.castShadow = true;
      animRig.add(trim);
    }
  });

  // Hip-mounted Swinging Brass Relic Censer (left flank) + Hip Astrolabe & Scroll Case (right flank)
  const censerPivot = new THREE.Group();
  censerPivot.position.set(-0.41, 0.94, -0.14);
  animRig.add(censerPivot);
  if (detailLevel >= 2) {
    const chainGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6);
    const bowlGeo = new THREE.OctahedronGeometry(0.065, 1);
    const scrollTubeGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.3, 10);
    const scrollCapGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.035, 10);
    const compassGeo = new THREE.TorusGeometry(0.055, 0.01, 6, 16);
    geometries.push(chainGeo, bowlGeo, scrollTubeGeo, scrollCapGeo, compassGeo);

    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.position.y = -0.11;
    const bowl = new THREE.Mesh(bowlGeo, goldMat);
    bowl.position.y = -0.24;
    bowl.castShadow = true;
    const bowlCore = new THREE.Mesh(buckleCoreGeo, coreMat);
    bowlCore.position.y = -0.24;
    bowlCore.scale.setScalar(0.62);
    censerPivot.add(chain, bowl, bowlCore);

    const scrollCase = new THREE.Mesh(scrollTubeGeo, mats.agedLeatherMat);
    scrollCase.position.set(0.42, 0.92, -0.15);
    scrollCase.rotation.set(0.45, 0, -0.28);
    scrollCase.castShadow = true;
    animRig.add(scrollCase);

    [-0.135, 0.135].forEach((capOff) => {
      const cap = new THREE.Mesh(scrollCapGeo, goldMat);
      cap.position.set(0, capOff, 0);
      scrollCase.add(cap);
    });

    const hipCompass = new THREE.Mesh(compassGeo, goldMat);
    hipCompass.position.set(0.39, 0.88, 0.16);
    hipCompass.rotation.y = Math.PI * 0.45;
    animRig.add(hipCompass);
  }

  // 3. Torso, Sculpted Anatomical Cuirass & Layered 3D Flowing Mantle
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.05;
  animRig.add(torsoGroup);

  const cuirassGeo = makeLatheProfile(
    [
      [0.295, 0.0],
      [0.34, 0.16],
      [0.41, 0.36],
      [0.45, 0.54],
      [0.37, 0.67],
      [0.16, 0.74],
      [0.0, 0.74],
    ],
    detailLevel >= 2 ? 20 : 12
  );
  const pecRidgeGeo = new THREE.BoxGeometry(0.055, 0.42, 0.06);
  const gorgetGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.2, detailLevel >= 2 ? 16 : 8, 1, true, Math.PI * 0.38, Math.PI * 1.24);
  const chestBezelGeo = new THREE.TorusGeometry(0.11, 0.025, 8, 20);
  const chestGemGeo = new THREE.OctahedronGeometry(0.082, 1);
  geometries.push(cuirassGeo, pecRidgeGeo, gorgetGeo, chestBezelGeo, chestGemGeo);

  const cuirass = new THREE.Mesh(cuirassGeo, steelMat);
  cuirass.scale.set(1.08, 1, 0.84);
  cuirass.castShadow = true;
  cuirass.receiveShadow = true;
  torsoGroup.add(cuirass);

  // Sculpted abdominal fauld lames & chest filigree trim
  const ribLameGeo = new THREE.TorusGeometry(0.32, 0.018, 6, 18);
  ribLameGeo.rotateX(Math.PI / 2);
  geometries.push(ribLameGeo);
  for (let i = 0; i < 3; i++) {
    const lame = new THREE.Mesh(ribLameGeo, goldMat);
    lame.position.set(0, 0.1 + i * 0.1, 0.01);
    lame.scale.set(1.06 + i * 0.08, 0.86 + i * 0.03, 1);
    lame.castShadow = true;
    torsoGroup.add(lame);
  }

  const pecRidge = new THREE.Mesh(pecRidgeGeo, goldMat);
  pecRidge.position.set(0, 0.44, 0.355);
  pecRidge.castShadow = true;
  torsoGroup.add(pecRidge);

  const gorget = new THREE.Mesh(gorgetGeo, goldMat);
  gorget.position.set(0, 0.68, -0.02);
  gorget.castShadow = true;
  torsoGroup.add(gorget);

  // Diagonal Tarot Chest Baldric Sash + Iridescent Arcane Crystal Medallion
  const baldricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.34, 0.64, 0.16),
    new THREE.Vector3(-0.14, 0.44, 0.355),
    new THREE.Vector3(0.16, 0.22, 0.325),
    new THREE.Vector3(0.32, 0.06, 0.12),
  ]);
  const baldricGeo = new THREE.TubeGeometry(baldricCurve, 14, 0.032, 7, false);
  const baldricClaspGeo = new THREE.OctahedronGeometry(0.052, 0);
  ensureTangents(baldricGeo);
  geometries.push(baldricGeo, baldricClaspGeo);

  const baldricMesh = new THREE.Mesh(baldricGeo, silkMat);
  baldricMesh.castShadow = true;
  torsoGroup.add(baldricMesh);

  const baldricCrystal = new THREE.Mesh(baldricClaspGeo, mats.heroArcaneCrystalMat);
  baldricCrystal.position.set(-0.22, 0.54, 0.3);
  baldricCrystal.scale.set(0.85, 1.25, 0.6);
  torsoGroup.add(baldricCrystal);

  const chestBezel = new THREE.Mesh(chestBezelGeo, goldMat);
  chestBezel.position.set(0, 0.45, 0.36);
  chestBezel.castShadow = true;
  torsoGroup.add(chestBezel);

  const chestGem = new THREE.Mesh(chestGemGeo, mats.heroArcaneCrystalMat);
  chestGem.position.set(0, 0.45, 0.368);
  chestGem.scale.set(0.88, 1.28, 0.56);
  torsoGroup.add(chestGem);
  registerShatter(chestGem, 0, 3.8, 3.2, 6.0, 6.0);

  // Sovereign Pectoral Chain-of-Office & Engraved Gilded Cuirass Chevrons
  const pectoralCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.33, 0.64, 0.14),
    new THREE.Vector3(-0.2, 0.51, 0.34),
    new THREE.Vector3(0, 0.41, 0.385),
    new THREE.Vector3(0.2, 0.51, 0.34),
    new THREE.Vector3(0.33, 0.64, 0.14),
  ]);
  const pectoralChainGeo = new THREE.TubeGeometry(pectoralCurve, 16, 0.015, 6, false);
  const pectoralMedalGeo = new THREE.OctahedronGeometry(0.028, 0);
  const chestChevronGeo = new THREE.BoxGeometry(0.18, 0.022, 0.028);
  ensureTangents(pectoralChainGeo);
  geometries.push(pectoralChainGeo, pectoralMedalGeo, chestChevronGeo);

  const pectoralChain = new THREE.Mesh(pectoralChainGeo, goldMat);
  pectoralChain.castShadow = true;
  torsoGroup.add(pectoralChain);

  [-0.22, -0.11, 0.11, 0.22].forEach((mx, mIdx) => {
    const medal = new THREE.Mesh(pectoralMedalGeo, mIdx % 2 === 0 ? goldMat : mats.heroArcaneCrystalMat);
    medal.position.set(mx, 0.53 - Math.abs(mx) * 0.12, 0.355 - Math.abs(mx) * 0.14);
    medal.scale.set(0.85, 1.25, 0.55);
    medal.castShadow = true;
    torsoGroup.add(medal);
  });

  [-1, 1].forEach((dir) => {
    const chev = new THREE.Mesh(chestChevronGeo, goldMat);
    chev.position.set(dir * 0.14, 0.34, 0.355);
    chev.rotation.y = dir * -0.26;
    chev.rotation.z = dir * 0.32;
    chev.castShadow = true;
    torsoGroup.add(chev);
  });

  // Real 3D Sculpted Flowing Mantle (Outer Embroidered Velvet + Inner Crimson Silk Lining)
  const mantleUSegs = detailLevel >= 2 ? 18 : 12;
  const mantleVSegs = detailLevel >= 2 ? 16 : 10;
  const outerMantleGeo = buildSculptedMantleGeometry(mantleUSegs, mantleVSegs, 0, 1.0, 1.0);
  const innerMantleGeo = buildSculptedMantleGeometry(mantleUSegs, mantleVSegs, 0.052, 0.96, 0.98);
  const capeletGeo = buildSculptedMantleGeometry(14, 6, -0.046, 1.03, 0.34);
  geometries.push(outerMantleGeo, innerMantleGeo, capeletGeo);

  const outerMantle = new THREE.Mesh(outerMantleGeo, velvetMat);
  outerMantle.castShadow = true;
  outerMantle.receiveShadow = true;
  torsoGroup.add(outerMantle);

  const innerMantle = new THREE.Mesh(innerMantleGeo, silkMat);
  innerMantle.receiveShadow = true;
  torsoGroup.add(innerMantle);

  // Layered royal velvet shoulder capelet drape sitting cleanly outside the mantle
  const capelet = new THREE.Mesh(capeletGeo, velvetMat);
  capelet.castShadow = true;
  capelet.receiveShadow = true;
  torsoGroup.add(capelet);

  // Braided golden mantle borders + shoulder clasp brooches + collar chain
  const claspGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.036, 8);
  claspGeo.rotateX(Math.PI / 2);
  const studGemGeo = new THREE.OctahedronGeometry(0.042, 0);
  const borderTubePointsL = [
    new THREE.Vector3(-0.36, 0.69, -0.14 + 0.24),
    new THREE.Vector3(-0.56, 0.14, -0.38 + 0.18),
    new THREE.Vector3(-0.79, -0.96, -0.56 + 0.14),
  ];
  const borderCurveL = new THREE.CatmullRomCurve3(borderTubePointsL);
  const borderGeoL = new THREE.TubeGeometry(borderCurveL, 12, 0.022, 6, false);
  const borderCurveR = new THREE.CatmullRomCurve3(
    borderTubePointsL.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
  );
  const borderGeoR = new THREE.TubeGeometry(borderCurveR, 12, 0.022, 6, false);
  const collarChainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.28, 0.62, -0.25),
    new THREE.Vector3(-0.14, 0.56, -0.3),
    new THREE.Vector3(0.0, 0.53, -0.31),
    new THREE.Vector3(0.14, 0.56, -0.3),
    new THREE.Vector3(0.28, 0.62, -0.25),
  ]);
  const collarChainGeo = new THREE.TubeGeometry(collarChainCurve, 12, 0.013, 6, false);
  ensureTangents(borderGeoL);
  ensureTangents(borderGeoR);
  ensureTangents(collarChainGeo);
  geometries.push(claspGeo, studGemGeo, borderGeoL, borderGeoR, collarChainGeo);

  const borderL = new THREE.Mesh(borderGeoL, goldMat);
  borderL.castShadow = true;
  const borderR = new THREE.Mesh(borderGeoR, goldMat);
  borderR.castShadow = true;
  const collarChain = new THREE.Mesh(collarChainGeo, goldMat);
  torsoGroup.add(borderL, borderR, collarChain);

  [-1, 1].forEach((dir) => {
    const clasp = new THREE.Mesh(claspGeo, goldMat);
    clasp.position.set(dir * 0.28, 0.62, -0.24);
    clasp.rotation.y = dir * 0.32;
    clasp.castShadow = true;
    torsoGroup.add(clasp);

    const gem = new THREE.Mesh(studGemGeo, mats.heroArcaneCrystalMat);
    gem.position.set(dir * 0.28, 0.62, -0.265);
    torsoGroup.add(gem);
  });

  // Animated twin crimson silk mantle ribbons trailing cleanly behind the cape
  const ribbonGeo = new THREE.BoxGeometry(0.068, 0.88, 0.012);
  ribbonGeo.translate(0, -0.44, 0);
  geometries.push(ribbonGeo);
  const mantleRibbons: THREE.Mesh[] = [];
  [-1, 1].forEach((dir) => {
    const rib = new THREE.Mesh(ribbonGeo, silkMat);
    rib.position.set(dir * 0.31, 0.6, -0.28);
    rib.rotation.x = 0.42;
    rib.rotation.z = dir * -0.14;
    rib.castShadow = true;
    torsoGroup.add(rib);
    mantleRibbons.push(rib);
  });

  // Dorsal Celestial Astrolabe Reliquary + Segmented Spine Plates (proud of mantle surface)
  let backWheel: THREE.Mesh | null = null;
  let outerAstrolabe: THREE.Mesh | null = null;
  if (detailLevel >= 1) {
    const plateGeo = new THREE.BoxGeometry(0.15, 0.078, 0.048);
    geometries.push(plateGeo);
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(plateGeo, steelMat);
      plate.position.set(0, 0.44 - i * 0.19, -0.39 - i * 0.068);
      plate.rotation.x = 0.26;
      plate.scale.set(1 + i * 0.1, 1, 1);
      plate.castShadow = true;
      torsoGroup.add(plate);
      registerShatter(plate, 0, 2.2 - i * 0.3, -2.8);
    }

    const conduitHousingGeo = new THREE.TorusGeometry(0.25, 0.028, 8, detailLevel >= 2 ? 26 : 16);
    const vialGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8);
    const clawGeo = new THREE.ConeGeometry(0.024, 0.11, 4);
    geometries.push(conduitHousingGeo, vialGeo, clawGeo);

    const conduitHousing = new THREE.Mesh(conduitHousingGeo, goldMat);
    conduitHousing.position.set(0, 0.38, -0.49);
    conduitHousing.castShadow = true;
    torsoGroup.add(conduitHousing);
    registerShatter(conduitHousing, 0, 3.6, -3.2);

    const vial = new THREE.Mesh(vialGeo, coreMat);
    vial.position.set(0, 0.38, -0.49);
    torsoGroup.add(vial);

    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2 + Math.PI / 4;
      const claw = new THREE.Mesh(clawGeo, goldMat);
      claw.position.set(Math.cos(ang) * 0.2, 0.38 + Math.sin(ang) * 0.2, -0.49);
      claw.rotation.z = ang + Math.PI / 2;
      torsoGroup.add(claw);
    }

    if (detailLevel >= 2) {
      const innerGearGeo = new THREE.TorusGeometry(0.16, 0.016, 6, 16);
      geometries.push(innerGearGeo);
      backWheel = new THREE.Mesh(innerGearGeo, goldMat);
      backWheel.position.set(0, 0.38, -0.52);
      torsoGroup.add(backWheel);

      if (detailLevel >= 3) {
        const outerRelicGeo = new THREE.TorusGeometry(0.34, 0.015, 6, 28);
        geometries.push(outerRelicGeo);
        outerAstrolabe = new THREE.Mesh(outerRelicGeo, steelMat);
        outerAstrolabe.position.set(0, 0.38, -0.5);
        torsoGroup.add(outerAstrolabe);
      }
    }
  }

  // 4. Triple-Lame Crescent Pauldrons, Articulated Arms & 5-Fingered Gauntlets
  const pauldronShape = new THREE.Shape();
  pauldronShape.moveTo(-0.19, -0.12);
  pauldronShape.quadraticCurveTo(0, 0.24, 0.26, 0.04);
  pauldronShape.quadraticCurveTo(0.18, -0.14, 0, -0.16);
  pauldronShape.closePath();
  const pauldronGeo = new THREE.ExtrudeGeometry(pauldronShape, {
    depth: 0.25,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: detailLevel >= 2 ? 2 : 1,
  });
  pauldronGeo.center();

  const upperArmGeo = new THREE.CapsuleGeometry(0.076, 0.25, 5, 8);
  const forearmGeo = new THREE.CapsuleGeometry(0.068, 0.24, 5, 8);
  const vambraceCuffGeo = new THREE.TorusGeometry(0.075, 0.014, 6, 14);
  const couterGeo = new THREE.OctahedronGeometry(0.066, 0);
  const shoulderStoleGeo = new THREE.BoxGeometry(0.08, 0.34, 0.02);
  const pauldronCrestGeo = new THREE.BoxGeometry(0.24, 0.032, 0.036);
  const pauldronFinialGeo = new THREE.ConeGeometry(0.038, 0.17, 4);
  geometries.push(
    pauldronGeo,
    upperArmGeo,
    forearmGeo,
    vambraceCuffGeo,
    couterGeo,
    shoulderStoleGeo,
    pauldronCrestGeo,
    pauldronFinialGeo
  );

  [-1, 1].forEach((dir) => {
    const pTop = new THREE.Mesh(pauldronGeo, goldMat);
    pTop.position.set(dir * 0.45, 0.62, 0);
    pTop.scale.set(dir * 1.05, 1.12, 1.16);
    pTop.rotation.z = -dir * 0.22;
    pTop.castShadow = true;
    pTop.receiveShadow = true;
    torsoGroup.add(pTop);
    registerShatter(pTop, dir * 2.8, 3.4, 0.9);

    const pCrest = new THREE.Mesh(pauldronCrestGeo, steelMat);
    pCrest.position.set(dir * 0.48, 0.72, 0);
    pCrest.rotation.z = -dir * 0.24;
    pCrest.castShadow = true;
    torsoGroup.add(pCrest);

    const pFinial = new THREE.Mesh(pauldronFinialGeo, goldMat);
    pFinial.position.set(dir * 0.43, 0.81, -0.02);
    pFinial.rotation.z = -dir * 0.32;
    pFinial.castShadow = true;
    torsoGroup.add(pFinial);

    const pMid = new THREE.Mesh(pauldronGeo, steelMat);
    pMid.position.set(dir * 0.49, 0.5, 0);
    pMid.scale.set(dir * 0.88, 0.88, 1.02);
    pMid.rotation.z = -dir * 0.36;
    pMid.castShadow = true;
    pMid.receiveShadow = true;
    torsoGroup.add(pMid);
    registerShatter(pMid, dir * 3.1, 2.2, -0.6);

    if (detailLevel >= 2) {
      const pLow = new THREE.Mesh(pauldronGeo, goldMat);
      pLow.position.set(dir * 0.51, 0.4, 0);
      pLow.scale.set(dir * 0.72, 0.72, 0.88);
      pLow.rotation.z = -dir * 0.48;
      pLow.castShadow = true;
      torsoGroup.add(pLow);

      const stole = new THREE.Mesh(shoulderStoleGeo, silkMat);
      stole.position.set(dir * 0.48, 0.35, -0.11);
      stole.rotation.z = -dir * 0.14;
      stole.rotation.x = 0.18;
      stole.castShadow = true;
      torsoGroup.add(stole);
    }

    const armRoot = new THREE.Group();
    armRoot.position.set(dir * 0.44, 0.5, 0.02);
    torsoGroup.add(armRoot);

    const upper = new THREE.Mesh(upperArmGeo, velvetMat);
    upper.position.set(dir * 0.08, -0.14, 0.04);
    upper.rotation.z = dir * 0.24;
    upper.rotation.x = -0.22;
    upper.castShadow = true;
    armRoot.add(upper);

    const isStaffArm = dir === 1;
    const forearm = new THREE.Mesh(forearmGeo, steelMat);
    forearm.position.set(dir * 0.15, -0.24, isStaffArm ? 0.25 : 0.27);
    forearm.rotation.x = isStaffArm ? -1.16 : -1.04;
    forearm.castShadow = true;
    armRoot.add(forearm);

    const cuff = new THREE.Mesh(vambraceCuffGeo, goldMat);
    cuff.position.set(dir * 0.16, -0.2, isStaffArm ? 0.36 : 0.38);
    cuff.rotation.x = isStaffArm ? 0.4 : 0.52;
    armRoot.add(cuff);

    if (detailLevel >= 2) {
      const couter = new THREE.Mesh(couterGeo, goldMat);
      couter.position.set(dir * 0.12, -0.27, 0.05);
      couter.scale.set(0.85, 0.85, 1.38);
      couter.castShadow = true;
      armRoot.add(couter);
    }

    const hand = buildArticulatedGauntlet(
      steelMat,
      goldMat,
      geometries,
      dir as 1 | -1,
      isStaffArm ? 'grip_staff' : 'cradle_book',
      detailLevel
    );
    hand.position.set(dir * 0.18, isStaffArm ? -0.17 : -0.16, isStaffArm ? 0.43 : 0.45);
    hand.rotation.y = dir * (isStaffArm ? -0.25 : 0.28);
    armRoot.add(hand);
  });

  // 5. Chiseled Alabaster Battle-Mask, Multi-Fold Draped Hood & Celestial Crown
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.9, 0.03);
  torsoGroup.add(headGroup);
  registerShatter(headGroup, 0.6, 5.2, 1.5, 5.0, 4.0);

  const headGeo = makeLatheProfile(
    [
      [0.0, -0.18],
      [0.088, -0.15],
      [0.138, -0.04],
      [0.165, 0.08],
      [0.148, 0.2],
      [0.08, 0.27],
      [0.0, 0.285],
    ],
    detailLevel >= 2 ? 16 : 10
  );
  const chinGuardGeo = new THREE.BoxGeometry(0.11, 0.09, 0.08);
  const nasalBridgeGeo = new THREE.BoxGeometry(0.026, 0.13, 0.045);
  const browCrestGeo = new THREE.BoxGeometry(0.16, 0.022, 0.05);
  const cheekPlaneGeo = new THREE.BoxGeometry(0.042, 0.095, 0.048);
  const visorSlitGeo = new THREE.CylinderGeometry(0.162, 0.162, 0.042, 14, 1, true, -0.85, 1.7);
  const eyeGeo = new THREE.OctahedronGeometry(0.022, 1);
  geometries.push(headGeo, chinGuardGeo, nasalBridgeGeo, browCrestGeo, cheekPlaneGeo, visorSlitGeo, eyeGeo);

  const headMesh = new THREE.Mesh(headGeo, visageMat);
  headMesh.scale.set(0.92, 1.0, 1.12);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  const chinGuard = new THREE.Mesh(chinGuardGeo, goldMat);
  chinGuard.position.set(0, -0.09, 0.12);
  chinGuard.rotation.x = 0.25;
  chinGuard.castShadow = true;
  headGroup.add(chinGuard);

  const nasalBridge = new THREE.Mesh(nasalBridgeGeo, goldMat);
  nasalBridge.position.set(0, 0.03, 0.162);
  headGroup.add(nasalBridge);

  const browCrest = new THREE.Mesh(browCrestGeo, goldMat);
  browCrest.position.set(0, 0.105, 0.155);
  headGroup.add(browCrest);

  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(cheekPlaneGeo, steelMat);
    cheek.position.set(side * 0.096, -0.02, 0.128);
    cheek.rotation.y = side * 0.38;
    cheek.rotation.z = side * -0.18;
    headGroup.add(cheek);
  });

  const visorSlit = new THREE.Mesh(visorSlitGeo, mats.voidMat);
  visorSlit.position.set(0, 0.06, 0.015);
  visorSlit.rotation.y = Math.PI * 0.5;
  visorSlit.scale.set(1.12, 1, 0.94);
  headGroup.add(visorSlit);

  [-0.056, 0.056].forEach((ex) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.06, 0.168);
    eye.scale.set(1.42, 0.68, 0.58);
    headGroup.add(eye);
  });

  // Draped Sovereign Hood with golden cowl lip trim
  const hoodGeo = makeLatheProfile(
    [
      [0.2, -0.15],
      [0.22, 0.04],
      [0.2, 0.23],
      [0.125, 0.36],
      [0.022, 0.48],
      [0.0, 0.49],
    ],
    detailLevel >= 2 ? 16 : 10
  );
  const cowlRimGeo = new THREE.TorusGeometry(0.185, 0.016, 6, 20, Math.PI * 1.45);
  geometries.push(hoodGeo, cowlRimGeo);

  const hood = new THREE.Mesh(hoodGeo, velvetMat);
  hood.position.set(0, 0.02, -0.05);
  hood.rotation.x = -0.36;
  hood.scale.set(1.04, 1.0, 1.2);
  hood.castShadow = true;
  hood.receiveShadow = true;
  headGroup.add(hood);

  const cowlRim = new THREE.Mesh(cowlRimGeo, goldMat);
  cowlRim.position.set(0, 0.09, 0.08);
  cowlRim.rotation.z = -Math.PI * 0.22;
  cowlRim.rotation.x = 0.32;
  headGroup.add(cowlRim);

  // 7-Spired Celestial Tarot Crown + Forehead Iridescent Crystal Jewel
  const crownShape = new THREE.Shape();
  crownShape.moveTo(-0.185, 0);
  crownShape.lineTo(-0.235, 0.17);
  crownShape.lineTo(-0.155, 0.085);
  crownShape.lineTo(-0.135, 0.23);
  crownShape.lineTo(-0.085, 0.105);
  crownShape.lineTo(-0.052, 0.25);
  crownShape.lineTo(-0.025, 0.135);
  crownShape.lineTo(0, 0.34);
  crownShape.lineTo(0.025, 0.135);
  crownShape.lineTo(0.052, 0.25);
  crownShape.lineTo(0.085, 0.105);
  crownShape.lineTo(0.135, 0.23);
  crownShape.lineTo(0.155, 0.085);
  crownShape.lineTo(0.235, 0.17);
  crownShape.lineTo(0.185, 0);
  crownShape.closePath();
  const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.009,
    bevelSegments: 2,
  });
  const crownGemGeo = new THREE.OctahedronGeometry(0.036, 0);
  geometries.push(crownGeo, crownGemGeo);

  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.position.set(0, 0.145, 0.135);
  crown.rotation.x = -0.15;
  crown.castShadow = true;
  headGroup.add(crown);

  const crownGem = new THREE.Mesh(crownGemGeo, mats.heroArcaneCrystalMat);
  crownGem.position.set(0, 0.205, 0.168);
  crownGem.scale.set(0.85, 1.38, 0.65);
  headGroup.add(crownGem);

  // 6. Triple-Ring Sovereign Celestial Halo (visible from front and rear!)
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 0.9, -0.24);
  torsoGroup.add(haloGroup);
  registerShatter(haloGroup, 0, 4.6, -2.1, 3.0, 5.2);

  const outerHaloGeo = new THREE.TorusGeometry(0.66, 0.024, 8, detailLevel >= 2 ? 44 : 24);
  ensureTangents(outerHaloGeo);
  geometries.push(outerHaloGeo);
  const haloRing = new THREE.Mesh(outerHaloGeo, goldMat);
  haloRing.castShadow = true;
  haloGroup.add(haloRing);

  let innerHaloRing: THREE.Mesh | null = null;
  if (detailLevel >= 2) {
    const innerHaloGeo = new THREE.TorusGeometry(0.51, 0.015, 6, 32);
    const nodeGeo = new THREE.OctahedronGeometry(0.052, 0);
    const prongGeo = new THREE.ConeGeometry(0.024, 0.14, 4);
    geometries.push(innerHaloGeo, nodeGeo, prongGeo);

    innerHaloRing = new THREE.Mesh(innerHaloGeo, steelMat);
    innerHaloRing.position.z = -0.02;
    haloGroup.add(innerHaloRing);

    const nodeCount = detailLevel >= 3 ? 8 : 4;
    for (let i = 0; i < nodeCount; i++) {
      const ang = (i / nodeCount) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, i % 2 === 0 ? mats.heroArcaneCrystalMat : goldMat);
      node.position.set(Math.cos(ang) * 0.66, Math.sin(ang) * 0.66, 0);
      node.scale.set(0.75, 1.38, 0.75);
      node.rotation.z = ang - Math.PI / 2;
      haloGroup.add(node);

      if (detailLevel >= 3) {
        const prong = new THREE.Mesh(prongGeo, goldMat);
        prong.position.set(Math.cos(ang) * 0.75, Math.sin(ang) * 0.75, 0);
        prong.rotation.z = ang - Math.PI / 2;
        haloGroup.add(prong);
      }
    }
  }

  // 7. Monumental Halberd-Astrolabe Staff (Right Hand)
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0.62, 0, 0.45);
  animRig.add(staffGroup);
  registerShatter(staffGroup, 3.4, 3.9, 1.6, 4.5, 4.2);

  const shaftGeo = new THREE.CylinderGeometry(0.028, 0.036, 2.58, detailLevel >= 2 ? 12 : 8);
  const gripGeo = new THREE.CylinderGeometry(0.037, 0.037, 0.34, 10);
  const buttSpikeGeo = new THREE.ConeGeometry(0.044, 0.24, 6);
  const collarRingGeo = new THREE.TorusGeometry(0.046, 0.014, 6, 12);
  collarRingGeo.rotateX(Math.PI / 2);

  const halberdShape = new THREE.Shape();
  halberdShape.moveTo(0, -0.2);
  halberdShape.quadraticCurveTo(0.24, -0.14, 0.3, 0.02);
  halberdShape.quadraticCurveTo(0.2, 0.22, 0, 0.28);
  halberdShape.lineTo(0.04, 0.04);
  halberdShape.closePath();
  const halberdGeo = new THREE.ExtrudeGeometry(halberdShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  halberdGeo.rotateY(Math.PI / 2);
  halberdGeo.translate(-0.01, 0, 0);

  const spearTipGeo = new THREE.ConeGeometry(0.068, 0.44, 4);
  const spearFullerGeo = new THREE.BoxGeometry(0.016, 0.28, 0.032);
  const staffGemGeo = new THREE.OctahedronGeometry(0.118, 1);
  const tasselGeo = new THREE.ConeGeometry(0.042, 0.22, 8);
  const banneretBarGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.25, 8);
  banneretBarGeo.rotateZ(Math.PI / 2);
  const banneretGeo = buildCurvedBanneretGeometry(0.2, 0.56);
  geometries.push(
    shaftGeo,
    gripGeo,
    buttSpikeGeo,
    collarRingGeo,
    halberdGeo,
    spearTipGeo,
    spearFullerGeo,
    staffGemGeo,
    tasselGeo,
    banneretBarGeo,
    banneretGeo
  );

  const staff = new THREE.Mesh(shaftGeo, mats.darkBronzeMat);
  staff.position.y = 1.29;
  staff.castShadow = true;
  staff.receiveShadow = true;
  staffGroup.add(staff);

  const gripWrap = new THREE.Mesh(gripGeo, silkMat);
  gripWrap.position.y = 1.38;
  staffGroup.add(gripWrap);

  const buttSpike = new THREE.Mesh(buttSpikeGeo, steelMat);
  buttSpike.rotation.x = Math.PI;
  buttSpike.position.y = 0.08;
  buttSpike.castShadow = true;
  staffGroup.add(buttSpike);

  [0.24, 1.2, 1.56, 2.28].forEach((ry) => {
    const cr = new THREE.Mesh(collarRingGeo, goldMat);
    cr.position.y = ry;
    staffGroup.add(cr);
  });

  const halberdFront = new THREE.Mesh(halberdGeo, steelMat);
  halberdFront.position.y = 2.54;
  halberdFront.castShadow = true;
  staffGroup.add(halberdFront);

  const halberdBack = new THREE.Mesh(halberdGeo, goldMat);
  halberdBack.position.y = 2.54;
  halberdBack.scale.set(1, 0.72, -0.68);
  halberdBack.castShadow = true;
  staffGroup.add(halberdBack);

  const spearTip = new THREE.Mesh(spearTipGeo, steelMat);
  spearTip.position.y = 2.95;
  spearTip.castShadow = true;
  staffGroup.add(spearTip);

  const spearFuller = new THREE.Mesh(spearFullerGeo, goldMat);
  spearFuller.position.y = 2.86;
  staffGroup.add(spearFuller);

  const orb = new THREE.Mesh(staffGemGeo, mats.heroArcaneCrystalMat);
  orb.position.y = 2.56;
  staffGroup.add(orb);

  const tassel = new THREE.Mesh(tasselGeo, silkMat);
  tassel.position.set(0, 2.16, 0.05);
  staffGroup.add(tassel);

  const banneretPivot = new THREE.Group();
  banneretPivot.position.set(0, 2.26, -0.05);
  const bannerBar = new THREE.Mesh(banneretBarGeo, goldMat);
  const bannerCloth = new THREE.Mesh(banneretGeo, silkMat);
  bannerCloth.castShadow = true;
  banneretPivot.add(bannerBar, bannerCloth);
  staffGroup.add(banneretPivot);

  let staffGimbalA: THREE.Mesh | null = null;
  let staffGimbalB: THREE.Mesh | null = null;
  if (detailLevel >= 2) {
    const gimbalGeo = new THREE.TorusGeometry(0.195, 0.014, 6, 24);
    geometries.push(gimbalGeo);
    staffGimbalA = new THREE.Mesh(gimbalGeo, goldMat);
    staffGimbalA.position.y = 2.56;
    staffGimbalA.castShadow = true;
    staffGroup.add(staffGimbalA);

    if (detailLevel >= 3) {
      staffGimbalB = new THREE.Mesh(gimbalGeo, goldMat);
      staffGimbalB.position.y = 2.56;
      staffGimbalB.scale.setScalar(0.8);
      staffGimbalB.rotation.x = Math.PI / 3;
      staffGroup.add(staffGimbalB);
    }
  }

  // 8. Illuminated Open Grimoire with Curved Vellum Pages & Floating Spell-Sigil Prism (Left Hand)
  const offHandGroup = new THREE.Group();
  offHandGroup.position.set(-0.62, 1.38, 0.49);
  offHandGroup.rotation.x = -0.42;
  animRig.add(offHandGroup);
  registerShatter(offHandGroup, -3.2, 3.5, 1.8, 4.0, 4.8);

  const coverGeo = new THREE.BoxGeometry(0.25, 0.36, 0.028);
  const pageGeo = buildCurvedVellumPageGeometry(0.225, 0.315);
  const pageBlockGeo = new THREE.BoxGeometry(0.215, 0.305, 0.016);
  const spineGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.37, 8);
  const bookmarkGeo = new THREE.BoxGeometry(0.022, 0.24, 0.006);
  const bookClaspRibGeo = new THREE.BoxGeometry(0.068, 0.022, 0.036);
  geometries.push(coverGeo, pageGeo, pageBlockGeo, spineGeo, bookmarkGeo, bookClaspRibGeo);

  const leftCover = new THREE.Mesh(coverGeo, mats.agedLeatherMat);
  leftCover.position.x = -0.115;
  leftCover.rotation.y = 0.36;
  leftCover.castShadow = true;
  leftCover.receiveShadow = true;
  const rightCover = new THREE.Mesh(coverGeo, mats.agedLeatherMat);
  rightCover.position.x = 0.115;
  rightCover.rotation.y = -0.36;
  rightCover.castShadow = true;
  rightCover.receiveShadow = true;

  [-0.14, 0.14].forEach((ry) => {
    const claspL = new THREE.Mesh(bookClaspRibGeo, goldMat);
    claspL.position.set(-0.085, ry, 0);
    leftCover.add(claspL);
    const claspR = new THREE.Mesh(bookClaspRibGeo, goldMat);
    claspR.position.set(0.085, ry, 0);
    rightCover.add(claspR);
  });

  const leftPageBlock = new THREE.Mesh(pageBlockGeo, mats.boneIvoryMat);
  leftPageBlock.position.set(-0.11, 0, 0.012);
  leftPageBlock.rotation.y = 0.36;
  const rightPageBlock = new THREE.Mesh(pageBlockGeo, mats.boneIvoryMat);
  rightPageBlock.position.set(0.11, 0, 0.012);
  rightPageBlock.rotation.y = -0.36;

  const leftPage = new THREE.Mesh(pageGeo, mats.heroGrimoirePageMat);
  leftPage.position.set(-0.11, 0, 0.021);
  leftPage.rotation.y = 0.36;
  const rightPage = new THREE.Mesh(pageGeo, mats.heroGrimoirePageMat);
  rightPage.position.set(0.11, 0, 0.021);
  rightPage.rotation.y = -0.36;

  const bookSpine = new THREE.Mesh(spineGeo, goldMat);
  bookSpine.position.z = -0.02;

  const bookmarkL = new THREE.Mesh(bookmarkGeo, silkMat);
  bookmarkL.position.set(-0.04, -0.24, 0.03);
  bookmarkL.rotation.z = -0.12;
  const bookmarkR = new THREE.Mesh(bookmarkGeo, goldMat);
  bookmarkR.position.set(0.04, -0.26, 0.03);
  bookmarkR.rotation.z = 0.14;

  offHandGroup.add(
    leftCover,
    rightCover,
    leftPageBlock,
    rightPageBlock,
    leftPage,
    rightPage,
    bookSpine,
    bookmarkL,
    bookmarkR
  );

  let bookRuneRing: THREE.Mesh | null = null;
  let bookSpellPrism: THREE.Mesh | null = null;
  if (detailLevel >= 2) {
    const bookRuneGeo = new THREE.TorusGeometry(0.145, 0.011, 6, 22);
    const bookPrismGeo = new THREE.OctahedronGeometry(0.046, 0);
    geometries.push(bookRuneGeo, bookPrismGeo);
    bookRuneRing = new THREE.Mesh(bookRuneGeo, coreMat);
    bookRuneRing.position.set(0, 0.04, 0.165);
    offHandGroup.add(bookRuneRing);

    bookSpellPrism = new THREE.Mesh(bookPrismGeo, mats.heroArcaneCrystalMat);
    bookSpellPrism.position.set(0, 0.04, 0.175);
    bookSpellPrism.scale.set(0.8, 1.35, 0.8);
    offHandGroup.add(bookSpellPrism);
  }

  // 9. Orbiting Tarot Arcane Plates & 5 Resonance Crown Spheres
  const orbitingTarotSeals: THREE.Group[] = [];
  if (detailLevel >= 2) {
    const sealFrameGeo = new THREE.BoxGeometry(0.12, 0.18, 0.016);
    const sealCoreGeo = new THREE.OctahedronGeometry(0.042, 0);
    geometries.push(sealFrameGeo, sealCoreGeo);
    const sealCount = detailLevel >= 3 ? 4 : 2;
    for (let s = 0; s < sealCount; s++) {
      const seal = new THREE.Group();
      const plate = new THREE.Mesh(sealFrameGeo, goldMat);
      const gem = new THREE.Mesh(sealCoreGeo, coreMat);
      gem.position.z = 0.014;
      seal.add(plate, gem);
      torsoGroup.add(seal);
      orbitingTarotSeals.push(seal);
      registerShatter(seal, Math.cos(s * 1.5) * 3.0, 4.0, Math.sin(s * 1.5) * 3.0);
    }
  }

  const resonanceOrbs: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = [];
  const resOrbGeo = new THREE.OctahedronGeometry(0.07, 1);
  geometries.push(resOrbGeo);
  for (let r = 0; r < 5; r++) {
    const rMat = new THREE.MeshStandardMaterial({
      color: 0x3a3245,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.78,
    });
    customMats.push(rMat);
    const rMesh = new THREE.Mesh(resOrbGeo, rMat);
    torsoGroup.add(rMesh);
    resonanceOrbs.push({ mesh: rMesh, mat: rMat });
    registerShatter(rMesh, (r - 2) * 1.4, 4.6, 1.2);
  }

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
      overloadOn = overload;
      const targetHex = overload ? TAROT_PALETTE.overload : TAROT_PALETTE.ether;
      coreMat.color.setHex(targetHex);
      coreMat.emissive.setHex(overload ? 0x8f2414 : 0x2f7d75);
      coreMat.emissiveIntensity = overload ? 1.1 : 0.76;
      if (overloadRing) overloadRing.visible = overload;
    },
    setResonanceLevel: (level: number) => {
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
      tetherOn = active;
      tetherRing.visible = active;
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
        tetherRing.visible = false;
        shatterTime += safeDt;
        const p = Math.min(1, shatterTime / 1.05);
        for (let i = 0; i < shatterPieces.length; i++) {
          const sp = shatterPieces[i];
          sp.obj.position.x += sp.vx * safeDt;
          sp.obj.position.y += sp.vy * safeDt;
          sp.obj.position.z += sp.vz * safeDt;
          sp.vy -= 11.5 * safeDt;
          sp.obj.rotation.x += sp.rx * safeDt;
          sp.obj.rotation.z += sp.rz * safeDt;
          sp.obj.scale.setScalar(Math.max(0.01, 1 - p * 0.92));
        }
        cassock.scale.y = Math.max(0.1, 1 - p * 0.85);
        shadowMat.opacity = Math.max(0, 0.74 * (1 - p));
        return;
      }

      if (castFlare > 0) castFlare = Math.max(0, castFlare - safeDt * 2.5);
      if (hitRecoil > 0) hitRecoil = Math.max(0, hitRecoil - safeDt * 3.4);

      const breath = Math.sin(time * 2.0);
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

      headGroup.rotation.y = Math.sin(time * 0.72) * 0.085;
      headGroup.rotation.x = breath * 0.032;

      // Subtle living motion on mantle ribbons, censer, tassel & Astrolabe reliquary
      for (let i = 0; i < mantleRibbons.length; i++) {
        const dir = i === 0 ? -1 : 1;
        mantleRibbons[i].rotation.x = 0.42 + Math.sin(time * 2.6 + i * 1.3) * 0.05 + castFlare * 0.22;
        mantleRibbons[i].rotation.z = dir * (-0.14 - Math.cos(time * 2.1 + i) * 0.05);
      }
      censerPivot.rotation.z = Math.sin(time * 2.3) * 0.09 + castFlare * 0.18;
      tassel.rotation.x = Math.sin(time * 3.1) * 0.12 + castFlare * 0.25;
      banneretPivot.rotation.x = 0.16 + Math.sin(time * 2.4) * 0.08 + castFlare * 0.22;
      banneretPivot.rotation.z = Math.cos(time * 1.9) * 0.07;

      haloRing.rotation.z = time * 0.28;
      if (innerHaloRing) innerHaloRing.rotation.z = -time * 0.45;
      if (backWheel) backWheel.rotation.z = -time * 0.95;
      if (outerAstrolabe) {
        outerAstrolabe.rotation.z = time * 0.55;
        outerAstrolabe.rotation.y = Math.sin(time * 0.8) * 0.22;
      }

      for (let s = 0; s < orbitingTarotSeals.length; s++) {
        const seal = orbitingTarotSeals[s];
        const ang = time * (0.65 + castFlare * 1.9) + (s * Math.PI * 2) / orbitingTarotSeals.length;
        seal.position.set(
          Math.cos(ang) * 0.86,
          0.34 + Math.sin(time * 2.2 + s * 1.4) * 0.09,
          Math.sin(ang) * 0.64
        );
        seal.rotation.y = -ang + Math.PI * 0.5;
      }

      if (overloadRing && overloadRingMat && overloadOn) {
        overloadRing.rotation.y = time * 1.25;
        overloadRing.scale.setScalar(1 + Math.sin(time * 4.2) * 0.05);
        overloadRingMat.opacity = 0.5 + Math.sin(time * 5.2) * 0.22;
      }
      if (tetherOn) {
        tetherRing.rotation.y = -time * 1.6;
        tetherRing.scale.setScalar(1 + Math.sin(time * 5.0) * 0.07);
        tetherRingMat.opacity = 0.55 + Math.sin(time * 6.0) * 0.25;
      }

      const fullRes = resonanceLevel >= 5;
      const spinSpeed = fullRes ? 1.9 : 0.72;
      for (let idx = 0; idx < resonanceOrbs.length; idx++) {
        const o = resonanceOrbs[idx];
        const ang =
          -Math.PI * 0.75 +
          (idx / 4) * Math.PI * 1.5 +
          (fullRes ? time * spinSpeed : Math.sin(time * 0.8) * 0.14);
        const radius = fullRes ? 0.78 + Math.sin(time * 4.5 + idx) * 0.04 : 0.7;
        o.mesh.position.set(
          Math.sin(ang) * radius,
          1.2 + Math.cos(ang * 0.6) * 0.18 + Math.sin(time * 2.4 + idx * 0.9) * 0.04,
          -0.18 + Math.cos(ang) * 0.18
        );
        o.mesh.rotation.y = time * 1.6 + idx;
        const lit = idx < resonanceLevel;
        o.mesh.scale.setScalar(lit ? (fullRes ? 1.28 + Math.sin(time * 5 + idx) * 0.12 : 1.06) : 0.62);
      }

      orb.rotation.y = time * (1.2 + castFlare * 4.5);
      orb.scale.setScalar(1 + castFlare * 0.45);
      coreMat.emissiveIntensity = (overloadOn ? 1.1 : 0.76) + castFlare * 1.15;

      staffGroup.rotation.x = THREE.MathUtils.damp(staffGroup.rotation.x, castFlare * 0.34, 12, safeDt);
      if (staffGimbalA) {
        staffGimbalA.rotation.y = time * 1.6;
        staffGimbalA.rotation.x = Math.sin(time * 1.1) * 0.4;
      }
      if (staffGimbalB) {
        staffGimbalB.rotation.z = -time * 2.0;
        staffGimbalB.rotation.y = Math.cos(time * 0.9) * 0.45;
      }

      offHandGroup.position.y = 1.38 + Math.cos(time * 2.1) * 0.032 + castFlare * 0.09;
      if (bookRuneRing) {
        bookRuneRing.rotation.z = time * (1.5 + castFlare * 3.0);
        bookRuneRing.scale.setScalar(1 + castFlare * 0.28 + Math.sin(time * 3.4) * 0.06);
      }
      if (bookSpellPrism) {
        bookSpellPrism.rotation.y = -time * (1.8 + castFlare * 4.0);
        bookSpellPrism.position.z = 0.175 + Math.sin(time * 3.2) * 0.014 + castFlare * 0.05;
      }
      orb.getWorldPosition(staffOriginWorld);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
    },
  };
}
