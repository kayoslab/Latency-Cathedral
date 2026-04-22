import { WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace, PCFShadowMap } from 'three';
import { clampPixelRatio } from './clampPixelRatio';

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(clampPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Cinematic tone mapping
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = SRGBColorSpace;

  // Soft shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  return renderer;
}
