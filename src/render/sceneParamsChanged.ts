import type { SceneParams } from '../domain/types';

export function sceneParamsChanged(a: SceneParams, b: SceneParams): boolean {
  return (
    a.height !== b.height ||
    a.symmetry !== b.symmetry ||
    a.fracture !== b.fracture ||
    a.fog !== b.fog ||
    a.lightIntensity !== b.lightIntensity ||
    a.ruinLevel !== b.ruinLevel
  );
}

export function geometryParamsChanged(a: SceneParams, b: SceneParams): boolean {
  return (
    a.height !== b.height ||
    a.symmetry !== b.symmetry ||
    a.fracture !== b.fracture ||
    a.ruinLevel !== b.ruinLevel
  );
}
