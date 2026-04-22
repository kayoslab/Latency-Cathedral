import type { Group, Mesh, BufferGeometry, Material } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Vector2 } from 'three';
import type { SceneParams } from '../domain/types';
import { createRenderer } from './createRenderer';
import { createScene } from './createScene';
import { createCamera, updateCameraOrbit } from './createCamera';
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

  let cathedralGroup: Group | null = null;
  let lastBuiltParams: SceneParams | null = null;
  let targetParams: SceneParams | null = null;
  let currentParams: SceneParams | null = null;

  let reducedMotion = false;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = motionQuery.matches;
  const onMotionChange = (e: MediaQueryListEvent) => { reducedMotion = e.matches; };
  motionQuery.addEventListener('change', onMotionChange);

  let animationId = 0;
  let paused = false;
  const startTime = performance.now();
  const GEOMETRY_REBUILD_THRESHOLD = 0.05;

  function needsGeometryRebuild(a: SceneParams, b: SceneParams): boolean {
    return (
      Math.abs(a.height - b.height) > GEOMETRY_REBUILD_THRESHOLD ||
      Math.abs(a.symmetry - b.symmetry) > GEOMETRY_REBUILD_THRESHOLD ||
      Math.abs(a.fracture - b.fracture) > GEOMETRY_REBUILD_THRESHOLD ||
      Math.abs(a.ruinLevel - b.ruinLevel) > GEOMETRY_REBUILD_THRESHOLD
    );
  }

  function animate() {
    if (paused) return;
    animationId = requestAnimationFrame(animate);

    if (!reducedMotion) {
      const elapsed = (performance.now() - startTime) / 1000;
      updateCameraOrbit(camera, elapsed);
    }

    if (targetParams && currentParams) {
      currentParams = lerpParams(currentParams, targetParams, 0.04);

      applyAtmosphere(scene, lights, {
        fog: currentParams.fog,
        lightIntensity: currentParams.lightIntensity,
      });

      if (!lastBuiltParams || needsGeometryRebuild(lastBuiltParams, currentParams)) {
        cathedralGroup = rebuildCathedral(scene, cathedralGroup, currentParams);
        lastBuiltParams = { ...currentParams };
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
        lastBuiltParams = { ...params };
        cathedralGroup = rebuildCathedral(scene, cathedralGroup, params);
        applyAtmosphere(scene, lights, { fog: params.fog, lightIntensity: params.lightIntensity });
      }
    },

    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);

      if (cathedralGroup) {
        cathedralGroup.traverse((obj) => {
          const mesh = obj as Mesh<BufferGeometry, Material>;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            mesh.material?.dispose();
          }
        });
      }

      composer.dispose();
      renderer.dispose();
    },
  };
}
