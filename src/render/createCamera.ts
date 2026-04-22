import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const CAMERA_TARGET = new Vector3(0, 10, 0);
const ORBIT_RADIUS = 220;
const CAMERA_HEIGHT = 55;
const AUTO_ROTATE_SPEED = 0.3;
const MIN_POLAR_ANGLE = 0.2;            // don't look from directly above
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.08; // don't go below ground

export function createCamera(width: number, height: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(32, width / height, 1, 700);
  camera.position.set(0, CAMERA_HEIGHT, ORBIT_RADIUS);
  camera.lookAt(CAMERA_TARGET);
  return camera;
}

export interface CameraControls {
  controls: OrbitControls;
  dispose: () => void;
}

export function createCameraControls(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
): CameraControls {
  const controls = new OrbitControls(camera, domElement);

  // Target
  controls.target.copy(CAMERA_TARGET);

  // Auto-rotation (slow default orbit)
  controls.autoRotate = true;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

  // Restrict vertical angle so camera never clips ground
  controls.minPolarAngle = MIN_POLAR_ANGLE;
  controls.maxPolarAngle = MAX_POLAR_ANGLE;

  // Restrict zoom range
  controls.minDistance = 80;
  controls.maxDistance = 400;

  // Smooth damping
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Disable panning (keep cathedral centered)
  controls.enablePan = false;

  controls.update();

  return {
    controls,
    dispose: () => controls.dispose(),
  };
}
