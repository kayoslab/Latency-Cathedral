import type { Mesh, BufferGeometry, Material } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Vector2 } from 'three';
import type { SceneParams } from '../domain/types';
import { createRenderer } from './createRenderer';
import { createScene } from './createScene';
import { createCamera, createCameraControls } from './createCamera';
import { createLights } from './createLights';
import { rebuildCathedral } from './rebuildCathedral';
import { applyAtmosphere } from './applyAtmosphere';
import { setTextures } from './buildCathedralGeometry';
import { createStoneTextures, createRoofNormalMap } from './stoneTexture';

export interface RendererHandle {
  dispose: () => void;
  update: (params: SceneParams) => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpParams(a: SceneParams, b: SceneParams, t: number): SceneParams {
  return {
    height: lerp(a.height, b.height, t),
    symmetry: lerp(a.symmetry, b.symmetry, t),
    fracture: lerp(a.fracture, b.fracture, t),
    fog: lerp(a.fog, b.fog, t),
    lightIntensity: lerp(a.lightIntensity, b.lightIntensity, t),
    ruinLevel: lerp(a.ruinLevel, b.ruinLevel, t),
  };
}

export function initRenderer(canvas: HTMLCanvasElement): RendererHandle {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera(window.innerWidth, window.innerHeight);
  const lights = createLights();

  scene.add(lights.ambient);
  scene.add(lights.directional);
  scene.add(lights.rim);
  scene.add(lights.interior);
  scene.add(lights.hemisphere);

  // Procedural textures
  const stoneTex = createStoneTextures();
  setTextures(stoneTex.color, stoneTex.normal, stoneTex.roughness, createRoofNormalMap());

  // Camera controls (mouse drag + touch)
  const cameraControls = createCameraControls(camera, renderer.domElement);

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new Vector2(window.innerWidth, window.innerHeight),
    0.25, // strength — subtle, doesn't wash out scene
    0.5,  // radius
    0.9,  // threshold — only bright emissives bloom
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  let cathedral: import('./rebuildCathedral').CathedralHandle | null = null;
  let lastShapeParams: { height: number; symmetry: number } | null = null;
  let lastRuinKey = '';
  let targetParams: SceneParams | null = null;
  let currentParams: SceneParams | null = null;

  let reducedMotion = false;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = motionQuery.matches;
  const onMotionChange = (e: MediaQueryListEvent) => { reducedMotion = e.matches; };
  motionQuery.addEventListener('change', onMotionChange);

  let animationId = 0;
  let paused = false;
  const SHAPE_THRESHOLD = 0.08; // only rebuild geometry for significant shape changes
  const RUIN_THRESHOLD = 0.02;  // cheaper ruin updates at finer granularity

  function needsShapeRebuild(p: SceneParams): boolean {
    if (!lastShapeParams) return true;
    return (
      Math.abs(lastShapeParams.height - p.height) > SHAPE_THRESHOLD ||
      Math.abs(lastShapeParams.symmetry - p.symmetry) > SHAPE_THRESHOLD
    );
  }

  function ruinKey(p: SceneParams): string {
    // Quantize ruin params to reduce update frequency
    const f = (v: number) => (Math.round(v / RUIN_THRESHOLD) * RUIN_THRESHOLD).toFixed(3);
    return `${f(p.fracture)}_${f(p.ruinLevel)}_${f(p.symmetry)}`;
  }

  function animate() {
    if (paused) return;
    animationId = requestAnimationFrame(animate);

    if (!reducedMotion) {
      cameraControls.controls.update();
    }

    if (targetParams && currentParams) {
      currentParams = lerpParams(currentParams, targetParams, 0.04);

      // Atmosphere: cheap, every frame
      applyAtmosphere(scene, lights, {
        fog: currentParams.fog,
        lightIntensity: currentParams.lightIntensity,
      });

      // Geometry rebuild: only when height or symmetry change significantly
      if (needsShapeRebuild(currentParams)) {
        cathedral = rebuildCathedral(scene, cathedral, currentParams);
        lastShapeParams = { height: currentParams.height, symmetry: currentParams.symmetry };
        lastRuinKey = ruinKey(currentParams);
      } else if (cathedral) {
        // Ruin update: cheap reset + reapply (no geometry rebuild)
        const rk = ruinKey(currentParams);
        if (rk !== lastRuinKey) {
          cathedral.applyRuin(currentParams);
          lastRuinKey = rk;
        }
      }
    }

    composer.render();
  }

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  const onVisibilityChange = () => {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animationId);
    } else {
      paused = false;
      animate();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  return {
    update(params: SceneParams) {
      targetParams = { ...params };
      if (!currentParams) {
        currentParams = { ...params };
        cathedral = rebuildCathedral(scene, cathedral, params);
        lastShapeParams = { height: params.height, symmetry: params.symmetry };
        lastRuinKey = ruinKey(params);
        applyAtmosphere(scene, lights, { fog: params.fog, lightIntensity: params.lightIntensity });
      }
    },

    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);

      if (cathedral) {
        cathedral.group.traverse((obj) => {
          const mesh = obj as Mesh<BufferGeometry, Material>;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            mesh.material?.dispose();
          }
        });
      }

      cameraControls.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
