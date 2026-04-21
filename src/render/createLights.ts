import { AmbientLight, DirectionalLight } from 'three';

export interface Lights {
  ambient: AmbientLight;
  directional: DirectionalLight;
}

export function createLights(): Lights {
  const ambient = new AmbientLight(0xffffff, 0.4);
  const directional = new DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7);
  return { ambient, directional };
}
