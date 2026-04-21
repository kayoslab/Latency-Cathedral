import { PerspectiveCamera } from 'three';

export function createCamera(width: number, height: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 5;
  return camera;
}
