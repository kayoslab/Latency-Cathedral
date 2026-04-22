import { AmbientLight, DirectionalLight, PointLight, HemisphereLight } from 'three';

export interface Lights {
  ambient: AmbientLight;
  directional: DirectionalLight;
  rim: DirectionalLight;
  interior: PointLight;
  hemisphere: HemisphereLight;
}

export function createLights(): Lights {
  // Moderate ambient — not too bright so shadows read well
  const ambient = new AmbientLight(0xeeeeff, 0.35);

  // Strong directional from upper-left — creates clear shadows on facade
  const directional = new DirectionalLight(0xfff0d0, 1.6);
  directional.position.set(60, 100, 50);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 1;
  directional.shadow.camera.far = 350;
  directional.shadow.camera.left = -80;
  directional.shadow.camera.right = 80;
  directional.shadow.camera.top = 100;
  directional.shadow.camera.bottom = -10;
  directional.shadow.bias = -0.0015;

  // Cool fill from behind — gives depth to silhouette
  const rim = new DirectionalLight(0x8899bb, 0.3);
  rim.position.set(-40, 60, -80);

  // Interior warm glow visible through windows
  const interior = new PointLight(0xffaa44, 1.5, 80, 1.5);
  interior.position.set(0, 15, 0);

  // Sky/ground bounce for natural ambient variation
  const hemisphere = new HemisphereLight(0xccddee, 0x886644, 0.25);

  return { ambient, directional, rim, interior, hemisphere };
}
