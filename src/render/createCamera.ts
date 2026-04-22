import { PerspectiveCamera, Vector3 } from 'three';

export const CAMERA_TARGET = new Vector3(0, 10, 0);
const ORBIT_RADIUS = 220;
const CAMERA_HEIGHT = 55;

export function createCamera(width: number, height: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(32, width / height, 1, 700);
  camera.position.set(0, CAMERA_HEIGHT, ORBIT_RADIUS);
  camera.lookAt(CAMERA_TARGET);
  return camera;
}

export function updateCameraOrbit(
  camera: PerspectiveCamera,
  elapsedSec: number,
): void {
  const angle = elapsedSec * 0.015;
  camera.position.x = Math.sin(angle) * ORBIT_RADIUS;
  camera.position.z = Math.cos(angle) * ORBIT_RADIUS;
  camera.position.y = CAMERA_HEIGHT + Math.sin(elapsedSec * 0.03) * 3;
  camera.lookAt(CAMERA_TARGET);
}
