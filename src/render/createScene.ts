import { Scene, Color, Fog } from 'three';

export function createScene(): Scene {
  const scene = new Scene();
  // Soft warm gray — not blinding white, not dark
  scene.background = new Color(0xd5d0c8);
  scene.fog = new Fog(0xd5d0c8, 200, 600);
  return scene;
}
