import { Scene, Color, Fog } from 'three';

export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(0x0a0a0f);
  scene.fog = new Fog(0x0a0a0f, 50, 100);
  return scene;
}
