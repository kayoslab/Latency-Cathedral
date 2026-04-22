/**
 * Cathedral geometry builder.
 *
 * Consumes `height`, `symmetry`, `fracture`, and `ruinLevel` from SceneParams.
 * Deferred params (handled by other tickets):
 *  - fog → US-013 (atmosphere/lighting)
 *  - lightIntensity → US-013 (atmosphere/lighting)
 */
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
} from 'three';
import type { SceneParams } from '../domain/types';
import { applyRuinModifiers } from './ruinModifiers';

export function buildCathedralGeometry(params: SceneParams): Group {
  const { height, symmetry } = params;
  const group = new Group();

  // Base platform
  const baseWidth = 3;
  const baseHeight = 0.3 + height * 0.2;
  const baseDepth = 4;
  const baseGeo = new BoxGeometry(baseWidth, baseHeight, baseDepth);
  const baseMat = new MeshStandardMaterial({ color: 0x555566 });
  const baseMesh = new Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, baseHeight / 2, 0);
  group.add(baseMesh);

  // Nave (elongated body)
  const naveWidth = 1.6;
  const naveHeight = 1.5 + height * 2.5;
  const naveDepth = 3.2;
  const naveGeo = new BoxGeometry(naveWidth, naveHeight, naveDepth);
  const naveMat = new MeshStandardMaterial({ color: 0x7766aa });
  const naveMesh = new Mesh(naveGeo, naveMat);
  naveMesh.position.set(0, baseHeight + naveHeight / 2, 0);
  group.add(naveMesh);

  // Towers — two cylinders mirrored on X axis
  const towerRadius = 0.4;
  const towerHeight = 2.0 + height * 3.0;
  const towerXOffset = 1.0 + symmetry * 0.5;

  const towerGeo1 = new CylinderGeometry(towerRadius, towerRadius, towerHeight, 8);
  const towerMat1 = new MeshStandardMaterial({ color: 0x8877bb });
  const tower1 = new Mesh(towerGeo1, towerMat1);
  tower1.position.set(-towerXOffset, baseHeight + towerHeight / 2, -1.2);
  group.add(tower1);

  const towerGeo2 = new CylinderGeometry(towerRadius, towerRadius, towerHeight, 8);
  const towerMat2 = new MeshStandardMaterial({ color: 0x8877bb });
  const tower2 = new Mesh(towerGeo2, towerMat2);
  tower2.position.set(towerXOffset, baseHeight + towerHeight / 2, -1.2);
  group.add(tower2);

  applyRuinModifiers(group, params);

  return group;
}
