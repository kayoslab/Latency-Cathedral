import { Scene, Color } from 'three';

export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(0x0a0a0f);
  return scene;
}
