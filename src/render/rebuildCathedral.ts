import type { Scene, Group, Mesh, BufferGeometry, Material } from 'three';
import type { SceneParams } from '../domain/types';
import { buildCathedralGeometry } from './buildCathedralGeometry';
import { applyRuinModifiers, resetRuinModifiers } from './ruinModifiers';

export interface CathedralHandle {
  group: Group;
  /** Cheaply update degradation without rebuilding geometry. */
  applyRuin: (params: SceneParams) => void;
}

/**
 * Build fresh cathedral geometry and add to scene.
 * Only call when height/symmetry actually change.
 */
export function rebuildCathedral(
  scene: Scene,
  current: CathedralHandle | null,
  params: SceneParams,
): CathedralHandle {
  if (current) {
    current.group.traverse((obj) => {
      const mesh = obj as Mesh<BufferGeometry, Material>;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      }
    });
    scene.remove(current.group);
  }

  const group = buildCathedralGeometry(params);
  scene.add(group);

  // Snapshot original state for cheap ruin reset/reapply
  storeOriginals(group);
  applyRuinModifiers(group, params);

  return {
    group,
    applyRuin(p: SceneParams) {
      resetRuinModifiers(group);
      applyRuinModifiers(group, p);
    },
  };
}

/** Store each mesh's original transform + material for later reset. */
function storeOriginals(group: Group): void {
  group.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.userData._orig = {
      px: mesh.position.x,
      py: mesh.position.y,
      pz: mesh.position.z,
      rx: mesh.rotation.x,
      ry: mesh.rotation.y,
      rz: mesh.rotation.z,
      sx: mesh.scale.x,
      sy: mesh.scale.y,
      sz: mesh.scale.z,
      visible: mesh.visible,
      material: mesh.material, // reference to original material
    };
  });
}
