import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { GRAPHICS_LEVEL } from '../../core/graphicsSettings';

export interface CinematicPipeline {
  setGraphicsLevel: (level: number) => void;
  setSize: (width: number, height: number) => void;
  setFocusTarget: (x: number, y: number, z: number) => void;
  setBloomIntensity: (intensity: number) => void;
  render: () => void;
  isComposerActive: () => boolean;
  dispose: () => void;
}

export function createCinematicPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  initialLevel: number,
  isSoftwareGl: boolean,
  options?: {
    bloomIntensity?: number;
    bloomThreshold?: number;
    focusRange?: number;
    bokehScale?: number;
  }
): CinematicPipeline {
  let currentLevel = initialLevel;
  const baseBloomIntensity = options?.bloomIntensity ?? 0.22;
  const bloomThreshold = options?.bloomThreshold ?? 1.18;
  const dofTarget = new THREE.Vector3(0, 0.85, 0);

  if (isSoftwareGl) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    return {
      setGraphicsLevel: (level: number) => {
        currentLevel = level;
      },
      setSize: () => {},
      setFocusTarget: () => {},
      setBloomIntensity: () => {},
      render: () => {
        renderer.render(scene, camera);
      },
      isComposerActive: () => false,
      dispose: () => {},
    };
  }

  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.autoRenderToScreen = false;

  const renderPass = new RenderPass(scene, camera);
  const normalPass = new NormalPass(scene, camera, {
    resolutionScale: 1.0,
  });

  const ssaoEffect = new SSAOEffect(camera, normalPass.texture, {
    blendFunction: BlendFunction.MULTIPLY,
    samples: 16,
    rings: 7,
    worldDistanceThreshold: 36,
    worldDistanceFalloff: 8,
    worldProximityThreshold: 0.55,
    worldProximityFalloff: 0.25,
    minRadiusScale: 0.15,
    luminanceInfluence: 0.78,
    radius: 0.12,
    intensity: 0.8,
    bias: 0.032,
    fade: 0.016,
    resolutionScale: 1.0,
  });
  const ssaoPass = new EffectPass(camera, ssaoEffect);

  const dofEffect = new DepthOfFieldEffect(camera, {
    focusRange: options?.focusRange ?? 20.0,
    bokehScale: options?.bokehScale ?? 0.55,
    resolutionScale: 0.85,
  });
  dofEffect.target = dofTarget;
  const dofPass = new EffectPass(camera, dofEffect);

  const bloomEffect = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: bloomThreshold,
    luminanceSmoothing: 0.1,
    intensity: baseBloomIntensity,
    radius: 0.42,
  });
  const toneMappingEffect = new ToneMappingEffect({
    mode: ToneMappingMode.ACES_FILMIC,
  });
  const bloomTonePass = new EffectPass(camera, bloomEffect, toneMappingEffect);

  const smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH,
  });
  const smaaPass = new EffectPass(camera, smaaEffect);

  composer.addPass(renderPass);
  composer.addPass(normalPass);
  composer.addPass(ssaoPass);
  composer.addPass(dofPass);
  composer.addPass(bloomTonePass);
  composer.addPass(smaaPass);

  const syncPassRouting = (level: number) => {
    currentLevel = level;
    const composerActive = level >= GRAPHICS_LEVEL.medium;
    const highOrUltra = level >= GRAPHICS_LEVEL.high;
    const ultraOnly = level >= GRAPHICS_LEVEL.ultra;

    // Avoid double tone-mapping: composer handles ACES_FILMIC when active
    renderer.toneMapping = composerActive ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;

    renderPass.enabled = composerActive;
    normalPass.enabled = highOrUltra;
    ssaoPass.enabled = highOrUltra;
    dofPass.enabled = ultraOnly;
    bloomTonePass.enabled = composerActive;
    smaaPass.enabled = highOrUltra;

    bloomEffect.intensity = ultraOnly
      ? baseBloomIntensity
      : highOrUltra
        ? baseBloomIntensity * 0.78
        : baseBloomIntensity * 0.6;

    // Ensure the final enabled pass renders directly to screen
    let foundLastEnabled = false;
    for (let i = composer.passes.length - 1; i >= 0; i--) {
      const pass = composer.passes[i];
      if (!foundLastEnabled && pass.enabled) {
        pass.renderToScreen = true;
        foundLastEnabled = true;
      } else {
        pass.renderToScreen = false;
      }
    }
  };

  syncPassRouting(initialLevel);
  composer.setSize(width, height);

  return {
    setGraphicsLevel: syncPassRouting,
    setSize: (w: number, h: number) => {
      composer.setSize(w, h);
    },
    setFocusTarget: (x: number, y: number, z: number) => {
      dofTarget.set(x, y, z);
    },
    setBloomIntensity: (intensity: number) => {
      bloomEffect.intensity = intensity;
    },
    render: () => {
      if (currentLevel >= GRAPHICS_LEVEL.medium) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    },
    isComposerActive: () => currentLevel >= GRAPHICS_LEVEL.medium,
    dispose: () => {
      composer.dispose();
    },
  };
}
