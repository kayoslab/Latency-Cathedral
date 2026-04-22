import type { Scene, Group, Mesh, BufferGeometry, Material } from 'three';
import type { SceneParams } from '../domain/types';
import { buildCathedralGeometry } from './buildCathedralGeometry';
import { applyRuinModifiers } from './ruinModifiers';

export function rebuildCathedral(
  scene: Scene,
  currentGroup: Group | null,
  params: SceneParams,
): Group {
  if (currentGroup) {
    currentGroup.traverse((obj) => {
      const mesh = obj as Mesh<BufferGeometry, Material>;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      }
    });
    scene.remove(currentGroup);
  }

  const newGroup = buildCathedralGeometry(params);
  applyRuinModifiers(newGroup, params);
  scene.add(newGroup);
  return newGroup;
}
