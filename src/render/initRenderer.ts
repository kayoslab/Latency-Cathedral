import type { Group, Mesh, BufferGeometry, Material } from 'three';
import type { SceneParams } from '../domain/types';
import { createRenderer } from './createRenderer';
import { createScene } from './createScene';
import { createCamera } from './createCamera';
import { createLights } from './createLights';
import { rebuildCathedral } from './rebuildCathedral';
import { sceneParamsChanged } from './sceneParamsChanged';

export interface RendererHandle {
  dispose: () => void;
  update: (params: SceneParams) => void;
}

export function initRenderer(canvas: HTMLCanvasElement): RendererHandle {
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera(window.innerWidth, window.innerHeight);
  const { ambient, directional } = createLights();

  scene.add(ambient);
  scene.add(directional);

  let cathedralGroup: Group | null = null;
  let lastParams: SceneParams | null = null;

  let reducedMotion = false;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = motionQuery.matches;
  const onMotionChange = (e: MediaQueryListEvent) => {
    reducedMotion = e.matches;
  };
  motionQuery.addEventListener('change', onMotionChange);

  let animationId = 0;
  let paused = false;

  function animate() {
    if (paused) return;
    animationId = requestAnimationFrame(animate);

    if (!reducedMotion && cathedralGroup) {
      cathedralGroup.rotation.y += 0.003;
    }

    renderer.render(scene, camera);
  }

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
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
      if (lastParams && !sceneParamsChanged(lastParams, params)) {
        return;
      }
      cathedralGroup = rebuildCathedral(scene, cathedralGroup, params);
      lastParams = { ...params };
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

      renderer.dispose();
    },
  };
}
